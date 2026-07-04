'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId, assertClubCapability } from '@/lib/actions/club-context'
import {
  calculatePeriodEnd,
  calculateNextPeriodStart,
  getBillingAnchorDay,
  todayYmd,
  ymdFromDate,
  type BillingCycle,
} from '@/lib/billing-utils'
import { cancelPriorSubscriptions } from '@/lib/subscription-activation'

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

  const athleteSelect = params?.search
    ? 'athletes!inner(id, name, email, photo_url, health_status, status)'
    : 'athletes(id, name, email, photo_url, health_status, status)'

  let query = supabase
    .from('subscriptions')
    .select(`*, ${athleteSelect}, plans(id, name, price, billing_cycle), payments(id, paid_at, status, amount)`, { count: 'exact' })
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
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const parsed = subscriptionSchema.parse(input)
  const supabase = createAdminClient()

  await cancelPriorSubscriptions(supabase, clubId, parsed.athlete_id)

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
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('athlete_id, plan_id, payment_method, auto_renew, plans(billing_cycle)')
    .eq('id', id).eq('club_id', clubId).single()
  if (fetchErr || !existing) throw new Error('Suscripción no encontrada')

  const startDate = new Date()
  const startStr = todayYmd()
  const plansData = existing.plans as unknown as { billing_cycle: string } | null
  const billingCycle = (plansData?.billing_cycle ?? 'monthly') as BillingCycle

  const periodEnd = calculatePeriodEnd(startDate, billingCycle)
  const endStr = periodEnd ? ymdFromDate(periodEnd) : null
  const anchorDay = getBillingAnchorDay(startDate)
  const nextStart = calculateNextPeriodStart(startDate, billingCycle)
  const nextBillingStr = nextStart ? ymdFromDate(nextStart) : null

  await cancelPriorSubscriptions(supabase, clubId, existing.athlete_id, id)

  const { data, error } = await supabase.from('subscriptions').insert({
    club_id: clubId,
    athlete_id: existing.athlete_id,
    plan_id: existing.plan_id,
    status: 'active',
    start_date: startStr,
    end_date: endStr,
    payment_method: existing.payment_method,
    auto_renew: existing.auto_renew,
    billing_anchor_day: anchorDay,
    current_period_start: startStr,
    current_period_end: endStr,
    next_billing_date: nextBillingStr,
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
  await assertClubCapability('finances')
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

/** Ajuste manual de vigencia (fin de suscripción y fin del periodo facturado actual). */
export async function updateSubscriptionDates(
  id: string,
  input: { end_date?: string | null; current_period_end?: string | null }
) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const updateRow: Record<string, unknown> = {}
  if (input.end_date !== undefined) updateRow.end_date = input.end_date
  if (input.current_period_end !== undefined) updateRow.current_period_end = input.current_period_end

  if (Object.keys(updateRow).length === 0) {
    throw new Error('No hay cambios')
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update(updateRow)
    .eq('id', id)
    .eq('club_id', clubId)
    .select('athlete_id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/subscriptions')
  revalidatePath('/dashboard/athlete')
  if (data?.athlete_id) {
    revalidatePath(`/dashboard/athletes/${data.athlete_id as string}`)
  }
  return data
}

export async function getSubscriptionStats() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, athlete_id, plans(price, billing_cycle)')
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)

  const stats = { active: 0, paused: 0, cancelled: 0, expired: 0, mrr: 0 }
  const mrrAthletes = new Set<string>()
  for (const s of data ?? []) {
    const st = s.status as keyof typeof stats
    if (st in stats) (stats[st] as number)++
    if (s.status === 'active') {
      const athleteId = s.athlete_id as string
      if (!athleteId || mrrAthletes.has(athleteId)) continue
      mrrAthletes.add(athleteId)

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
