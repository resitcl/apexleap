'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId, getClubInfo, assertClubStaff } from '@/lib/actions/club-context'
import { sendInvitationEmail } from '@/lib/email'
import {
  syncAdminAthletesForClub,
  cleanupStaffOnlyAthletesForClub,
  archiveAthleteForUser,
} from '@/lib/admin-athlete-sync'
import { cancelPriorSubscriptions } from '@/lib/subscription-activation'
import { calculatePeriodStartForPayment, getBillingAnchorDay, ymdFromDate, type BillingCycle } from '@/lib/billing-utils'

const athleteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  document_number: z.string().optional(),
  birth_date: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  notes: z.string().optional(),
  health_status: z.enum(['healthy', 'injured', 'observation']).default('healthy'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  technical_meta: z.record(z.unknown()).default({}),
  performance_meta: z.record(z.unknown()).default({}),
  jersey_number: z.number().int().min(1).max(999).nullable().optional(),
  category: z.string().min(1).default('General'),
  category_id: z.string().uuid().optional().nullable(),
})

function translateAthleteError(msg: string): string {
  if (msg.includes('idx_athletes_jersey_per_category') || msg.includes('unique') && msg.includes('jersey'))
    return 'Ese número de camiseta ya está en uso en esta categoría.'
  return msg
}

/** Evita filas duplicadas en UI si ya existían dos fichas (mismo email o mismo user_id). */
function dedupeAthletesForDisplay<
  T extends { id: string; user_id: string | null; email: string | null },
>(rows: T[]): T[] {
  const seenUid = new Set<string>()
  const seenEmail = new Set<string>()
  const ordered = [...rows].sort((a, b) => {
    if (a.user_id && !b.user_id) return -1
    if (!a.user_id && b.user_id) return 1
    return 0
  })
  const out: T[] = []
  for (const r of ordered) {
    if (r.user_id) {
      if (seenUid.has(r.user_id)) continue
      seenUid.add(r.user_id)
      out.push(r)
      const e = r.email?.trim().toLowerCase()
      if (e) seenEmail.add(e)
      continue
    }
    const e = r.email?.trim().toLowerCase()
    if (e && seenEmail.has(e)) continue
    if (e) seenEmail.add(e)
    out.push(r)
  }
  return out
}

export type AthleteInput = z.infer<typeof athleteSchema>


