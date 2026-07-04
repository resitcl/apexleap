import { createAdminClient } from '@/lib/supabase/admin'
import { getFlowPaymentStatus, flowStatusIsPaid, resolveFlowConfigFromSettings, verifyFlowSignature } from '@/lib/flow'
import {
  activateSubscriptionForPaidPayment,
  markPaymentPaidIdempotent,
  persistAmountMismatch,
} from '@/lib/subscription-activation'

function parsePaymentIdFromCommerceOrder(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/pay_([0-9a-fA-F-]{36})/)
  return m?.[1] ?? null
}

type ReconcileResult =
  | { ok: true; paid: true; alreadyPaid?: true; paymentId?: string }
  | { ok: true; paid: false; apiAvailable?: boolean; status?: unknown }
  | { ok: false; reason: string; expected?: number; charged?: number; internalError?: boolean }

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
): Promise<ReconcileResult> {
  const paidAt = new Date().toISOString()
  try {
    const result = await markPaymentPaidIdempotent(supabase, payment.id, payment.club_id, {
      paid_at: paidAt,
      payment_method: 'flow',
      transaction_id: token,
      notes: `Flow token: ${token} (${source})`,
    })

    if (result.won) {
      await activateSubscriptionForPaidPayment(
        supabase,
        payment.club_id,
        result.payment,
        new Date(paidAt),
        'flow',
      )
      return { ok: true, paid: true, paymentId: payment.id }
    }

    if (result.alreadyPaid) {
      return { ok: true, paid: true, alreadyPaid: true, paymentId: payment.id }
    }

    return { ok: false, reason: 'update_failed', internalError: true }
  } catch (e) {
    return {
      ok: false,
      reason: 'update_failed',
      internalError: true,
    }
  }
}

type ReconcileOpts = {
  /** Parámetros del callback de Flow (incl. firma `s`). Obligatorio en webhooks. */
  webhookParams?: Record<string, string>
  /** Si true, exige firma HMAC válida (webhook de confirmación). */
  requireSignature?: boolean
}

export async function reconcileFlowPaymentByToken(token: string, opts?: ReconcileOpts): Promise<ReconcileResult> {
  const supabase = createAdminClient()
  if (!token?.trim()) return { ok: false, reason: 'missing_token' }

  const { data: byToken } = await supabase
    .from('payments')
    .select('id, club_id, athlete_id, plan_id, status, amount, period_start, period_end')
    .eq('transaction_id', token.trim())
    .maybeSingle()

  let payment = byToken
  if (!payment) return { ok: false, reason: 'payment_not_found' }
  if (payment.status === 'paid') {
    return { ok: true, paid: true, alreadyPaid: true }
  }

  const { data: clubRow } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', payment.club_id)
    .single()
  const flowConfig = resolveFlowConfigFromSettings((clubRow?.settings ?? {}) as Record<string, unknown>)
  if (!flowConfig) return { ok: false, reason: 'flow_not_configured' }

  if (opts?.requireSignature || opts?.webhookParams) {
    if (!opts.webhookParams?.s || !verifyFlowSignature(flowConfig.secretKey, opts.webhookParams)) {
      return { ok: false, reason: 'invalid_signature' }
    }
  }

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
      return { ok: true, paid: true, alreadyPaid: true }
    }

    const expectedAmount = Number((payment as { amount?: unknown }).amount)
    const chargedAmount = Number(statusResponse.amount)
    if (
      Number.isFinite(expectedAmount) &&
      Number.isFinite(chargedAmount) &&
      Math.round(chargedAmount) < Math.round(expectedAmount)
    ) {
      await persistAmountMismatch(supabase, payment.id, payment.club_id, expectedAmount, chargedAmount, 'Flow')
      return { ok: false, reason: 'amount_mismatch', expected: expectedAmount, charged: chargedAmount }
    }

    return markPaymentAsPaid(supabase, payment, token.trim(), 'verified_by_api')
  }

  const { data: fallback } = await supabase
    .from('payments')
    .select('status')
    .eq('transaction_id', token.trim())
    .maybeSingle()
  if (fallback?.status === 'paid') {
    return { ok: true, paid: true, alreadyPaid: true }
  }

  return { ok: true, paid: false, apiAvailable, status: statusResponse.status }
}

/** Re-export para compatibilidad con imports existentes. */
export { activateSubscriptionForPaidPayment } from '@/lib/subscription-activation'

/**
 * Marca como `failed` un pago de Flow rechazado/anulado si sigue pendiente o vencido.
 */
export async function markFlowPaymentFailedIfPending(token: string, reason: string): Promise<void> {
  if (!token?.trim()) return
  const supabase = createAdminClient()
  await supabase
    .from('payments')
    .update({ status: 'failed', notes: `Flow: pago no completado (${reason})` })
    .eq('transaction_id', token.trim())
    .in('status', ['pending', 'overdue'])
}
