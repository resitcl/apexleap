import { createAdminClient } from '@/lib/supabase/admin'
import { subscriptionPeriodFieldsForPlan, type BillingCycle } from '@/lib/billing-utils'
import { ONLINE_GATEWAY_IDS } from '@/lib/payment-methods'
import { getFlowPaymentStatus, flowStatusIsPaid, resolveFlowConfigFromSettings, verifyFlowSignature } from '@/lib/flow'

function parsePaymentIdFromCommerceOrder(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/pay_([0-9a-fA-F-]{36})/)
  return m?.[1] ?? null
}

async function activateSubscriptionForPaidPayment(
  supabase: ReturnType<typeof createAdminClient>,
  clubId: string,
  payment: {
    athlete_id: string
    plan_id: string | null
    period_start?: string | null
    period_end?: string | null
  },
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
  const { startStr, endStr, nextBillingStr, billingAnchorDay } = subscriptionPeriodFieldsForPlan(cycle, {
    periodStart: payment.period_start,
    periodEnd: payment.period_end,
    paidAt: paidAtDate,
  })

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

async function markPaymentAsPaid(
  supabase: ReturnType<typeof createAdminClient>,
  payment: {
    id: string
    club_id: string
    athlete_id: string
    plan_id: string | null
    period_start?: string | null
    period_end?: string | null
  },
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

  const { data: withPeriods } = await supabase
    .from('payments')
    .select('athlete_id, plan_id, period_start, period_end')
    .eq('id', payment.id)
    .eq('club_id', payment.club_id)
    .single()

  await activateSubscriptionForPaidPayment(
    supabase,
    payment.club_id,
    withPeriods ?? payment,
    new Date(paidAt),
  )
  return { ok: true as const, paid: true as const, paymentId: payment.id }
}

type ReconcileOpts = {
  /**
   * Parámetros crudos del callback de Flow (incluyendo la firma `s`). Cuando se proveen,
   * se verifica la firma HMAC contra el secret_key del club antes de reconciliar.
   */
  webhookParams?: Record<string, string>
}

export async function reconcileFlowPaymentByToken(token: string, opts?: ReconcileOpts) {
  const supabase = createAdminClient()
  if (!token?.trim()) return { ok: false as const, reason: 'missing_token' }

  const { data: byToken } = await supabase
    .from('payments')
    .select('id, club_id, athlete_id, plan_id, status, amount, period_start, period_end')
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

  // Defensa en profundidad: si esto viene del webhook de confirmación de Flow, verificar su firma HMAC.
  if (opts?.webhookParams && typeof opts.webhookParams.s === 'string' && opts.webhookParams.s.length > 0) {
    if (!verifyFlowSignature(flowConfig.secretKey, opts.webhookParams)) {
      return { ok: false as const, reason: 'invalid_signature' }
    }
  }

  // Fuente de verdad: getStatus de Flow (server-to-server, autenticado y firmado con el secret_key).
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
        .select('id, club_id, athlete_id, plan_id, status, amount, period_start, period_end')
        .eq('id', paymentIdFromOrder)
        .eq('club_id', payment.club_id)
        .maybeSingle()
      if (byOrder) payment = byOrder
    }
    if (payment.status === 'paid') {
      return { ok: true as const, paid: true as const, alreadyPaid: true as const }
    }

    // Verificar que el monto efectivamente cobrado coincide con el monto esperado del pago (CLP, entero).
    const expectedAmount = Number((payment as { amount?: unknown }).amount)
    const chargedAmount = Number(statusResponse.amount)
    if (
      Number.isFinite(expectedAmount) &&
      Number.isFinite(chargedAmount) &&
      Math.round(chargedAmount) < Math.round(expectedAmount)
    ) {
      return { ok: false as const, reason: 'amount_mismatch', expected: expectedAmount, charged: chargedAmount }
    }

    return markPaymentAsPaid(supabase, payment, token.trim(), 'verified_by_api')
  }

  // Flow dice que no está pagado, o la API no estaba disponible. NUNCA se marca como pagado
  // sin un estado verificado por getStatus (se eliminó el fallback de "confiar en el webhook").
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
