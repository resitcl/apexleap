import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getFlowPaymentStatus,
  flowStatusIsPaid,
  resolveFlowConfigFromSettings,
} from '@/lib/flow'
import { reconcileFlowPaymentByToken } from '@/lib/flow-payment-reconcile'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tokenParam = url.searchParams.get('token') ?? ''
  const paymentIdParam = url.searchParams.get('payment_id') ?? ''

  if (!tokenParam.trim() && !paymentIdParam.trim()) {
    return NextResponse.json(
      { ok: false, state: 'failed', reason: 'missing_token_or_payment_id' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const diag: Record<string, unknown> = { tokenParam, paymentIdParam }

  // Step 1: Find payment by token OR payment_id
  let payment: {
    id: string; club_id: string; athlete_id: string
    plan_id: string | null; status: string
    transaction_id: string | null; payment_method: string | null
  } | null = null
  let payErr: string | null = null

  if (tokenParam.trim()) {
    const res = await supabase
      .from('payments')
      .select('id, club_id, athlete_id, plan_id, status, transaction_id, payment_method')
      .eq('transaction_id', tokenParam.trim())
      .maybeSingle()
    payment = res.data
    payErr = res.error?.message ?? null
  }

  if (!payment && paymentIdParam.trim()) {
    const res = await supabase
      .from('payments')
      .select('id, club_id, athlete_id, plan_id, status, transaction_id, payment_method')
      .eq('id', paymentIdParam.trim())
      .maybeSingle()
    payment = res.data
    payErr = res.error?.message ?? null
    diag.step1_foundBy = 'payment_id'
  } else if (payment) {
    diag.step1_foundBy = 'transaction_id'
  }

  const token = payment?.transaction_id ?? tokenParam.trim()
  diag.step1_payment = payment
    ? { id: payment.id, status: payment.status, club_id: payment.club_id, transaction_id: payment.transaction_id }
    : null
  diag.step1_error = payErr
  diag.resolvedToken = token

  if (!payment) {
    return NextResponse.json({ ok: false, state: 'failed', reason: 'payment_not_found', diag })
  }

  if (payment.status === 'paid') {
    return NextResponse.json({ ok: true, state: 'paid', reason: 'already_paid_in_db', diag })
  }

  // Step 2: Load Flow config
  const { data: clubRow } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', payment.club_id)
    .single()

  const settings = (clubRow?.settings ?? {}) as Record<string, unknown>
  const flowConfig = resolveFlowConfigFromSettings(settings)
  diag.step2_flowConfigResolved = !!flowConfig
  diag.step2_sandbox = flowConfig?.sandbox ?? null
  diag.step2_hasApiKey = !!flowConfig?.apiKey
  diag.step2_hasSecretKey = !!flowConfig?.secretKey

  if (!flowConfig) {
    return NextResponse.json({ ok: false, state: 'failed', reason: 'flow_not_configured', diag })
  }

  // Step 3: Call Flow getStatus API
  let flowResponse: Record<string, unknown> | null = null
  let flowError: string | null = null
  try {
    flowResponse = await getFlowPaymentStatus(flowConfig, token.trim())
  } catch (e) {
    flowError = e instanceof Error ? e.message : String(e)
  }

  diag.step3_flowResponse = flowResponse
  diag.step3_flowError = flowError
  diag.step3_rawStatus = flowResponse?.status ?? null
  diag.step3_statusType = flowResponse?.status !== undefined ? typeof flowResponse.status : null
  diag.step3_isPaid = flowResponse ? flowStatusIsPaid(flowResponse.status) : null

  // Step 4: Try to reconcile (with trustWebhook so it works even if API is down)
  const flowSaysPaid = flowResponse ? flowStatusIsPaid(flowResponse.status) : false
  diag.step4_flowSaysPaid = flowSaysPaid
  diag.step4_flowApiDown = !!flowError

  diag.step4_action = 'reconciling_with_trust'
  try {
    const result = await reconcileFlowPaymentByToken(token, { trustWebhook: true })
    diag.step4_reconcileResult = result
  } catch (e) {
    diag.step4_reconcileError = e instanceof Error ? e.message : String(e)
  }

  const { data: afterUpdate } = await supabase
    .from('payments')
    .select('status')
    .eq('id', payment.id)
    .single()
  diag.step4_finalDbStatus = afterUpdate?.status ?? null

  // Final state
  const { data: finalPayment } = await supabase
    .from('payments')
    .select('status')
    .eq('id', payment.id)
    .maybeSingle()

  const finalStatus = finalPayment?.status
  const state =
    finalStatus === 'paid'
      ? 'paid'
      : finalStatus === 'failed' || finalStatus === 'cancelled'
        ? 'failed'
        : 'pending'

  return NextResponse.json({
    ok: true,
    state,
    reason: `db_${finalStatus ?? 'unknown'}`,
    diag,
  })
}
