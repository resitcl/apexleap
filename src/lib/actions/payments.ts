'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId, assertClubCapability, getClubMembershipRole } from '@/lib/actions/club-context'
import {
  calculateNextPeriodStart,
  calculatePeriodStartForPayment,
  getBillingAnchorDay,
  parseYmd,
  todayYmd,
  ymdFromDate,
  type BillingCycle,
} from '@/lib/billing-utils'
import { ONLINE_GATEWAY_IDS } from '@/lib/payment-methods'
import { activateSubscriptionForPaidPayment } from '@/lib/subscription-activation'

const paymentSchema = z.object({
  athlete_id: z.string().uuid('Alumno inválido'),
  plan_id: z.string().uuid().optional().nullable(),
  concept: z.string().min(2, 'El concepto debe tener al menos 2 caracteres'),
  amount: z.coerce.number().min(0, 'El monto no puede ser negativo'),
  status: z.enum(['pending', 'paid', 'overdue', 'failed', 'cancelled']).default('pending'),
  due_date: z.string().min(1, 'La fecha de vencimiento es requerida'),
  paid_at: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  transaction_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type PaymentInput = z.infer<typeof paymentSchema>

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

export async function getPayments(params?: {
  status?: string
  athleteId?: string
  athleteName?: string
  search?: string
  page?: number
  limit?: number
  from?: string
  to?: string
  amountMin?: number
  amountMax?: number
  paymentMethod?: string
  paidFrom?: string
  paidTo?: string
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const page = params?.page ?? 1
  const limit = params?.limit

  let query = supabase
    .from('payments')
    .select('*, athletes(id, name, photo_url), plans(id, name, billing_cycle)', { count: 'exact' })
    .eq('club_id', clubId)
    .order('due_date', { ascending: false })

  if (params?.status)    query = query.eq('status', params.status)
  if (params?.athleteId) query = query.eq('athlete_id', params.athleteId)
  if (params?.search)    query = query.ilike('concept', `%${params.search}%`)
  if (params?.from)      query = query.gte('due_date', params.from)
  if (params?.to)        query = query.lte('due_date', params.to)
  if (params?.amountMin != null) query = query.gte('amount', params.amountMin)
  if (params?.amountMax != null) query = query.lte('amount', params.amountMax)
  if (params?.paymentMethod)     query = query.eq('payment_method', params.paymentMethod)
  if (params?.paidFrom)  query = query.gte('paid_at', `${params.paidFrom}T00:00:00`)
  if (params?.paidTo)    query = query.lte('paid_at', `${params.paidTo}T23:59:59.999`)
  if (params?.athleteName) {
    const { data: athlData } = await supabase
      .from('athletes').select('id').eq('club_id', clubId)
      .ilike('name', `%${params.athleteName}%`)
    const ids = (athlData ?? []).map((a) => a.id)
    if (ids.length === 0) return { payments: [], total: 0 }
    query = query.in('athlete_id', ids)
  }

  if (limit != null) {
    const rangeFrom = (page - 1) * limit
    const rangeTo = rangeFrom + limit - 1
    query = query.range(rangeFrom, rangeTo)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { payments: data ?? [], total: count ?? 0 }
}

/** Próxima fecha de cobro por atleta según suscripciones activas (`next_billing_date`, alineado al plan/ciclo). */
export async function getNextBillingDateByAthleteIds(
  athleteIds: string[],
): Promise<Record<string, string | null>> {
  const unique = [...new Set(athleteIds.filter(Boolean))]
  if (unique.length === 0) return {}

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('athlete_id, next_billing_date')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .in('athlete_id', unique)

  if (error) throw new Error(error.message)

  const map: Record<string, string | null> = {}
  for (const row of data ?? []) {
    const aid = row.athlete_id as string
    const nb = row.next_billing_date as string | null
    if (nb == null) {
      if (!(aid in map)) map[aid] = null
      continue
    }
    const cur = map[aid]
    if (cur == null || nb < cur) map[aid] = nb
  }

  return map
}

export async function getPaymentSummary() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('payments')
    .select('status, amount')
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)

  const summary = {
    total_collected: 0,
    total_pending: 0,
    total_overdue: 0,
    count_overdue: 0,
  }

  for (const p of data ?? []) {
    if (p.status === 'paid')    summary.total_collected += Number(p.amount)
    if (p.status === 'pending') summary.total_pending   += Number(p.amount)
    if (p.status === 'overdue') {
      summary.total_overdue += Number(p.amount)
      summary.count_overdue++
    }
  }

  return summary
}

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

export async function createPayment(input: PaymentInput) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const parsed = paymentSchema.parse(input)
  const supabase = createAdminClient()

  // Si el pago está ligado a un plan, derivar el período para alinear la facturación y que el
  // índice único (club_id, athlete_id, plan_id, period_start) prevenga pagos duplicados del
  // mismo período (antes quedaba period_start NULL y el índice no cubría los pagos manuales).
  let periodStart: string | null = null
  let periodEnd: string | null = null
  if (parsed.plan_id) {
    const { data: plan } = await supabase
      .from('plans').select('billing_cycle').eq('id', parsed.plan_id).eq('club_id', clubId).maybeSingle()
    const cycle = ((plan?.billing_cycle as string) ?? 'monthly') as BillingCycle
    const ref = parseYmd(parsed.due_date)
    const { periodStart: ps, periodEnd: pe } = calculatePeriodStartForPayment(getBillingAnchorDay(ref), ref, cycle)
    periodStart = ymdFromDate(ps)
    periodEnd = pe ? ymdFromDate(pe) : null
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({ ...parsed, club_id: clubId, period_start: periodStart, period_end: periodEnd })
    .select()
    .single()

  if (error) {
    if (error.code === '23505' || error.message.includes('idx_payments_unique_period')) {
      throw new Error('Ya existe un pago registrado para ese alumno y plan en ese período.')
    }
    throw new Error(error.message)
  }

  // Auto-create subscription if payment is created as paid and linked to a plan
  if (parsed.status === 'paid' && parsed.plan_id) {
    const paidAtDate = parsed.paid_at ? new Date(parsed.paid_at) : new Date()
    await activateSubscriptionForPaidPayment(
      supabase,
      clubId,
      { athlete_id: parsed.athlete_id, plan_id: parsed.plan_id, period_start: periodStart, period_end: periodEnd },
      paidAtDate,
      parsed.payment_method ?? 'manual',
    )
    revalidatePath('/dashboard/subscriptions')
    revalidatePath('/dashboard/athletes')
    revalidatePath(`/dashboard/athletes/${parsed.athlete_id}`)
    revalidatePath('/dashboard/athlete')
  }

  revalidatePath('/dashboard/payments')
  revalidatePath(`/dashboard/athletes/${parsed.athlete_id}`)
  return data
}

/**
 * Mark a single payment as paid and activate the linked subscription.
 * Previously this only updated the payment status — subscription was never touched.
 */
export async function markAsPaid(id: string, method: string, paidAt?: string) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Fetch payment before updating so we have athlete_id + plan_id
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('id, athlete_id, plan_id, period_start, period_end, payment_method')
    .eq('id', id)
    .eq('club_id', clubId)
    .single()

  if (fetchError || !payment) throw new Error('Pago no encontrado')

  // Los pagos por pasarela (Flow/MercadoPago/etc.) se confirman automáticamente vía
  // webhook/return; no pueden marcarse manualmente desde el panel del admin.
  if (payment.payment_method && (ONLINE_GATEWAY_IDS as readonly string[]).includes(payment.payment_method)) {
    throw new Error('Los pagos por pasarela se confirman automáticamente y no pueden marcarse manualmente.')
  }

  const paidAtDate = paidAt
    ? paidAt.includes('T')
      ? new Date(paidAt)
      : new Date(`${paidAt.slice(0, 10)}T12:00:00`)
    : new Date()

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: paidAtDate.toISOString(),
      payment_method: method,
    })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Activate subscription using the same logic as confirmTransferPayment
  if (payment.plan_id) {
    await activateSubscriptionForPaidPayment(supabase, clubId, payment, paidAtDate, method)
    revalidatePath('/dashboard/subscriptions')
    revalidatePath('/dashboard/athletes')
    revalidatePath(`/dashboard/athletes/${payment.athlete_id}`)
    revalidatePath('/dashboard/athlete')
  }

  revalidatePath('/dashboard/payments')
  return data
}

