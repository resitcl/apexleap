'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'
import { z } from 'zod'

const docSchema = z.object({
  name: z.string().min(2),
  category: z.enum(['medical', 'authorization', 'institutional', 'other']),
  athlete_id: z.string().uuid().optional().nullable(),
  file_url: z.string().url().optional().nullable(),
  status: z.enum(['pending', 'approved', 'expired', 'rejected']).default('pending'),
  expiry_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type DocInput = z.infer<typeof docSchema>


export async function getDocuments(filters?: { category?: string; athleteId?: string; status?: string; search?: string }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  let q = supabase.from('documents').select('*, athletes(id, name)').eq('club_id', clubId)
  if (filters?.category) q = q.eq('category', filters.category)
  if (filters?.athleteId) q = q.eq('athlete_id', filters.athleteId)
  if (filters?.status) q = q.eq('status', filters.status)
  if (filters?.search) q = q.ilike('name', `%${filters.search}%`)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createDocument(input: DocInput) {
  const clubId = await getClubId()
  const { userId } = await auth()
  const parsed = docSchema.parse(input)
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('documents').insert({
    ...parsed,
    club_id: clubId,
    uploaded_by: userId,
  }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/documents')
  return data
}

export async function updateDocument(id: string, input: { name?: string; category?: string; expiry_date?: string | null; status?: string; notes?: string | null }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  const { error } = await supabase.from('documents')
    .update(safeUpdate)
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/documents')
}

export async function assignDocumentAthlete(id: string, athleteId: string | null) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('documents')
    .update({ athlete_id: athleteId })
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/documents')
}

export async function updateDocumentStatus(id: string, status: 'pending' | 'approved' | 'expired' | 'rejected') {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('documents')
    .update({ status })
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/documents')
}

export async function deleteDocument(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('documents').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/documents')
}
