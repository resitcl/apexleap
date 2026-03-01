'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

export async function getRules() {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('club_id', clubId)
    .order('type', { ascending: true })
    .order('severity', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createRule(input: RuleInput) {
  const clubId = await getClubId()
  const parsed = ruleSchema.parse(input)
  const supabase = await createClient()

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
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('rules')
    .update({ ...input, updated_at: new Date().toISOString() })
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
  const supabase = await createClient()

  const { error } = await supabase
    .from('rules')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/rules')
}
