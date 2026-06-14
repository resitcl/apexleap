import { createAdminClient } from '@/lib/supabase/admin'
import { activateSubscriptionForPaidPayment } from '@/lib/flow-payment-reconcile'
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
  | { ok: false; reason: string; expected?: number; charged?: number }

/**
 * Marca como `failed` un pago de MercadoPago abandonado/rechazado, solo si sigue `pending`.
 * Nunca pisa un pago `paid`/`overdue` (el guard de status evita carreras con el webhook).
 */
export async function markMercadoPagoPaymentFailedIfPending(
  ourPaymentId: string,
  reason: string,
): Promise<void> {
  if (!ourPaymentId?.trim()) return
  const supabase = createAdminClient()
  await supabase
    .from('payments')
    .update({ status: 'failed', notes: `MercadoPago: pago no completado (${reason})` })
    .eq('id', ourPaymentId.trim())
    .eq('status', 'pending')
}

/**
 * Reconcilia un pago de MercadoPago contra nuestra BD.
 * - `ourPaymentId`: id del pago propio (de external_reference `pay_<id>`, embebido en back_url/notification_url).
 * - `mpPaymentId`: id del pago en MercadoPago (de `payment_id`/`data.id`). Fuente de verdad vía getPayment.
 * Nunca marca como pagado sin un estado `approved` verificado con el Access Token del club.
 */
export async function reconcileMercadoPagoPayment(args: {
  ourPaymentId: string
  mpPaymentId: string | null
}): Promise<ReconcileResult> {
  const { ourPaymentId } = args
  // MP puede mandar el string literal "null"/"undefined" como payment_id; tratarlo como ausente.
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

  // Fuente de verdad: consultar el pago en MercadoPago con el Access Token del club.
  let mpPayment: Record<string, unknown>
  try {
    mpPayment = await getMercadoPagoPayment(mpConfig, mpPaymentId.trim())
  } catch {
    return { ok: true, paid: false, status: 'api_unavailable' }
  }

  // El external_reference debe corresponder a este pago (evita mapear un pago ajeno).
  const refPaymentId = parsePaymentIdFromExternalReference(mpPayment.external_reference)
  if (refPaymentId && refPaymentId !== payment.id) {
    return { ok: false, reason: 'reference_mismatch' }
  }

  const status = mpPayment.status
  if (!mpStatusIsApproved(status)) {
    return { ok: true, paid: false, status: typeof status === 'string' ? status : 'unknown' }
  }

  // Verificar el monto efectivamente cobrado contra el esperado (CLP, entero).
  const expectedAmount = Number((payment as { amount?: unknown }).amount)
  const chargedAmount = Number(mpPayment.transaction_amount)
  if (
    Number.isFinite(expectedAmount) &&
    Number.isFinite(chargedAmount) &&
    Math.round(chargedAmount) < Math.round(expectedAmount)
  ) {
    return { ok: false, reason: 'amount_mismatch', expected: expectedAmount, charged: chargedAmount }
  }

  const paidAt = new Date().toISOString()
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: paidAt,
      payment_method: 'mercadopago',
      transaction_id: String(mpPaymentId).trim(),
      notes: `MercadoPago payment: ${mpPaymentId}`,
    })
    .eq('id', payment.id)
    .eq('club_id', payment.club_id)
  if (error) return { ok: false, reason: 'update_failed' }

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
    'mercadopago',
  )

  return { ok: true, paid: true, paymentId: payment.id }
}
