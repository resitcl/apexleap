import { createAdminClient } from '@/lib/supabase/admin'
import {
  subscriptionPeriodFieldsForPlan,
  type BillingCycle,
} from '@/lib/billing-utils'
import { ONLINE_GATEWAY_IDS } from '@/lib/payment-methods'
import { sendPaymentConfirmationEmail, sendPaymentFailedEmail } from '@/lib/email'
import { resolveAutoEmail } from '@/lib/auto-templates'

/** Formatea un monto CLP para usar en variables de plantilla ({{monto}}). */
function formatClp(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount)
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>

export type PaymentForActivation = {
  athlete_id: string
  plan_id: string | null
  period_start?: string | null
  period_end?: string | null
}

/** Cancela suscripciones activas o en espera de pago del atleta (opcionalmente excluyendo una). */
export async function cancelPriorSubscriptions(
  supabase: SupabaseAdmin,
  clubId: string,
  athleteId: string,
  excludeId?: string,
) {
  let query = supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .in('status', ['active', 'pending_payment'])

  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  await query
}

/**
 * Activa/renueva la suscripción al confirmar un pago.
 * Usado por acciones admin, reconciliadores Flow/MP y cron.
 */
export async function activateSubscriptionForPaidPayment(
  supabase: SupabaseAdmin,
  clubId: string,
  payment: PaymentForActivation,
  paidAtDate: Date,
  paymentMethod: string,
) {
  if (!payment.plan_id || !payment.athlete_id) return

  const { data: plan } = await supabase
    .from('plans')
    .select('billing_cycle, name, price')
    .eq('id', payment.plan_id)
    .single()
  if (!plan) return

  const cycle = plan.billing_cycle as BillingCycle
  const { startStr, endStr, nextBillingStr, billingAnchorDay } = subscriptionPeriodFieldsForPlan(cycle, {
    periodStart: payment.period_start,
    periodEnd: payment.period_end,
    paidAt: paidAtDate,
  })

  const noAutoRenew = new Set<string>(['transfer', 'cash', 'manual', ...ONLINE_GATEWAY_IDS])
  const autoRenew = paymentMethod ? !noAutoRenew.has(paymentMethod) : false

  await cancelPriorSubscriptions(supabase, clubId, payment.athlete_id)

  const { error: insertErr } = await supabase.from('subscriptions').insert({
    club_id: clubId,
    athlete_id: payment.athlete_id,
    plan_id: payment.plan_id,
    status: 'active',
    start_date: startStr,
    end_date: endStr,
    payment_method: paymentMethod,
    auto_renew: autoRenew,
    billing_anchor_day: billingAnchorDay,
    current_period_start: startStr,
    current_period_end: endStr,
    next_billing_date: nextBillingStr,
  })

  // Un pago confirmado NUNCA debe quedar sin suscripción activa. Si el INSERT falla (p.ej.
  // 23505 del índice one-active-per-athlete por una confirmación concurrente), verificar que
  // realmente exista una suscripción activa; si no, registrar para revisión (no lanzar: el
  // pago ya está pagado y no queremos romper el flujo del webhook).
  if (insertErr) {
    const { data: activeNow } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('club_id', clubId)
      .eq('athlete_id', payment.athlete_id)
      .eq('status', 'active')
      .maybeSingle()
    if (!activeNow) {
      console.error(
        '[activateSubscriptionForPaidPayment] pago confirmado sin suscripción activa resultante:',
        insertErr.message,
        { clubId, athleteId: payment.athlete_id, planId: payment.plan_id },
      )
    }
  }

  await supabase
    .from('athletes')
    .update({ status: 'active' })
    .eq('id', payment.athlete_id)
    .eq('club_id', clubId)

  // Correo de confirmación (best-effort: nunca bloquea el flujo de pago).
  await notifyPaymentConfirmed(supabase, clubId, payment, plan as { name?: string; price?: number }, nextBillingStr)
}

/**
 * Envía el correo de confirmación de pago. Best-effort: cualquier fallo se loguea pero no
 * interrumpe la confirmación (el pago ya está registrado). Se dispara desde el embudo único
 * activateSubscriptionForPaidPayment, así cubre pasarelas y confirmaciones manuales del admin.
 */
async function notifyPaymentConfirmed(
  supabase: SupabaseAdmin,
  clubId: string,
  payment: PaymentForActivation,
  plan: { name?: string; price?: number },
  nextBillingStr: string | null,
) {
  try {
    const { data: athlete } = await supabase
      .from('athletes')
      .select('name, email')
      .eq('id', payment.athlete_id)
      .eq('club_id', clubId)
      .maybeSingle()
    const to = athlete?.email?.trim()
    if (!to) return // sin email registrado: no se envía

    const { data: club } = await supabase
      .from('clubs')
      .select('name, slug, logo_url, primary_color, settings')
      .eq('id', clubId)
      .single()

    const settings = (club?.settings ?? {}) as Record<string, unknown>
    const clubEmail =
      (settings.payment_settings as { bank_info?: { email?: string } } | undefined)?.bank_info?.email ?? null

    const clubName = club?.name ?? 'tu academia'
    const tpl = resolveAutoEmail(settings, 'payment_confirmation', {
      nombre: athlete?.name ?? 'Atleta',
      club: clubName,
      plan: plan?.name ?? '',
      monto: formatClp(Number(plan?.price ?? 0)),
    })
    if (!tpl) return // el club desactivó este correo automático

    await sendPaymentConfirmationEmail({
      to,
      athleteName: athlete?.name ?? 'Atleta',
      clubName,
      clubSlug: club?.slug ?? '',
      amount: Number(plan?.price ?? 0),
      planName: plan?.name ?? undefined,
      periodStart: payment.period_start ?? undefined,
      periodEnd: payment.period_end ?? undefined,
      nextBilling: nextBillingStr ?? undefined,
      logoUrl: club?.logo_url ?? null,
      brandColor: club?.primary_color ?? null,
      replyTo: clubEmail,
      subjectOverride: tpl.subject,
      introOverride: tpl.intro,
      buttonOverride: tpl.button ?? undefined,
    })
  } catch (err) {
    console.error('[notifyPaymentConfirmed] error (no bloqueante):', err instanceof Error ? err.message : err)
  }
}

