import { NextResponse } from 'next/server'
import { reconcileMercadoPagoPayment, parsePaymentIdFromExternalReference } from '@/lib/mercadopago-reconcile'
import { createAdminClient } from '@/lib/supabase/admin'

function appBaseUrl(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envBase) return envBase.replace(/\/$/, '')
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

async function handleReturn(req: Request) {
  const url = new URL(req.url)
  const ourPaymentId = parsePaymentIdFromExternalReference(url.searchParams.get('external_reference'))
  const mpPaymentId = url.searchParams.get('payment_id') || url.searchParams.get('collection_id')
  const mpStatus = (url.searchParams.get('status') || url.searchParams.get('collection_status') || '').toLowerCase()

  let state: 'paid' | 'pending' | 'failed' = 'pending'
  let reason = 'unknown'

  if (ourPaymentId) {
    try {
      const result = await reconcileMercadoPagoPayment({ ourPaymentId, mpPaymentId })
      if (result.ok && 'paid' in result && result.paid) {
        state = 'paid'
        reason = 'reconciled_paid'
      } else if (!result.ok) {
        reason = result.reason
        if (mpStatus === 'rejected' || mpStatus === 'cancelled') state = 'failed'
      } else {
        if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
          state = 'failed'
          reason = `mp_${mpStatus}`
        } else {
          state = 'pending'
          reason = result.status ? `mp_${result.status}` : 'awaiting_confirmation'
        }
      }
    } catch {
      reason = 'reconcile_exception'
    }

    // Verificación final desde BD (por si el webhook confirmó en paralelo).
    if (state !== 'paid') {
      try {
        const supabase = createAdminClient()
        const { data: p } = await supabase.from('payments').select('status').eq('id', ourPaymentId).maybeSingle()
        if (p?.status === 'paid') {
          state = 'paid'
          reason = 'db_paid'
        }
      } catch {
        /* mantener estado calculado */
      }
    }
  } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
    state = 'failed'
    reason = `mp_${mpStatus}`
  }

  const target = new URL('/dashboard/athlete/payments', appBaseUrl(req))
  target.searchParams.set('mp', state)
  target.searchParams.set('mp_reason', reason)
  if (ourPaymentId) target.searchParams.set('mp_ref', `pay_${ourPaymentId}`)
  if (mpPaymentId) target.searchParams.set('mp_pid', mpPaymentId)
  return NextResponse.redirect(target, { status: 303 })
}

export async function GET(req: Request) { return handleReturn(req) }
export async function POST(req: Request) { return handleReturn(req) }
