'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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
})

export type CompetitionInput = z.infer<typeof competitionSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getCompetitions() {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competitions')
    .select('*, rosters(id)')
    .eq('club_id', clubId)
    .order('start_date', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCompetition(input: CompetitionInput) {
  const clubId = await getClubId()
  const parsed = competitionSchema.parse(input)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('competitions').insert({ ...parsed, club_id: clubId }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
  return data
}

export async function updateCompetitionStatus(id: string, status: CompetitionInput['status']) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { error } = await supabase
    .from('competitions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
}

export async function deleteCompetition(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { error } = await supabase
    .from('competitions').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/competitions')
}
