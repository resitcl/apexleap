import { createAdminClient } from '@/lib/supabase/admin'
import {
  activateSubscriptionForPaidPayment,
  markPaymentPaidIdempotent,
  persistAmountMismatch,
  notifyPaymentFailed,
  closeFailedGatewayAttempt,
} from '@/lib/subscription-activation'
import {
  resolveMercadoPagoConfigFromSettings,
  getMercadoPagoPayment,
  mpStatusIsApproved,
} from '@/lib/mercadopago'

/** Extrae el id de pago propio (`pay_<uuid>`) desde un external_reference de MercadoPago. */
export function parsePaymentIdFromExternalReference(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const m = value.match(/pay_([0-9a-fA-F-]{36})/)
  return m?.[1] ?? null
}

type ReconcileResult =
  | { ok: true; paid: true; alreadyPaid?: true; paymentId?: string }
  | { ok: true; paid: false; status?: string }
  | { ok: false; reason: string; expected?: number; charged?: number; internalError?: boolean }

/**
 * Cierra un intento de MercadoPago abandonado/rechazado. La fila creada por el checkout pasa a
 * `failed`; una cuota preexistente conserva su deuda (ver `closeFailedGatewayAttempt`). Importa
 * especialmente aquí: el id llega por una URL pública (`external_reference`), así que nunca debe
 * poder anular una cuota que no sea un intento de pasarela.
 */
export async function markMercadoPagoPaymentFailedIfPending(
  ourPaymentId: string,
  reason: string,
): Promise<void> {
  if (!ourPaymentId?.trim()) return
  const supabase = createAdminClient()
  const closed = await closeFailedGatewayAttempt(
    supabase,
    { column: 'id', value: ourPaymentId.trim() },
    `MercadoPago: pago no completado (${reason})`,
  )
  // Aviso al alumno solo si el intento realmente se cerró en esta llamada (best-effort).
  for (const p of closed) {
    await notifyPaymentFailed(supabase, p.club_id, {
      athlete_id: p.athlete_id,
      plan_id: p.plan_id ?? null,
      amount: p.amount ?? null,
    })
  }
}

/**
 * Reconcilia un pago de MercadoPago contra nuestra BD.
 */
export async function reconcileMercadoPagoPayment(args: {
  ourPaymentId: string
  mpPaymentId: string | null
}): Promise<ReconcileResult> {
  const { ourPaymentId } = args
  const rawMpId = (args.mpPaymentId ?? '').trim()
  const mpPaymentId = rawMpId && rawMpId.toLowerCase() !== 'null' && rawMpId.toLowerCase() !== 'undefined' ? rawMpId : null
  const supabase = createAdminClient()

  if (!ourPaymentId?.trim()) return { ok: false, reason: 'missing_payment_ref' }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, club_id, athlete_id, plan_id, status, amount, period_start, period_end')
    .eq('id', ourPaymentId.trim())
    .maybeSingle()

  if (!payment) return { ok: false, reason: 'payment_not_found' }
  if (payment.status === 'paid') return { ok: true, paid: true, alreadyPaid: true }

  const { data: clubRow } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', payment.club_id)
    .single()
  const mpConfig = resolveMercadoPagoConfigFromSettings((clubRow?.settings ?? {}) as Record<string, unknown>)
  if (!mpConfig) return { ok: false, reason: 'mercadopago_not_configured' }

  if (!mpPaymentId?.trim()) return { ok: true, paid: false, status: 'unknown' }

  let mpPayment: Record<string, unknown>
  try {
    mpPayment = await getMercadoPagoPayment(mpConfig, mpPaymentId.trim())
  } catch {
    return { ok: true, paid: false, status: 'api_unavailable' }
  }

  const refPaymentId = parsePaymentIdFromExternalReference(mpPayment.external_reference)
  if (refPaymentId && refPaymentId !== payment.id) {
    return { ok: false, reason: 'reference_mismatch' }
  }

  const status = mpPayment.status
  if (!mpStatusIsApproved(status)) {
    return { ok: true, paid: false, status: typeof status === 'string' ? status : 'unknown' }
  }

  const expectedAmount = Number((payment as { amount?: unknown }).amount)
  const chargedAmount = Number(mpPayment.transaction_amount)
  if (Number.isFinite(expectedAmount) && Number.isFinite(chargedAmount)) {
    const diff = Math.round(chargedAmount) - Math.round(expectedAmount)
    if (diff < -1) {
      // Pagó de MENOS: no acreditar y registrar la discrepancia.
      await persistAmountMismatch(supabase, payment.id, payment.club_id, expectedAmount, chargedAmount, 'MercadoPago')
      return { ok: false, reason: 'amount_mismatch', expected: expectedAmount, charged: chargedAmount }
    }
    if (diff > 1) {
      // Pagó de MÁS: se acredita igual (no penalizar al atleta) pero se registra para revisión del club.
      await persistAmountMismatch(supabase, payment.id, payment.club_id, expectedAmount, chargedAmount, 'MercadoPago')
    }
  }

  const paidAt = new Date().toISOString()
  try {
    const result = await markPaymentPaidIdempotent(supabase, payment.id, payment.club_id, {
      paid_at: paidAt,
      payment_method: 'mercadopago',
      transaction_id: String(mpPaymentId).trim(),
      notes: `MercadoPago payment: ${mpPaymentId}`,
    })

    if (result.won) {
      await activateSubscriptionForPaidPayment(
        supabase,
        payment.club_id,
        result.payment,
        new Date(paidAt),
        'mercadopago',
      )
      return { ok: true, paid: true, paymentId: payment.id }
    }

    if (result.alreadyPaid) {
      return { ok: true, paid: true, alreadyPaid: true, paymentId: payment.id }
    }

    return { ok: false, reason: 'update_failed', internalError: true }
  } catch {
    return { ok: false, reason: 'update_failed', internalError: true }
  }
}
