import { NextResponse } from 'next/server'
import { reconcileFlowPaymentByToken } from '@/lib/flow-payment-reconcile'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  if (!token.trim()) {
    return NextResponse.json({ ok: false, state: 'failed', reason: 'missing_token' }, { status: 400 })
  }

  let reason = 'unknown'
  try {
    const result = await reconcileFlowPaymentByToken(token)
    if (result && typeof result === 'object' && 'reason' in result && typeof result.reason === 'string') {
      reason = result.reason
    }
  } catch {
    reason = 'reconcile_exception'
  }

  const supabase = createAdminClient()
  const { data: payment } = await supabase
    .from('payments')
    .select('status')
    .eq('transaction_id', token)
    .maybeSingle()

  const status = payment?.status
  const state =
    status === 'paid'
      ? 'paid'
      : status === 'failed' || status === 'cancelled'
        ? 'failed'
        : 'pending'

  return NextResponse.json({
    ok: true,
    state,
    reason: status ? `db_${status}` : reason,
  })
}
