'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const seasonSchema = z.object({
  name:        z.string().min(2),
  type:        z.enum(['apertura', 'clausura', 'pretemporada', 'other']),
  year:        z.number().int().min(2000).max(2100),
  start_date:  z.string(),
  end_date:    z.string(),
  description: z.string().optional().nullable(),
})

export type SeasonInput = z.infer<typeof seasonSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

// ─── Queries ──────────────────────────────────────────────────

export async function getSeasons(includeInactive = true) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  let query = supabase
    .from('club_seasons')
    .select('*')
    .eq('club_id', clubId)
    .order('year', { ascending: false })
    .order('type', { ascending: true })
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getActiveSeason() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('club_seasons')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .single()
  return data ?? null
}

// ─── CRUD ─────────────────────────────────────────────────────

export async function createSeason(input: SeasonInput) {
  const clubId = await getClubId()
  const parsed = seasonSchema.parse(input)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('club_seasons')
    .insert({ ...parsed, club_id: clubId, is_active: false })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
  revalidatePath('/dashboard/settings/seasons')
  return data
}

export async function updateSeason(id: string, input: Partial<SeasonInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('club_seasons')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
  revalidatePath('/dashboard/settings/seasons')
  return { ok: true }
}

export async function deleteSeason(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  // Check not active
  const { data: season } = await supabase.from('club_seasons').select('is_active').eq('id', id).single()
  if (season?.is_active) throw new Error('No puedes eliminar la temporada activa. Activa otra primero.')
  const { error } = await supabase.from('club_seasons').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings/seasons')
  return { ok: true }
}

export async function setActiveSeason(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  // Deactivate all, then activate selected
  await supabase.from('club_seasons').update({ is_active: false }).eq('club_id', clubId)
  const { error } = await supabase
    .from('club_seasons')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/competitions')
  revalidatePath('/dashboard/settings/seasons')
  return { ok: true }
}