function toPaidAtIso(value: string | null): string | null {
  if (value === null || value === '') return null
  const d = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) throw new Error('Fecha de pago inválida')
  return d.toISOString()
}

export async function updatePayment(id: string, input: {
  concept?: string
  amount?: number
  due_date?: string
  notes?: string | null
  type?: string
  payment_method?: string | null
  /** Fecha en que se registró el pago (transferencia, efectivo, etc.). */
  paid_at?: string | null
  /** Periodo cubierto por la cuota (si aplica). */
  period_start?: string | null
  period_end?: string | null
}) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('payments')
    .select('athlete_id')
    .eq('id', id)
    .eq('club_id', clubId)
    .maybeSingle()

  const updateRow: Record<string, unknown> = {}
  if (input.concept !== undefined) updateRow.concept = input.concept
  if (input.amount !== undefined) updateRow.amount = input.amount
  if (input.due_date !== undefined) updateRow.due_date = input.due_date
  if (input.notes !== undefined) updateRow.notes = input.notes
  if (input.type !== undefined) updateRow.type = input.type
  if (input.payment_method !== undefined) updateRow.payment_method = input.payment_method
  if (input.period_start !== undefined) updateRow.period_start = input.period_start
  if (input.period_end !== undefined) updateRow.period_end = input.period_end
  if (input.paid_at !== undefined) updateRow.paid_at = toPaidAtIso(input.paid_at)

  const { error } = await supabase
    .from('payments')
    .update(updateRow)
    .eq('id', id)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)

  const { data: pmt } = await supabase
    .from('payments')
    .select('status, athlete_id, plan_id, period_start, period_end')
    .eq('id', id)
    .eq('club_id', clubId)
    .maybeSingle()

  if (
    pmt?.status === 'paid' &&
    pmt.athlete_id &&
    pmt.plan_id &&
    pmt.period_start &&
    String(pmt.period_start).length >= 10
  ) {
    const { data: planRow } = await supabase
      .from('plans')
      .select('billing_cycle')
      .eq('id', pmt.plan_id)
      .single()
    if (planRow?.billing_cycle) {
      const cycle = planRow.billing_cycle as BillingCycle
      const anchor = new Date(`${String(pmt.period_start).slice(0, 10)}T12:00:00`)
      const next = calculateNextPeriodStart(anchor, cycle)
      await supabase
        .from('subscriptions')
        .update({
          current_period_start: String(pmt.period_start).slice(0, 10),
          current_period_end: pmt.period_end ? String(pmt.period_end).slice(0, 10) : null,
          next_billing_date: next ? next.toISOString().split('T')[0] : null,
        })
        .eq('club_id', clubId)
        .eq('athlete_id', pmt.athlete_id)
        .eq('plan_id', pmt.plan_id)
        .eq('status', 'active')
    }
  }

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/subscriptions')
  revalidatePath('/dashboard/athlete')
  if (existing?.athlete_id) revalidatePath(`/dashboard/athletes/${existing.athlete_id as string}`)
}

