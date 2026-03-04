'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const subscriptionSchema = z.object({
  athlete_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: z.enum(['active', 'paused', 'cancelled', 'expired']).default('active'),
  start_date: z.string().min(1),
  end_date: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  auto_renew: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

export type SubscriptionInput = z.infer<typeof subscriptionSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getSubscriptions(params?: {
  status?: string
  athleteId?: string
  planId?: string
  search?: string
  expiringIn?: number
  page?: number
  limit?: number
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const page = params?.page ?? 1
  const limit = params?.limit ?? 25
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('subscriptions')
    .select('*, athletes(id, name, email, photo_url, health_status, status), plans(id, name, price, billing_cycle), payments(id, paid_at, status, amount)', { count: 'exact' })
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.status)    query = query.eq('status', params.status)
  if (params?.athleteId) query = query.eq('athlete_id', params.athleteId)
  if (params?.planId)    query = query.eq('plan_id', params.planId)
  if (params?.search)    query = query.ilike('athletes.name', `%${params.search}%`)
  if (params?.expiringIn) {
    const today = new Date().toISOString().split('T')[0]
    const future = new Date()
    future.setDate(future.getDate() + params.expiringIn)
    const futureStr = future.toISOString().split('T')[0]
    query = query.gte('end_date', today).lte('end_date', futureStr).eq('status', 'active')
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { subscriptions: data ?? [], total: count ?? 0 }
}

export async function createSubscription(input: SubscriptionInput) {
  const clubId = await getClubId()
  const parsed = subscriptionSchema.parse(input)
  const supabase = createAdminClient()

  // Deactivate any existing active subscription for this athlete
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('club_id', clubId)
    .eq('athlete_id', parsed.athlete_id)
    .eq('status', 'active')

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ ...parsed, club_id: clubId })
    .select('*, athletes(id, name), plans(id, name, price, billing_cycle)')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/subscriptions')
  revalidatePath(`/dashboard/athletes/${parsed.athlete_id}`)
  return data
}

export async function renewSubscription(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('athlete_id, plan_id, payment_method, auto_renew, plans(billing_cycle)')
    .eq('id', id).eq('club_id', clubId).single()
  if (fetchErr || !existing) throw new Error('Suscripción no encontrada')

  const startDate = new Date()
  const startStr = startDate.toISOString().split('T')[0]
  const plansData = existing.plans as unknown as { billing_cycle: string } | null
  const billingCycle = plansData?.billing_cycle ?? 'monthly'

  const CYCLE_DAYS: Record<string, number> = {
    monthly: 30, quarterly: 90, semiannual: 180, annual: 365, single: 0,
  }
  const days = CYCLE_DAYS[billingCycle] ?? 30
  let endStr: string | null = null
  if (days > 0) {
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + days)
    endStr = endDate.toISOString().split('T')[0]
  }

  const { data, error } = await supabase.from('subscriptions').insert({
    club_id: clubId,
    athlete_id: existing.athlete_id,
    plan_id: existing.plan_id,
    status: 'active',
    start_date: startStr,
    end_date: endStr,
    payment_method: existing.payment_method,
    auto_renew: existing.auto_renew,
  }).select().single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/subscriptions')
  revalidatePath(`/dashboard/athletes/${existing.athlete_id}`)
  return data
}

export async function updateSubscriptionStatus(
  id: string,
  status: 'active' | 'paused' | 'cancelled' | 'expired'
) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/subscriptions')
  return data
}

export async function getSubscriptionStats() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, plans(price, billing_cycle)')
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)

  const stats = { active: 0, paused: 0, cancelled: 0, expired: 0, mrr: 0 }
  for (const s of data ?? []) {
    const st = s.status as keyof typeof stats
    if (st in stats) (stats[st] as number)++
    if (s.status === 'active') {
      const planRaw = s.plans as unknown
      const plan = planRaw as { price: number; billing_cycle: string } | null
      if (plan) {
        const price = Number(plan.price)
        if (plan.billing_cycle === 'monthly')    stats.mrr += price
        else if (plan.billing_cycle === 'quarterly')  stats.mrr += price / 3
        else if (plan.billing_cycle === 'semiannual') stats.mrr += price / 6
        else if (plan.billing_cycle === 'annual')     stats.mrr += price / 12
        else stats.mrr += price
      }
    }
  }
  return stats
}
