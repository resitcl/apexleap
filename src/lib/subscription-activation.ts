import { createAdminClient } from '@/lib/supabase/admin'
import {
  subscriptionPeriodFieldsForPlan,
  type BillingCycle,
} from '@/lib/billing-utils'
import { ONLINE_GATEWAY_IDS } from '@/lib/payment-methods'

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
    .select('billing_cycle')
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

  await supabase.from('subscriptions').insert({
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

  await supabase
    .from('athletes')
    .update({ status: 'active' })
    .eq('id', payment.athlete_id)
    .eq('club_id', clubId)
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