export async function updatePaymentStatus(
  id: string,
  status: 'pending' | 'paid' | 'overdue' | 'failed' | 'cancelled',
  method = 'manual',
) {
  if (status === 'paid') {
    return markAsPaid(id, method)
  }

  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('payments')
    .update({ status })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
  return data
}

export async function deletePayment(id: string) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('payments')
    .select('status')
    .eq('id', id)
    .eq('club_id', clubId)
    .maybeSingle()

  if (existing?.status === 'paid') {
    throw new Error('No se puede eliminar un pago ya confirmado como pagado.')
  }

  const { error } = await supabase
    .from('payments').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
}

/**
 * Confirm a transfer payment: mark as paid and activate the subscription.
 * The payment_method is forced to 'transfer'.
 */
export async function confirmTransferPayment(paymentId: string, paidAt?: string) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, athlete_id, plan_id, period_start, period_end')
    .eq('id', paymentId)
    .eq('club_id', clubId)
    .single()

  if (paymentError || !payment) throw new Error('Pago no encontrado')

  const paidAtDate = paidAt ? new Date(`${paidAt}T12:00:00`) : new Date()

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: paidAtDate.toISOString(),
      payment_method: 'transfer',
    })
    .eq('id', paymentId)
    .eq('club_id', clubId)

  if (updateError) throw new Error(updateError.message)

  if (payment.plan_id && payment.athlete_id) {
    await activateSubscriptionForPaidPayment(supabase, clubId, payment, paidAtDate, 'transfer')
    revalidatePath('/dashboard/subscriptions')
    revalidatePath('/dashboard/athletes')
    revalidatePath(`/dashboard/athletes/${payment.athlete_id}`)
    revalidatePath('/dashboard/athlete')
  }

  revalidatePath('/dashboard/payments')
  return { success: true }
}

