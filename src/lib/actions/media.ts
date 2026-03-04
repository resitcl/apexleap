'use server'

/**
 * Media Hub — requires table: media_items
 * Schema:
 *   id uuid primary key default gen_random_uuid(),
 *   club_id uuid references clubs(id),
 *   title text not null,
 *   type text check (type in ('video','photo','document')),
 *   category text check (category in ('match','highlight','training','photo','other')),
 *   url text not null,
 *   thumbnail_url text,
 *   description text,
 *   is_public boolean default false,
 *   created_by text,
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 */

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId } from '@/lib/actions/club-context'

const mediaSchema = z.object({
  title:         z.string().min(2),
  type:          z.enum(['video', 'photo', 'document']).default('video'),
  category:      z.enum(['match', 'highlight', 'training', 'photo', 'other']).default('other'),
  url:           z.string().url('URL inválida'),
  thumbnail_url: z.string().url().optional().nullable(),
  description:   z.string().optional().nullable(),
  is_public:     z.boolean().default(false),
})

export type MediaInput = z.infer<typeof mediaSchema>


export async function getMediaItems(params?: {
  type?: string
  category?: string
  search?: string
  page?: number
  limit?: number
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const page = params?.page ?? 1
  const limit = params?.limit ?? 24
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('media_items')
    .select('*', { count: 'exact' })
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.type)     query = query.eq('type', params.type)
  if (params?.category) query = query.eq('category', params.category)
  if (params?.search)   query = query.ilike('title', `%${params.search}%`)

  const { data, error, count } = await query
  if (error) {
    if (error.code === '42P01') return { items: [], total: 0, tableExists: false }
    throw new Error(error.message)
  }
  return { items: data ?? [], total: count ?? 0, tableExists: true }
}

export async function createMediaItem(input: MediaInput) {
  const clubId = await getClubId()
  const { userId } = await auth()
  const parsed = mediaSchema.parse(input)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('media_items')
    .insert({ ...parsed, club_id: clubId, created_by: userId ?? null })
    .select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/media')
  return data
}

export async function deleteMediaItem(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('media_items').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/media')
}

export async function getMediaStats() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('media_items').select('type, category').eq('club_id', clubId)
  if (error) return null
  const items = data ?? []
  return {
    total:     items.length,
    videos:    items.filter((i) => i.type === 'video').length,
    photos:    items.filter((i) => i.type === 'photo').length,
    matches:   items.filter((i) => i.category === 'match').length,
    highlights:items.filter((i) => i.category === 'highlight').length,
  }
}