export async function getAthletes(params?: {
  search?: string
  status?: string
  healthStatus?: string
  planId?: string
  subscriptionStatus?: string
  categoryId?: string
  page?: number
  limit?: number
  sort?: string
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Backfill idempotente:
  //  1) asegurar fichas `athletes` para miembros `admin_athlete` (aparezcan en nómina);
  //  2) archivar fichas viejas de miembros que ahora son sólo `admin`/`coach`
  //     (no deben aparecer en nómina, asistencia ni estadísticas).
  try {
    await Promise.all([
      syncAdminAthletesForClub(clubId),
      cleanupStaffOnlyAthletesForClub(clubId),
    ])
  } catch (e) {
    console.error('[getAthletes] backfill failed:', e)
  }

  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('athletes')
    .select('*, subscriptions(id, status, plan_id, current_period_end, next_billing_date, plans(name)), payments(id, status, paid_at, payment_method, amount, due_date), attendance(id, checked_in_at), documents(id, expiry_date)', { count: 'exact' })
    .eq('club_id', clubId)
    .is('archived_at', null)
    .order(
      params?.sort === 'created_at'      ? 'created_at' :
      params?.sort === 'status'          ? 'status' :
      params?.sort === 'last_attendance' ? 'name' :
      'name',
      { ascending: params?.sort !== 'created_at' }
    )
    .range(from, to)

  if (params?.search) {
    query = query.or(
      `name.ilike.%${params.search}%,email.ilike.%${params.search}%,document_number.ilike.%${params.search}%,phone.ilike.%${params.search}%`
    )
  }
  if (params?.status) {
    query = query.eq('status', params.status)
  }
  if (params?.healthStatus) {
    query = query.eq('health_status', params.healthStatus)
  }
  if (params?.categoryId) {
    query = query.eq('category_id', params.categoryId)
  }
  if (params?.planId || params?.subscriptionStatus) {
    let subQ = supabase.from('subscriptions').select('athlete_id').eq('club_id', clubId)
    if (params.planId)            subQ = subQ.eq('plan_id', params.planId)
    if (params.subscriptionStatus) subQ = subQ.eq('status', params.subscriptionStatus)
    const { data: subData } = await subQ
    const ids = (subData ?? []).map((s) => s.athlete_id).filter(Boolean)
    if (ids.length === 0) return { athletes: [], total: 0 }
    query = query.in('id', ids)
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)
  return { athletes: dedupeAthletesForDisplay(data ?? []), total: count ?? 0 }
}

export async function getAthleteById(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('athletes')
    .select(`
      *,
      subscriptions(*, plans(*)),
      payments(id, concept, amount, status, due_date, paid_at),
      attendance(id, checked_in_at, is_valid),
      injuries(id, diagnosis, severity, start_date, estimated_recovery, actual_recovery),
      documents(id, name, category, status, expiry_date)
    `)
    .eq('id', id)
    .eq('club_id', clubId)
    .single()

  if (error) throw new Error(error.message)

  // Determinar el rol actual del usuario en el club (si la ficha está vinculada).
  // Útil para mostrar al admin si el "jugador" pasó a staff (admin/coach).
  let clubRole: 'admin' | 'admin_athlete' | 'coach' | 'athlete' | null = null
  const linkedUserId = (data as { user_id?: string | null }).user_id ?? null

  if (linkedUserId) {
    const { data: membership } = await supabase
      .from('user_clubs')
      .select('role')
      .eq('user_id', linkedUserId)
      .eq('club_id', clubId)
      .eq('is_active', true)
      .maybeSingle()

    if (membership?.role) {
      clubRole = membership.role as typeof clubRole
    }

    // Si pasó a un rol staff sin jugador, archivamos la ficha al vuelo
    // para que deje de aparecer en la nómina/asistencia. El banner del page
    // se encarga de comunicar la situación.
    const archivedAt = (data as { archived_at?: string | null }).archived_at ?? null
    if (!archivedAt && (clubRole === 'admin' || clubRole === 'coach')) {
      await archiveAthleteForUser({ clubId, userId: linkedUserId }).catch((e) => {
        console.error('[getAthleteById] archiveAthleteForUser failed:', e)
      })
      ;(data as { archived_at?: string | null }).archived_at = new Date().toISOString()
      ;(data as { status?: string }).status = 'inactive'
    }
  }

  return { ...data, clubRole }
}

export async function createAthlete(input: AthleteInput) {
  await assertClubStaff()
  const clubId = await getClubId()
  const parsed = athleteSchema.parse(input)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('athletes')
    .insert({
      ...parsed,
      club_id: clubId,
      email: parsed.email?.trim().toLowerCase() || null,
      // Fecha vacía → NULL (columna DATE): insertar '' lanza un error crudo de Postgres.
      birth_date: parsed.birth_date?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(translateAthleteError(error.message))

  // Enviar email de bienvenida si el alumno tiene email registrado
  if (parsed.email) {
    const clubInfo = await getClubInfo()
    // No bloqueamos si el email falla — solo lo registramos
    sendInvitationEmail({
      to: parsed.email,
      athleteName: parsed.name,
      clubName: clubInfo.name,
      clubSlug: clubInfo.slug,
      logoUrl: clubInfo.logo_url,
      brandColor: clubInfo.primary_color,
      replyTo: clubInfo.email,
    }).catch((err) =>
      console.error('[athletes] Error inesperado al enviar invitación:', err)
    )
  }

  revalidatePath('/dashboard/athletes')
  return data
}

export async function updateAthlete(id: string, input: Partial<AthleteInput>) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  // Fecha de nacimiento vacía → NULL (columna DATE), no '' (error de Postgres).
  if (safeUpdate.birth_date === '') safeUpdate.birth_date = null
  const { data, error } = await supabase
    .from('athletes')
    .update(safeUpdate)
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(translateAthleteError(error.message))

  revalidatePath('/dashboard/athletes')
  revalidatePath(`/dashboard/athletes/${id}`)
  return data
}

/** Quita al alumno del club sin borrar pagos ni historial contable (marca archived_at). */
export async function archiveAthlete(id: string) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('athletes')
    .update({
      archived_at: new Date().toISOString(),
      status: 'inactive',
    })
    .eq('id', id)
    .eq('club_id', clubId)
    .is('archived_at', null)

  if (error) throw new Error(error.message)

  // Cancelar la suscripción para que el cron de facturación no siga emitiendo cuotas ni
  // acumulando mora sobre un alumno que ya salió del club.
  await cancelPriorSubscriptions(supabase, clubId, id)

  revalidatePath('/dashboard/athletes')
  revalidatePath(`/dashboard/athletes/${id}`)
  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/finances')
}

/** @deprecated Usa archiveAthlete: conserva pagos y reportes. */
export async function deleteAthlete(id: string) {
  await assertClubStaff()
  return archiveAthlete(id)
}

export async function bulkUpdateAthleteStatus(ids: string[], status: 'active' | 'inactive' | 'suspended') {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('athletes')
    .update({ status })
    .in('id', ids)
    .eq('club_id', clubId)
    .is('archived_at', null)
    .select('id')

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/athletes')
  return { updated: data?.length ?? 0 }
}

/**
 * Envía un correo de invitación a cualquier email para que la persona
 * se inscriba en el club. El link apunta a /[slug]/signup.
 */
export async function sendClubInvitationEmail(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertClubStaff()
    const z_email = email.toLowerCase().trim()
    if (!z_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(z_email)) {
      return { ok: false, error: 'Email inválido.' }
    }

    const clubInfo = await getClubInfo()
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://apexleap.vercel.app'
    const signupUrl = `${APP_URL}/${clubInfo.slug}/signup`

    if (!process.env.RESEND_API_KEY) {
      return { ok: false, error: 'RESEND_API_KEY no configurada en el servidor.' }
    }

    const { Resend } = await import('resend')
    const { normalizeClubPrimary, primaryForegroundForHex } = await import('@/lib/club-branding')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const brandBg = normalizeClubPrimary(clubInfo.primary_color)
    const brandFg = primaryForegroundForHex(brandBg)
    const logoHtml = clubInfo.logo_url
      ? `<img src="${clubInfo.logo_url}" alt="${clubInfo.name}" style="max-height:48px;max-width:160px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />`
      : ''

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Te invitamos a ${clubInfo.name}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:${brandBg};padding:28px 40px;text-align:center;">
          ${logoHtml}
          <p style="margin:0;color:${brandFg};font-size:20px;font-weight:700;">🥋 ${clubInfo.name}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:40px;">
          <h1 style="margin:0 0 16px;font-size:24px;color:#18181b;">¡Estás invitado/a!</h1>
          <p style="margin:0 0 16px;font-size:16px;color:#52525b;line-height:1.6;">
            Te han invitado a unirte a <strong>${clubInfo.name}</strong>. Haz clic en el botón
            para completar tu inscripción y empezar a entrenar.
          </p>
          <p style="margin:0 0 32px;font-size:16px;color:#52525b;line-height:1.6;">
            El proceso toma menos de 2 minutos. Solo necesitas crear una cuenta gratuita.
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:${brandBg};border-radius:8px;text-align:center;">
                <a href="${signupUrl}" style="display:inline-block;padding:14px 32px;color:${brandFg};font-size:16px;font-weight:700;text-decoration:none;">
                  Inscribirme ahora →
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:32px 0 0;font-size:13px;color:#a1a1aa;">
            Si el botón no funciona, copia este link:<br/>
            <a href="${signupUrl}" style="color:${brandBg};">${signupUrl}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="background:#f4f4f5;padding:20px 40px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
            Enviado por <strong>${clubInfo.name}</strong> · ApexLeap
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`

    const replyTo = clubInfo.email?.trim() || process.env.RESEND_REPLY_TO?.trim() || undefined

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'ApexLeap <onboarding@resend.dev>',
      to: z_email,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: `Te invitan a unirte a ${clubInfo.name} 🥋`,
      html,
    })

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' }
  }
}

/**
 * Envía (o reenvía) el correo de invitación/bienvenida a un alumno existente.
 * Útil cuando el alumno aún no ha creado su cuenta o quiere recibir el link de nuevo.
 */
export async function sendAthleteInvitation(
  athleteId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertClubStaff()
    const clubId = await getClubId()
    const supabase = createAdminClient()

    // Obtener datos del alumno
    const { data: athlete, error: athleteErr } = await supabase
      .from('athletes')
      .select('id, name, email')
      .eq('id', athleteId)
      .eq('club_id', clubId)
      .single()

    if (athleteErr || !athlete) return { ok: false, error: 'Alumno no encontrado.' }
    if (!athlete.email) return { ok: false, error: 'El alumno no tiene email registrado.' }

    const clubInfo = await getClubInfo()

    const result = await sendInvitationEmail({
      to: athlete.email,
      athleteName: athlete.name,
      clubName: clubInfo.name,
      clubSlug: clubInfo.slug,
      logoUrl: clubInfo.logo_url,
      brandColor: clubInfo.primary_color,
      replyTo: clubInfo.email,
    })

    if (!result.success) return { ok: false, error: result.error ?? 'No se pudo enviar el correo.' }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado.' }
  }
}

export type AthleteBillingInfo = {
  hasActiveSub: boolean
  anchorDay: number | null
  nextBilling: string | null
  cycle: string | null
}

/** Info del día de cobro (billing anchor) de la suscripción activa del alumno, para la ficha. */
export async function getAthleteBillingInfo(athleteId: string): Promise<AthleteBillingInfo> {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('billing_anchor_day, next_billing_date, plans(billing_cycle)')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .maybeSingle()

  if (!sub) return { hasActiveSub: false, anchorDay: null, nextBilling: null, cycle: null }
  const plansData = sub.plans as unknown
  const plan = Array.isArray(plansData) ? plansData[0] : (plansData as { billing_cycle: string } | null)
  return {
    hasActiveSub: true,
    anchorDay: (sub.billing_anchor_day as number | null) ?? null,
    nextBilling: (sub.next_billing_date as string | null) ?? null,
    cycle: plan?.billing_cycle ?? null,
  }
}

/**
 * Fija el día de cobro (billing anchor) de la suscripción activa del alumno y realinea el ciclo:
 * el período actual (que contiene hoy, según el nuevo día) se considera cubierto y el próximo
 * cobro queda al final de ese período. No genera deuda retroactiva ni toca cuotas vencidas
 * existentes; solo reordena la facturación futura (y con ella los recordatorios).
 */
export async function setAthleteBillingDay(athleteId: string, day: number): Promise<AthleteBillingInfo> {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const anchorDay = Math.max(1, Math.min(28, Math.round(day)))

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plans(billing_cycle)')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .maybeSingle()
  if (!sub) throw new Error('El alumno no tiene una suscripción activa a la cual fijarle el día de cobro.')

  const plansData = sub.plans as unknown
  const plan = Array.isArray(plansData) ? plansData[0] : (plansData as { billing_cycle: string } | null)
  const cycle = (plan?.billing_cycle ?? 'monthly') as BillingCycle

  const now = new Date()
  const { periodStart, periodEnd } = calculatePeriodStartForPayment(anchorDay, now, cycle, null)
  const periodStartStr = ymdFromDate(periodStart)
  const periodEndStr = periodEnd ? ymdFromDate(periodEnd) : null

  const { error } = await supabase
    .from('subscriptions')
    .update({
      billing_anchor_day: anchorDay,
      current_period_start: periodStartStr,
      current_period_end: periodEndStr,
      // El próximo cobro queda al final del período actual → el ciclo se alinea al día elegido y
      // el alumno queda al día en el período en curso (sin inventar deuda).
      next_billing_date: periodEndStr,
    })
    .eq('id', sub.id)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/athletes/${athleteId}`)
  revalidatePath('/dashboard/athletes')
  return { hasActiveSub: true, anchorDay, nextBilling: periodEndStr, cycle }
}

