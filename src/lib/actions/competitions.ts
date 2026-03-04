'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const competitionSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['tournament', 'league', 'friendly', 'championship']).default('tournament'),
  sport: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  status: z.enum(['upcoming', 'active', 'finished', 'cancelled']).default('upcoming'),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  season_id:   z.string().uuid().optional().nullable(),
})

export type CompetitionInput = z.infer<typeof competitionSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).limit(1).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getCompetitions(params?: { status?: string; search?: string; type?: string; seasonId?: string; page?: number; limit?: number }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  let query = supabase
    .from('competitions')
    .select('*, rosters(id, name, roster_athletes(id, athletes(id, name)))', { count: 'exact' })
    .eq('club_id', clubId)
    .order('start_date', { ascending: false })
    .range(from, to)
  if (params?.status)   query = query.eq('status', params.status)
  if (params?.search)   query = query.ilike('name', `%${params.search}%`)
  if (params?.type)     query = query.eq('type', params.type)
  if (params?.seasonId) query = query.eq('season_id', params.seasonId)
  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { competitions: data ?? [], total: count ?? 0 }
}

export async function createCompetition(input: CompetitionInput) {
  const clubId = await getClubId()
  const parsed = competitionSchema.parse(input)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('competitions').insert({ ...parsed, club_id: clubId }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
  return data
}

export async function updateCompetition(id: string, input: Partial<CompetitionInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  const { error } = await supabase.from('competitions')
    .update(safeUpdate)
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
  revalidatePath(`/dashboard/competitions/${id}`)
}

export async function updateCompetitionStatus(id: string, status: CompetitionInput['status']) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('competitions')
    .update({ status })
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
}

export async function deleteCompetition(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('competitions').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
}
