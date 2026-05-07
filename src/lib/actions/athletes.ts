'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId, getClubInfo } from '@/lib/actions/club-context'
import { sendInvitationEmail } from '@/lib/email'
import { syncAdminAthletesForClub } from '@/lib/admin-athlete-sync'

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

  // Backfill: aseguramos que los miembros admin_athlete tengan registro en
  // la tabla `athletes` para que aparezcan en la nómina de jugadores.
  // Es idempotente y barato: si todos ya tienen registro, no inserta nada.
  try {
    await syncAdminAthletesForClub(clubId)
  } catch (e) {
    console.error('[getAthletes] syncAdminAthletesForClub failed:', e)
  }

  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('athletes')
    .select('*, subscriptions(id, status, plan_id, plans(name)), payments(id, status, paid_at, payment_method), attendance(id, checked_in_at), documents(id, expiry_date)', { count: 'exact' })
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
  return { athletes: data ?? [], total: count ?? 0 }
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
  return data
}

export async function createAthlete(input: AthleteInput) {
  const clubId = await getClubId()
  const parsed = athleteSchema.parse(input)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('athletes')
    .insert({
      ...parsed,
      club_id: clubId,
      email: parsed.email || null,
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
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
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

  revalidatePath('/dashboard/athletes')
  revalidatePath(`/dashboard/athletes/${id}`)
  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/finances')
}

/** @deprecated Usa archiveAthlete: conserva pagos y reportes. */
export async function deleteAthlete(id: string) {
  return archiveAthlete(id)
}

export async function bulkUpdateAthleteStatus(ids: string[], status: 'active' | 'inactive' | 'suspended') {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('athletes')
    .update({ status })
    .in('id', ids)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/athletes')
  return { updated: ids.length }
}

/**
 * Envía un correo de invitación a cualquier email para que la persona
 * se inscriba en el club. El link apunta a /[slug]/signup.
 */
export async function sendClubInvitationEmail(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
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