/**
 * Suspende temporalmente a un alumno (p. ej. lesión, pausa de entrenamiento): pasa a estado
 * 'suspended' y PAUSA su facturación (la suscripción activa pasa a 'paused', que el cron ignora).
 * No borra deuda existente; solo deja de generar cuotas nuevas mientras esté suspendido.
 */
export async function suspendAthlete(id: string): Promise<void> {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  await supabase
    .from('subscriptions')
    .update({ status: 'paused' })
    .eq('club_id', clubId)
    .eq('athlete_id', id)
    .eq('status', 'active')

  const { error } = await supabase
    .from('athletes')
    .update({ status: 'suspended' })
    .eq('id', id)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/athletes/${id}`)
  revalidatePath('/dashboard/athletes')
}

/**
 * Reactiva a un alumno suspendido: vuelve a 'active' y reanuda su suscripción pausada,
 * realineando el ciclo desde el período actual (sin cobrar el tiempo que estuvo suspendido).
 */
export async function reactivateAthlete(id: string): Promise<void> {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: paused } = await supabase
    .from('subscriptions')
    .select('id, billing_anchor_day, plans(billing_cycle)')
    .eq('club_id', clubId)
    .eq('athlete_id', id)
    .eq('status', 'paused')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (paused) {
    const plansData = paused.plans as unknown
    const plan = Array.isArray(plansData) ? plansData[0] : (plansData as { billing_cycle: string } | null)
    const cycle = (plan?.billing_cycle ?? 'monthly') as BillingCycle
    const now = new Date()
    const anchorDay = (paused.billing_anchor_day as number | null) ?? getBillingAnchorDay(now)
    const { periodStart, periodEnd } = calculatePeriodStartForPayment(anchorDay, now, cycle, null)
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        billing_anchor_day: anchorDay,
        current_period_start: ymdFromDate(periodStart),
        current_period_end: periodEnd ? ymdFromDate(periodEnd) : null,
        next_billing_date: periodEnd ? ymdFromDate(periodEnd) : null,
      })
      .eq('id', paused.id)
      .eq('club_id', clubId)
  }

  const { error } = await supabase
    .from('athletes')
    .update({ status: 'active' })
    .eq('id', id)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/athletes/${id}`)
  revalidatePath('/dashboard/athletes')
}
