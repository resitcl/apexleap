'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const planSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  enrollment_fee: z.coerce.number().min(0).default(0),
  billing_cycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'single']).default('monthly'),
  session_limit: z.coerce.number().int().positive().optional().nullable(),
  multi_sede: z.boolean().default(false),
  content_level: z.string().optional().nullable(),
  grace_period_days: z.coerce.number().int().min(0).default(3),
  is_visible: z.boolean().default(true),
  is_active: z.boolean().default(true),
})

export type PlanInput = z.infer<typeof planSchema>

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

export async function getPlans() {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plans')
    .select('*, subscriptions(id, status, athletes(id, name))')
    .eq('club_id', clubId)
    .order('price', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPlanById(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plans')
    .select('*, subscriptions(id, status, athlete_id, athletes(name))')
    .eq('id', id)
    .eq('club_id', clubId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createPlan(input: PlanInput) {
  const clubId = await getClubId()
  const parsed = planSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plans')
    .insert({ ...parsed, club_id: clubId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/plans')
  return data
}

export async function updatePlan(id: string, input: Partial<PlanInput>) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plans')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/plans')
  revalidatePath(`/dashboard/plans/${id}`)
  return data
}

export async function deletePlan(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/plans')
}
