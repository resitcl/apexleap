'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const categorySchema = z.object({
  name:        z.string().min(1, 'El nombre es obligatorio'),
  color:       z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sort_order:  z.coerce.number().int().default(0),
  is_active:   z.boolean().default(true),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type ClubCategory = CategoryInput & { id: string; club_id: string; created_at: string }

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).limit(1).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getCategories(activeOnly = false) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  let query = supabase
    .from('club_categories')
    .select('*')
    .eq('club_id', clubId)
    .order('sort_order')
    .order('name')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ClubCategory[]
}

export async function createCategory(input: CategoryInput) {
  const clubId = await getClubId()
  const parsed = categorySchema.parse(input)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('club_categories')
    .insert({ ...parsed, club_id: clubId })
    .select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
  return data
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('club_categories')
    .update(input)
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function deleteCategory(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('club_categories')
    .delete()
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}
