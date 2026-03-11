'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId } from '@/lib/actions/club-context'

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
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const page = params?.page ?? 1
  const limit = params?.limit ?? 25
  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  let query = supabase
    .from('payments')
    .select('*, athletes(id, name, photo_url), plans(id, name)', { count: 'exact' })
    .eq('club_id', clubId)
    .order('due_date', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (params?.status)    query = query.eq('status', params.status)
  if (params?.athleteId) query = query.eq('athlete_id', params.athleteId)
  if (params?.search)    query = query.ilike('concept', `%${params.search}%`)
  if (params?.from)      query = query.gte('due_date', params.from)
  if (params?.to)        query = query.lte('due_date', params.to)
  if (params?.amountMin != null) query = query.gte('amount', params.amountMin)
  if (params?.amountMax != null) query = query.lte('amount', params.amountMax)
  if (params?.paymentMethod)     query = query.eq('payment_method', params.paymentMethod)
  if (params?.athleteName) {
    const { data: athlData } = await supabase
      .from('athletes').select('id').eq('club_id', clubId)
      .ilike('name', `%${params.athleteName}%`)
    const ids = (athlData ?? []).map((a) => a.id)
    if (ids.length === 0) return { payments: [], total: 0 }
    query = query.in('athlete_id', ids)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { payments: data ?? [], total: count ?? 0 }
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
    if (p.status === 'paid') summary.total_collected += Number(p.amount)
    if (p.status === 'pending') summary.total_pending += Number(p.amount)
    if (p.status === 'overdue') {
      summary.total_overdue += Number(p.amount)
      summary.count_overdue++
    }
  }

  return summary
}

export async function createPayment(input: PaymentInput) {
  const clubId = await getClubId()
  const parsed = paymentSchema.parse(input)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('payments')
    .insert({ ...parsed, club_id: clubId })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Auto-create subscription if payment is paid and linked to a plan
  if (parsed.status === 'paid' && parsed.plan_id) {
    // Fetch plan details to get billing_cycle
    const { data: plan } = await supabase
      .from('plans')
      .select('billing_cycle')
      .eq('id', parsed.plan_id)
      .single()

    if (plan) {
      const CYCLE_DAYS: Record<string, number> = {
        monthly: 30,
        quarterly: 90,
        semiannual: 180,
        annual: 365,
        single: 0,
      }

      const startDate = parsed.paid_at ? new Date(parsed.paid_at) : new Date()
      const startStr = startDate.toISOString().split('T')[0]
      const days = CYCLE_DAYS[plan.billing_cycle] ?? 30
      let endStr: string | null = null

      if (days > 0) {
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + days)
        endStr = endDate.toISOString().split('T')[0]
      }

      // Cancel any existing active subscriptions for this athlete
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('club_id', clubId)
        .eq('athlete_id', parsed.athlete_id)
        .eq('status', 'active')

      // Create new subscription
      await supabase.from('subscriptions').insert({
        club_id: clubId,
        athlete_id: parsed.athlete_id,
        plan_id: parsed.plan_id,
        status: 'active',
        start_date: startStr,
        end_date: endStr,
        payment_method: parsed.payment_method,
        auto_renew: true,
      })

      // Update athlete status to active when creating an active subscription
      await supabase
        .from('athletes')
        .update({ status: 'active' })
        .eq('id', parsed.athlete_id)
        .eq('club_id', clubId)

      revalidatePath('/dashboard/subscriptions')
      revalidatePath('/dashboard/athletes')
    }
  }

  revalidatePath('/dashboard/payments')
  revalidatePath(`/dashboard/athletes/${parsed.athlete_id}`)
  return data
}

export async function markAsPaid(id: string, method: string, paidAt?: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
      payment_method: method,
    })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
  return data
}

export async function updatePayment(id: string, input: { concept?: string; amount?: number; due_date?: string; notes?: string | null; type?: string; payment_method?: string | null }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  const { error } = await supabase.from('payments')
    .update(safeUpdate)
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
}

export async function updatePaymentStatus(
  id: string,
  status: 'pending' | 'paid' | 'overdue' | 'failed' | 'cancelled'
) {
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
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('payments').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
}

export async function bulkMarkAsPaid(ids: string[], method = 'manual') {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error, count } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: method,
    })
    .in('id', ids)
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
  return count ?? 0
}
