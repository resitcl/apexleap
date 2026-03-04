'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId } from '@/lib/actions/club-context'

const ruleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  type: z.enum(['financial', 'attendance', 'discipline', 'documentation']),
  trigger_condition: z.record(z.unknown()),
  action: z.enum(['block', 'warn', 'notify']).default('block'),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  is_active: z.boolean().default(true),
})

export type RuleInput = z.infer<typeof ruleSchema>


export async function getRules(filters?: { type?: string }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  let q = supabase
    .from('rules')
    .select('*')
    .eq('club_id', clubId)
    .order('type', { ascending: true })
    .order('severity', { ascending: false })

  if (filters?.type) q = q.eq('type', filters.type)

  const { data, error } = await q

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createRule(input: RuleInput) {
  const clubId = await getClubId()
  const parsed = ruleSchema.parse(input)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('rules')
    .insert({ ...parsed, club_id: clubId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rules')
  return data
}

export async function updateRule(id: string, input: Partial<RuleInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  const { data, error } = await supabase
    .from('rules')
    .update(safeUpdate)
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rules')
  return data
}

export async function toggleRule(id: string, is_active: boolean) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('rules')
    .update({ is_active })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rules')
}

export async function getRuleLastTriggerDates() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const [overdueRes, attRes, docRes] = await Promise.all([
    supabase
      .from('payments')
      .select('updated_at')
      .eq('club_id', clubId)
      .eq('status', 'overdue')
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('attendance')
      .select('checked_in_at')
      .eq('club_id', clubId)
      .eq('is_valid', false)
      .order('checked_in_at', { ascending: false })
      .limit(1),
    supabase
      .from('documents')
      .select('updated_at')
      .eq('club_id', clubId)
      .eq('status', 'expired')
      .order('updated_at', { ascending: false })
      .limit(1),
  ])

  return {
    financial:     (overdueRes.data?.[0]?.updated_at  as string | undefined) ?? null,
    attendance:    (attRes.data?.[0]?.checked_in_at   as string | undefined) ?? null,
    documentation: (docRes.data?.[0]?.updated_at      as string | undefined) ?? null,
    discipline:    null as string | null,
  }
}

/**
 * Rule Exceptions — requires table: rule_exceptions
 * id uuid pk, club_id uuid, rule_id uuid, athlete_id uuid,
 * reason text, expires_at date, created_by text, created_at timestamptz
 */
export async function createRuleException(params: {
  ruleId: string
  athleteId: string
  reason: string
  expiresAt?: string | null
}) {
  const { userId } = await auth()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('rule_exceptions').insert({
    club_id: clubId,
    rule_id: params.ruleId,
    athlete_id: params.athleteId,
    reason: params.reason,
    expires_at: params.expiresAt ?? null,
    created_by: userId ?? null,
  })
  if (error) {
    if (error.code === '42P01') throw new Error('tabla_no_existe')
    throw new Error(error.message)
  }
  revalidatePath('/dashboard/rules')
  revalidatePath(`/dashboard/athletes/${params.athleteId}`)
}

export async function getRuleExceptions(athleteId?: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  let q = supabase
    .from('rule_exceptions')
    .select('*, rules(name, type), athletes(name)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
  if (athleteId) q = q.eq('athlete_id', athleteId)
  const { data, error } = await q
  if (error) return []
  return data ?? []
}

export async function deleteRuleException(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('rule_exceptions').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rules')
}

export async function getRuleAffectedCounts() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const expiringSoon = new Date()
  expiringSoon.setDate(expiringSoon.getDate() + 30)

  const [overdueRes, injuredRes, expiredDocsRes] = await Promise.all([
    supabase
      .from('payments')
      .select('athlete_id', { count: 'exact' })
      .eq('club_id', clubId)
      .eq('status', 'overdue'),
    supabase
      .from('athletes')
      .select('id', { count: 'exact' })
      .eq('club_id', clubId)
      .neq('health_status', 'healthy'),
    supabase
      .from('documents')
      .select('id', { count: 'exact' })
      .eq('club_id', clubId)
      .not('expires_at', 'is', null)
      .lte('expires_at', expiringSoon.toISOString().split('T')[0]),
  ])

  return {
    financial:     overdueRes.count     ?? 0,
    discipline:    injuredRes.count     ?? 0,
    documentation: expiredDocsRes.count ?? 0,
    attendance:    0,
  }
}