/**
 * Avisa al alumno que su pago fue rechazado/no completado por la pasarela. Best-effort:
 * cualquier fallo se loguea pero no interrumpe el flujo. Se llama SOLO cuando un pago transiciona
 * a `failed` desde un reconcile real de pasarela (no desde intentos abandonados por el cron).
 */
export async function notifyPaymentFailed(
  supabase: SupabaseAdmin,
  clubId: string,
  payment: { athlete_id: string; plan_id?: string | null; amount?: number | null },
) {
  try {
    if (!payment.athlete_id) return
    const { data: athlete } = await supabase
      .from('athletes')
      .select('name, email')
      .eq('id', payment.athlete_id)
      .eq('club_id', clubId)
      .maybeSingle()
    const to = athlete?.email?.trim()
    if (!to) return

    const { data: club } = await supabase
      .from('clubs')
      .select('name, slug, logo_url, primary_color, settings')
      .eq('id', clubId)
      .single()

    let planName: string | undefined
    if (payment.plan_id) {
      const { data: plan } = await supabase.from('plans').select('name').eq('id', payment.plan_id).maybeSingle()
      planName = plan?.name ?? undefined
    }

    const settings = (club?.settings ?? {}) as Record<string, unknown>
    const clubEmail =
      (settings.payment_settings as { bank_info?: { email?: string } } | undefined)?.bank_info?.email ?? null
    const clubName = club?.name ?? 'tu academia'
    const amount = Number(payment.amount ?? 0)

    const tpl = resolveAutoEmail(settings, 'payment_failed', {
      nombre: athlete?.name ?? 'Atleta',
      club: clubName,
      plan: planName ?? '',
      monto: formatClp(amount),
    })
    if (!tpl) return

    await sendPaymentFailedEmail({
      to,
      athleteName: athlete?.name ?? 'Atleta',
      clubName,
      clubSlug: club?.slug ?? '',
      amount,
      planName,
      logoUrl: club?.logo_url ?? null,
      brandColor: club?.primary_color ?? null,
      replyTo: clubEmail,
      subjectOverride: tpl.subject,
      introOverride: tpl.intro,
      buttonOverride: tpl.button ?? undefined,
    })
  } catch (err) {
    console.error('[notifyPaymentFailed] error (no bloqueante):', err instanceof Error ? err.message : err)
  }
}

export type MarkPaidResult =
  | { won: true; payment: PaymentForActivation & { id: string } }
  | { won: false; alreadyPaid: true }
  | { won: false; alreadyPaid: false }

/**
 * Marca un pago como pagado de forma idempotente.
 * Solo el proceso que gana la carrera (filas afectadas > 0) debe activar la suscripción.
 */
export async function markPaymentPaidIdempotent(
  supabase: SupabaseAdmin,
  paymentId: string,
  clubId: string,
  update: {
    paid_at: string
    payment_method: string
    transaction_id?: string | null
    notes?: string | null
  },
): Promise<MarkPaidResult> {
  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: update.paid_at,
      payment_method: update.payment_method,
      ...(update.transaction_id !== undefined ? { transaction_id: update.transaction_id } : {}),
      ...(update.notes !== undefined ? { notes: update.notes } : {}),
    })
    .eq('id', paymentId)
    .eq('club_id', clubId)
    .neq('status', 'paid')
    .select('id, athlete_id, plan_id, period_start, period_end')
    .maybeSingle()

  if (error) throw new Error(error.message)

  if (data) {
    return { won: true, payment: data }
  }

  const { data: existing } = await supabase
    .from('payments')
    .select('status')
    .eq('id', paymentId)
    .eq('club_id', clubId)
    .maybeSingle()

  return {
    won: false,
    alreadyPaid: existing?.status === 'paid',
  }
}

/** Persiste una discrepancia de monto en las notas del pago para revisión manual. */
export async function persistAmountMismatch(
  supabase: SupabaseAdmin,
  paymentId: string,
  clubId: string,
  expected: number,
  charged: number,
  gateway: string,
) {
  await supabase
    .from('payments')
    .update({
      notes: `[${gateway}] DISCREPANCIA DE MONTO: esperado ${Math.round(expected)} CLP, cobrado ${Math.round(charged)} CLP. Revisar manualmente.`,
    })
    .eq('id', paymentId)
    .eq('club_id', clubId)
}
