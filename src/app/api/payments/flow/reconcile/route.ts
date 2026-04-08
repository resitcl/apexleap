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
  const token = url.searchParams.get('token') ?? ''
  if (!token.trim()) {
    return NextResponse.json({ ok: false, state: 'failed', reason: 'missing_token' }, { status: 400 })
  }

  const diag: Record<string, unknown> = { token }
  const supabase = createAdminClient()

  // Step 1: Find payment by token
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('id, club_id, athlete_id, plan_id, status, transaction_id, payment_method')
    .eq('transaction_id', token.trim())
    .maybeSingle()

  diag.step1_payment = payment
    ? { id: payment.id, status: payment.status, club_id: payment.club_id }
    : null
  diag.step1_error = payErr?.message ?? null

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

  // Step 4: If Flow says paid, try to reconcile
  const flowSaysPaid = flowResponse ? flowStatusIsPaid(flowResponse.status) : false

  if (flowSaysPaid && payment.status !== 'paid') {
    diag.step4_action = 'updating_payment_to_paid'
    try {
      const result = await reconcileFlowPaymentByToken(token)
      diag.step4_reconcileResult = result
    } catch (e) {
      diag.step4_reconcileError = e instanceof Error ? e.message : String(e)
    }

    // Re-check DB
    const { data: afterUpdate } = await supabase
      .from('payments')
      .select('status')
      .eq('id', payment.id)
      .single()
    diag.step4_finalDbStatus = afterUpdate?.status ?? null
  } else if (!flowSaysPaid && flowResponse) {
    diag.step4_action = 'flow_says_not_paid'
    diag.step4_flowStatus = flowResponse.status
  } else if (flowError) {
    diag.step4_action = 'flow_api_failed'
  }

  // Final state
  const { data: finalPayment } = await supabase
    .from('payments')
    .select('status')
    .eq('transaction_id', token.trim())
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
