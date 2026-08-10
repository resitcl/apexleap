/**
 * Avisos por correo a los administradores del club.
 *
 * Hoy cubre un solo caso: un alumno registró un pago (desde su portal o acreditado por
 * pasarela). Es best-effort — cualquier fallo se loguea pero nunca interrumpe el flujo de
 * pago, que ya quedó persistido en la base.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendAdminPaymentAlertEmail } from '@/lib/email'
import { resolveAutoEmail } from '@/lib/auto-templates'
import { paymentMethodLabel } from '@/lib/payment-methods'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

const ADMIN_ROLES = ['admin', 'admin_athlete']

function formatClp(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount)
}

/**
 * Emails de los administradores activos del club.
 * Prioriza la tabla `users` (sincronizada por el webhook de Clerk) y cae a Clerk para
 * miembros antiguos sin fila. Si no hay ninguno, usa el email de contacto del club.
 */
export async function getClubAdminEmails(supabase: SupabaseAdmin, clubId: string): Promise<string[]> {
  const emails = new Set<string>()

  const { data: members } = await supabase
    .from('user_clubs')
    .select('user_id, role')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .in('role', ADMIN_ROLES)

  const userIds = (members ?? []).map((m) => m.user_id as string).filter(Boolean)

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('clerk_id, email')
      .in('clerk_id', userIds)

    const found = new Set<string>()
    for (const u of users ?? []) {
      const email = (u.email as string | null)?.trim()
      if (email) {
        emails.add(email.toLowerCase())
        found.add(u.clerk_id as string)
      }
    }

    const missing = userIds.filter((id) => !found.has(id))
    if (missing.length > 0) {
      try {
        const { clerkClient } = await import('@clerk/nextjs/server')
        const clerk = await clerkClient()
        const list = await clerk.users.getUserList({ userId: missing, limit: missing.length })
        for (const u of list.data) {
          const email = u.emailAddresses?.[0]?.emailAddress?.trim()
          if (email) emails.add(email.toLowerCase())
        }
      } catch {
        // Clerk no disponible (p. ej. cron/webhook sin sesión): seguimos con lo que haya.
      }
    }
  }

  if (emails.size === 0) {
    const { data: club } = await supabase
      .from('clubs')
      .select('email, settings')
      .eq('id', clubId)
      .maybeSingle()
    const settings = (club?.settings ?? {}) as Record<string, unknown>
    const bankEmail = (settings.payment_settings as { bank_info?: { email?: string } } | undefined)?.bank_info?.email
    for (const candidate of [club?.email as string | null | undefined, bankEmail]) {
      const email = candidate?.trim()
      if (email) emails.add(email.toLowerCase())
    }
  }

  return [...emails]
}

export interface AdminPaymentAlertInput {
  clubId: string
  athleteId: string
  amount: number
  paymentMethod: string | null
  concept?: string | null
  planName?: string | null
  /** `pending`: el admin debe validarlo. `paid`: la pasarela ya lo acreditó. */
  state: 'pending' | 'paid'
  hasReceipt?: boolean
}

/**
 * Avisa a los administradores que un alumno registró un pago.
 * Nunca lanza: el pago ya está guardado y el correo es un extra.
 */
export async function notifyAdminsPaymentSubmitted(
  supabase: SupabaseAdmin,
  input: AdminPaymentAlertInput,
): Promise<void> {
  try {
    const { data: club } = await supabase
      .from('clubs')
      .select('name, slug, logo_url, primary_color, settings')
      .eq('id', input.clubId)
      .single()

    const settings = (club?.settings ?? {}) as Record<string, unknown>
    const clubName = club?.name ?? 'tu academia'

    const { data: athlete } = await supabase
      .from('athletes')
      .select('name, email')
      .eq('id', input.athleteId)
      .eq('club_id', input.clubId)
      .maybeSingle()

    const athleteName = athlete?.name ?? 'Un alumno'
    const methodLabel = paymentMethodLabel(input.paymentMethod)
    const statusLabel = input.state === 'paid' ? 'Confirmado automáticamente' : 'Pendiente de validación'

    const tpl = resolveAutoEmail(settings, 'admin_payment_alert', {
      nombre: athleteName,
      club: clubName,
      plan: input.planName ?? '',
      monto: formatClp(Number(input.amount ?? 0)),
      metodo: methodLabel,
      estado: statusLabel,
    })
    if (!tpl) return // el club desactivó este aviso

    const to = await getClubAdminEmails(supabase, input.clubId)
    if (to.length === 0) return

    await sendAdminPaymentAlertEmail({
      to,
      athleteName,
      clubName,
      clubSlug: club?.slug ?? '',
      amount: Number(input.amount ?? 0),
      planName: input.planName ?? undefined,
      concept: input.concept ?? undefined,
      methodLabel,
      statusLabel,
      hasReceipt: input.hasReceipt,
      logoUrl: club?.logo_url ?? null,
      brandColor: club?.primary_color ?? null,
      // Responder al correo lleva al alumno, que es a quien el admin querría escribir.
      replyTo: athlete?.email ?? null,
      subjectOverride: tpl.subject,
      introOverride: tpl.intro,
      buttonOverride: tpl.button ?? undefined,
      showDetails: tpl.showDetails,
    })
  } catch (err) {
    console.error('[notifyAdminsPaymentSubmitted] error (no bloqueante):', err instanceof Error ? err.message : err)
  }
}
