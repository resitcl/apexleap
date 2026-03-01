'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getPayments(params?: {
  status?: string
  athleteId?: string
  page?: number
  limit?: number
  from?: string
  to?: string
}) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const page = params?.page ?? 1
  const limit = params?.limit ?? 25
  const rangeFrom = (page - 1) * limit
  const rangeTo = rangeFrom + limit - 1

  let query = supabase
    .from('payments')
    .select('*, athletes(id, name, photo_url)', { count: 'exact' })
    .eq('club_id', clubId)
    .order('due_date', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (params?.status) query = query.eq('status', params.status)
  if (params?.athleteId) query = query.eq('athlete_id', params.athleteId)
  if (params?.from) query = query.gte('due_date', params.from)
  if (params?.to)   query = query.lte('due_date', params.to)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { payments: data ?? [], total: count ?? 0 }
}

export async function getPaymentSummary() {
  const clubId = await getClubId()
  const supabase = await createClient()

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
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .insert({ ...parsed, club_id: clubId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
  revalidatePath(`/dashboard/athletes/${parsed.athlete_id}`)
  return data
}

export async function markAsPaid(id: string, method: string, paidAt?: string) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
      payment_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
  return data
}

export async function updatePaymentStatus(
  id: string,
  status: 'pending' | 'paid' | 'overdue' | 'failed' | 'cancelled'
) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .update({ status, updated_at: new Date().toISOString() })
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
  const supabase = await createClient()
  const { error } = await supabase
    .from('payments').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
}

export async function bulkMarkAsPaid(ids: string[], method = 'manual') {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { error, count } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: method,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/payments')
  return count ?? 0
}
