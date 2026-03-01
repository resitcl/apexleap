'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const itemSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['equipment', 'uniform', 'infrastructure', 'other']),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(0).default(1),
  quantity_min: z.coerce.number().int().min(0).default(0),
  condition: z.enum(['good', 'fair', 'poor', 'broken']).default('good'),
  assigned_to: z.string().uuid().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  purchase_price: z.coerce.number().min(0).optional().nullable(),
  serial_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

export type ItemInput = z.infer<typeof itemSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getInventoryItems(filters?: { category?: string; condition?: string; lowStock?: boolean; search?: string }) {
  const clubId = await getClubId()
  const supabase = await createClient()
  let q = supabase
    .from('inventory_items')
    .select('*, athletes(id, name)')
    .eq('club_id', clubId)
  if (filters?.category)  q = q.eq('category', filters.category)
  if (filters?.condition) q = q.eq('condition', filters.condition)
  if (filters?.lowStock)  q = q.filter('quantity', 'lte', 'quantity_min').gt('quantity_min', 0)
  if (filters?.search)    q = q.ilike('name', `%${filters.search}%`)
  const { data, error } = await q.order('category').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createInventoryItem(input: ItemInput) {
  const clubId = await getClubId()
  const parsed = itemSchema.parse(input)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_items').insert({ ...parsed, club_id: clubId }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/inventory')
  return data
}

export async function updateInventoryItem(id: string, input: Partial<ItemInput>) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory_items')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id).eq('club_id', clubId).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/inventory')
  return data
}

export async function deleteInventoryItem(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { error } = await supabase
    .from('inventory_items').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/inventory')
}
