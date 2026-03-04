'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
const supplierSchema = z.object({
  name:           z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  rut:            z.string().optional().nullable(),
  bank_name:      z.string().optional().nullable(),
  account_type:   z.enum(['corriente', 'vista', 'ahorro', 'rut', 'otra']).optional().nullable(),
  account_number: z.string().optional().nullable(),
  email:          z.string().email('Email inválido').optional().or(z.literal('')).nullable(),
  phone:          z.string().optional().nullable(),
  category:       z.string().min(1).default('other'),
  notes:          z.string().optional().nullable(),
  is_active:      z.boolean().default(true),
})

export type SupplierInput = z.infer<typeof supplierSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).limit(1).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getSuppliers(params?: { search?: string; category?: string; activeOnly?: boolean }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  let query = supabase
    .from('suppliers')
    .select('*')
    .eq('club_id', clubId)
    .order('name')

  if (params?.activeOnly !== false) query = query.eq('is_active', true)
  if (params?.category)             query = query.eq('category', params.category)
  if (params?.search)               query = query.ilike('name', `%${params.search}%`)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createSupplier(input: SupplierInput) {
  const clubId = await getClubId()
  const parsed = supplierSchema.parse(input)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...parsed, club_id: clubId, email: parsed.email || null })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
  return data
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  const { error } = await supabase
    .from('suppliers')
    .update(safeUpdate)
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
}

export async function deleteSupplier(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
}
