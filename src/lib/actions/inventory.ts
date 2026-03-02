'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
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
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getInventoryItems(filters?: { category?: string; condition?: string; lowStock?: boolean; search?: string; page?: number; limit?: number; athleteId?: string; priceMin?: number; priceMax?: number }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const page  = filters?.page  ?? 1
  const limit = filters?.limit ?? 50
  const from  = (page - 1) * limit
  const to    = from + limit - 1
  let q = supabase
    .from('inventory_items')
    .select('*, athletes(id, name, status)', { count: 'exact' })
    .eq('club_id', clubId)
  if (filters?.category)  q = q.eq('category', filters.category)
  if (filters?.condition) q = q.eq('condition', filters.condition)
  if (filters?.lowStock)  q = q.filter('quantity', 'lte', 'quantity_min').gt('quantity_min', 0)
  if (filters?.search)    q = q.ilike('name', `%${filters.search}%`)
  if (filters?.athleteId) q = q.eq('assigned_to', filters.athleteId)
  if (filters?.priceMin != null) q = q.gte('purchase_price', filters.priceMin)
  if (filters?.priceMax != null) q = q.lte('purchase_price', filters.priceMax)
  const { data, error, count } = await q.order('category').order('name').range(from, to)
  if (error) throw new Error(error.message)
  return { items: data ?? [], total: count ?? 0 }
}

export async function createInventoryItem(input: ItemInput) {
  const clubId = await getClubId()
  const parsed = itemSchema.parse(input)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('inventory_items').insert({ ...parsed, club_id: clubId }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/inventory')
  return data
}

export async function updateInventoryItem(id: string, input: Partial<ItemInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('inventory_items').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/inventory')
}
