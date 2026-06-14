import { NextResponse } from 'next/server'
import { reconcileMercadoPagoPayment, parsePaymentIdFromExternalReference } from '@/lib/mercadopago-reconcile'
import { createAdminClient } from '@/lib/supabase/admin'

/** Endpoint de polling para el banner del atleta tras volver de MercadoPago. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const ourPaymentId = parsePaymentIdFromExternalReference(url.searchParams.get('ext'))
  const mpPaymentId = url.searchParams.get('mp_pid')

  if (!ourPaymentId) {
    return NextResponse.json({ ok: false, state: 'failed', reason: 'missing_reference' }, { status: 400 })
  }

  let state: 'paid' | 'pending' | 'failed' = 'pending'
  let reason = 'pending'
  try {
    const result = await reconcileMercadoPagoPayment({ ourPaymentId, mpPaymentId })
    if (result.ok && 'paid' in result && result.paid) {
      state = 'paid'
      reason = 'reconciled_paid'
    } else if (!result.ok) {
      reason = result.reason
    } else {
      reason = result.status ? `mp_${result.status}` : 'pending'
    }
  } catch {
    reason = 'reconcile_exception'
  }

  if (state !== 'paid') {
    try {
      const supabase = createAdminClient()
      const { data: p } = await supabase.from('payments').select('status').eq('id', ourPaymentId).maybeSingle()
      if (p?.status === 'paid') {
        state = 'paid'
        reason = 'db_paid'
      } else if (p?.status === 'failed' || p?.status === 'cancelled') {
        state = 'failed'
        reason = `db_${p.status}`
      }
    } catch {
      /* mantener estado calculado */
    }
  }

  return NextResponse.json({ ok: true, state, reason })
}
