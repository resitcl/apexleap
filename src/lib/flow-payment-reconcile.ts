import { createAdminClient } from '@/lib/supabase/admin'
import {
  calculatePeriodEnd,
  calculateNextPeriodStart,
  getBillingAnchorDay,
  type BillingCycle,
} from '@/lib/billing-utils'
import { ONLINE_GATEWAY_IDS } from '@/lib/payment-methods'
import { getFlowPaymentStatus, flowStatusIsPaid, resolveFlowConfigFromSettings } from '@/lib/flow'

function parsePaymentIdFromCommerceOrder(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/pay_([0-9a-fA-F-]{36})/)
  return m?.[1] ?? null
}

async function activateSubscriptionForPaidPayment(
  supabase: ReturnType<typeof createAdminClient>,
  clubId: string,
  payment: { athlete_id: string; plan_id: string | null },
  paidAtDate: Date,
) {
  if (!payment.plan_id || !payment.athlete_id) return

  const { data: plan } = await supabase
    .from('plans')
    .select('billing_cycle')
    .eq('id', payment.plan_id)
    .single()
  if (!plan) return

  const cycle = plan.billing_cycle as BillingCycle
  const startStr = paidAtDate.toISOString().split('T')[0]
  const periodEnd = calculatePeriodEnd(paidAtDate, cycle)
  const endStr = periodEnd ? periodEnd.toISOString().split('T')[0] : null
  const anchorDay = getBillingAnchorDay(paidAtDate)
  const nextStart = calculateNextPeriodStart(paidAtDate, cycle)
  const nextBillingStr = nextStart ? nextStart.toISOString().split('T')[0] : null

  const noAutoRenew = new Set<string>(['transfer', 'cash', 'manual', ...ONLINE_GATEWAY_IDS])
  const autoRenew = !noAutoRenew.has('flow')

  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('club_id', clubId)
    .eq('athlete_id', payment.athlete_id)
    .in('status', ['pending_payment', 'active'])

  await supabase.from('subscriptions').insert({
    club_id: clubId,
    athlete_id: payment.athlete_id,
    plan_id: payment.plan_id,
    status: 'active',
    start_date: startStr,
    end_date: endStr,
    payment_method: 'flow',
    auto_renew: autoRenew,
    billing_anchor_day: anchorDay,
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

async function markPaymentAsPaid(
  supabase: ReturnType<typeof createAdminClient>,
  payment: { id: string; club_id: string; athlete_id: string; plan_id: string | null },
  token: string,
  source: string,
) {
  const paidAt = new Date().toISOString()
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: paidAt,
      payment_method: 'flow',
      transaction_id: token,
      notes: `Flow token: ${token} (${source})`,
    })
    .eq('id', payment.id)
    .eq('club_id', payment.club_id)
  if (error) return { ok: false as const, reason: 'update_failed', error: error.message }

  await activateSubscriptionForPaidPayment(supabase, payment.club_id, payment, new Date(paidAt))
  return { ok: true as const, paid: true as const, paymentId: payment.id }
}

type ReconcileOpts = {
  /** When true, mark as paid even if getStatus API is unavailable (webhook source) */
  trustWebhook?: boolean
}

export async function reconcileFlowPaymentByToken(token: string, opts?: ReconcileOpts) {
  const supabase = createAdminClient()
  if (!token?.trim()) return { ok: false as const, reason: 'missing_token' }

  const { data: byToken } = await supabase
    .from('payments')
    .select('id, club_id, athlete_id, plan_id, status')
    .eq('transaction_id', token.trim())
    .maybeSingle()

  let payment = byToken
  if (!payment) return { ok: false as const, reason: 'payment_not_found' }
  if (payment.status === 'paid') {
    return { ok: true as const, paid: true as const, alreadyPaid: true as const }
  }

  const { data: clubRow } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', payment.club_id)
    .single()
  const flowConfig = resolveFlowConfigFromSettings((clubRow?.settings ?? {}) as Record<string, unknown>)
  if (!flowConfig) return { ok: false as const, reason: 'flow_not_configured' }

  // Try to verify with Flow API
  let statusResponse: Record<string, unknown> = {}
  let paid = false
  let apiAvailable = true
  try {
    statusResponse = await getFlowPaymentStatus(flowConfig, token.trim())
    paid = flowStatusIsPaid(statusResponse.status)
  } catch {
    apiAvailable = false
  }

  if (paid) {
    const paymentIdFromOrder = parsePaymentIdFromCommerceOrder(statusResponse.commerceOrder)
    if (paymentIdFromOrder && paymentIdFromOrder !== payment.id) {
      const { data: byOrder } = await supabase
        .from('payments')
        .select('id, club_id, athlete_id, plan_id, status')
        .eq('id', paymentIdFromOrder)
        .eq('club_id', payment.club_id)
        .maybeSingle()
      if (byOrder) payment = byOrder
    }
    if (payment.status === 'paid') {
      return { ok: true as const, paid: true as const, alreadyPaid: true as const }
    }
    return markPaymentAsPaid(supabase, payment, token.trim(), 'verified_by_api')
  }

  // Flow API says not paid, or API is unavailable
  if (!apiAvailable && opts?.trustWebhook) {
    return markPaymentAsPaid(supabase, payment, token.trim(), 'trusted_webhook')
  }

  // Check if DB was updated by another process
  const { data: fallback } = await supabase
    .from('payments')
    .select('status')
    .eq('transaction_id', token.trim())
    .maybeSingle()
  if (fallback?.status === 'paid') {
    return { ok: true as const, paid: true as const, alreadyPaid: true as const }
  }

  return { ok: true as const, paid: false as const, apiAvailable }
}
