import { NextResponse } from 'next/server'
import { reconcileFlowPaymentByToken } from '@/lib/flow-payment-reconcile'
import { createAdminClient } from '@/lib/supabase/admin'

function appBaseUrl(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envBase) return envBase.replace(/\/$/, '')
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

async function handleReturn(req: Request) {
  const url = new URL(req.url)
  let token = url.searchParams.get('token') ?? url.searchParams.get('token_ws') ?? ''

  if (!token) {
    try {
      const contentType = req.headers.get('content-type') || ''
      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const form = await req.formData()
        token = String(form.get('token') ?? form.get('token_ws') ?? '')
      } else {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
        token =
          (typeof body.token === 'string' && body.token) ||
          (typeof body.token_ws === 'string' && body.token_ws) ||
          ''
      }
    } catch { /* use empty token */ }
  }

  let paid = false
  let flowState: 'paid' | 'pending' | 'failed' = 'pending'
  let reason = 'unknown'
  try {
    const result = await reconcileFlowPaymentByToken(token)
    paid = Boolean(result && 'paid' in result && result.paid)
    if (paid) {
      flowState = 'paid'
      reason = 'reconciled_paid'
    } else if (result && 'reason' in result && typeof result.reason === 'string') {
      reason = result.reason
    }
  } catch {
    reason = 'reconcile_exception'
  }

  // Fuente de verdad final para UI: estado real en BD por token.
  // Evita falsos "failed" por race condition entre retorno y webhook.
  if (token) {
    try {
      const supabase = createAdminClient()
      const { data: payment } = await supabase
        .from('payments')
        .select('status')
        .eq('transaction_id', token)
        .maybeSingle()
      if (payment?.status === 'paid') {
        flowState = 'paid'
        reason = 'db_paid'
      } else if (payment?.status === 'pending' || payment?.status === 'overdue') {
        flowState = 'pending'
        reason = `db_${payment.status}`
      } else if (payment?.status === 'failed' || payment?.status === 'cancelled') {
        flowState = 'failed'
        reason = `db_${payment.status}`
      }
    } catch {
      // no-op: mantenemos estado calculado
    }
  }

  const target = new URL('/dashboard/athlete/payments', appBaseUrl(req))
  target.searchParams.set('flow', flowState)
  target.searchParams.set('flow_reason', reason)
  if (token) target.searchParams.set('token', token)
  return NextResponse.redirect(target, { status: 303 })
}

export async function GET(req: Request) {
  return handleReturn(req)
}

export async function POST(req: Request) {
  return handleReturn(req)
}
