import { NextResponse } from 'next/server'
import {
  reconcileMercadoPagoPayment,
  parsePaymentIdFromExternalReference,
  markMercadoPagoPaymentFailedIfPending,
} from '@/lib/mercadopago-reconcile'
import { createAdminClient } from '@/lib/supabase/admin'

function appBaseUrl(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envBase) return envBase.replace(/\/$/, '')
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

// MercadoPago a veces redirige con los strings literales "null"/"undefined" en los params
// (p.ej. cuando el pago se rechaza antes de crearse). Hay que tratarlos como ausentes.
function cleanParam(value: string | null): string {
  const v = (value ?? '').trim().toLowerCase()
  return v === 'null' || v === 'undefined' ? '' : v
}

async function handleReturn(req: Request) {
  const url = new URL(req.url)
  const ourPaymentId = parsePaymentIdFromExternalReference(url.searchParams.get('external_reference'))
  const rawPid = (url.searchParams.get('payment_id') || url.searchParams.get('collection_id') || '').trim()
  const mpPaymentId = rawPid && rawPid.toLowerCase() !== 'null' && rawPid.toLowerCase() !== 'undefined' ? rawPid : null
  const mpStatus = cleanParam(url.searchParams.get('status') || url.searchParams.get('collection_status'))

  const isRejected = (s: string) => s === 'rejected' || s === 'cancelled'

  let state: 'paid' | 'pending' | 'failed' = 'pending'
  let reason = 'unknown'
  // Estado autoritativo de MP vía getPayment (solo cuando hay payment_id y la API responde).
  let verifiedStatus = ''

  if (ourPaymentId) {
    try {
      const result = await reconcileMercadoPagoPayment({ ourPaymentId, mpPaymentId })
      if (result.ok && 'paid' in result && result.paid) {
        state = 'paid'
        reason = 'reconciled_paid'
      } else if (!result.ok) {
        // Error de reconciliación (config faltante, mismatch de monto/referencia): no
        // auto-fallar; queda para investigación manual.
        reason = result.reason
      } else {
        verifiedStatus = typeof result.status === 'string' ? result.status : ''
        reason = verifiedStatus ? `mp_${verifiedStatus}` : 'awaiting_confirmation'
      }
    } catch {
      reason = 'reconcile_exception'
    }

    // Verificación final desde BD (por si el webhook confirmó/falló en paralelo).
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

    // Marcar fracaso solo ante señal negativa clara; NUNCA por caída de la API ni mientras
    // el pago siga en proceso (entonces lo resolverá el webhook).
    if (state === 'pending') {
      const abandoned = !mpPaymentId && (mpStatus === '' || mpStatus === 'null')
      if (isRejected(verifiedStatus) || isRejected(mpStatus) || abandoned) {
        if (abandoned && (reason === 'awaiting_confirmation' || reason === 'unknown')) reason = 'abandoned'
        await markMercadoPagoPaymentFailedIfPending(ourPaymentId, reason)
        state = 'failed'
      }
    }
  } else if (isRejected(mpStatus)) {
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