/**
 * Bulk mark multiple payments as paid.
 * For each payment linked to a plan, also activates the subscription.
 */
export async function bulkMarkAsPaid(ids: string[], method = 'manual') {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Fetch affected payments so we can activate subscriptions
  const { data: payments, error: fetchError } = await supabase
    .from('payments')
    .select('id, athlete_id, plan_id, period_start, period_end, payment_method')
    .in('id', ids)
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])

  if (fetchError) throw new Error(fetchError.message)

  // Las pasarelas (Flow/MercadoPago/etc.) se confirman automáticamente; se excluyen de la
  // confirmación manual masiva.
  const eligible = (payments ?? []).filter(
    (p) => !p.payment_method || !(ONLINE_GATEWAY_IDS as readonly string[]).includes(p.payment_method),
  )
  const eligibleIds = eligible.map((p) => p.id)
  if (eligibleIds.length === 0) return 0

  const paidAtDate = new Date()

  // Update all eligible payments in one query
  const { error, count } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: paidAtDate.toISOString(),
      payment_method: method,
    })
    .in('id', eligibleIds)
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])

  if (error) throw new Error(error.message)

  // Activate subscriptions for each payment that has a plan
  const withPlan = eligible.filter((p) => p.plan_id)
  for (const p of withPlan) {
    await activateSubscriptionForPaidPayment(supabase, clubId, p, paidAtDate, method)
  }

  if (withPlan.length > 0) {
    revalidatePath('/dashboard/subscriptions')
    revalidatePath('/dashboard/athletes')
    revalidatePath('/dashboard/athlete')
  }

  revalidatePath('/dashboard/payments')
  return count ?? 0
}

/**
 * Sync overdue status: mark all pending payments past their due_date as overdue.
 * Call this from an admin action or a scheduled route to keep statuses current.
 * Returns the number of payments updated.
 */
export async function syncOverduePayments() {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = todayYmd()

  const gatewayFilter = ONLINE_GATEWAY_IDS.join(',')
  const { error, count } = await supabase
    .from('payments')
    .update({ status: 'overdue' })
    .eq('club_id', clubId)
    .eq('status', 'pending')
    .lt('due_date', today)
    .or(`payment_method.is.null,payment_method.not.in.(${gatewayFilter})`)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/athlete/payments')
  return count ?? 0
}

/**
 * Genera una URL firmada (temporal) para ver un comprobante de transferencia del bucket PRIVADO
 * `payment-receipts`. Solo admins del club, y solo para comprobantes que pertenecen a su club
 * (la ruta empieza con `<clubId>/`). Acepta rutas nuevas o URLs públicas legacy (extrae la ruta).
 */
export async function getReceiptSignedUrl(ref: string): Promise<string | null> {
  const role = await getClubMembershipRole()
  if (role !== 'admin' && role !== 'admin_athlete') return null

  const clubId = await getClubId()
  const supabase = createAdminClient()

  let path = (ref ?? '').trim()
  const marker = '/payment-receipts/'
  const idx = path.indexOf(marker)
  if (idx >= 0) path = path.slice(idx + marker.length) // URL pública legacy → ruta interna
  path = path.split('?')[0] // descarta querystring (URLs firmadas/públicas)
  if (!path || !path.startsWith(`${clubId}/`)) return null // aislamiento por club

  const { data, error } = await supabase.storage
    .from('payment-receipts')
    .createSignedUrl(path, 60 * 10) // 10 minutos
  if (error || !data) return null
  return data.signedUrl
}
