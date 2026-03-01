'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function createRoster(params: {
  competitionId: string
  name: string
  matchDate: string
  opponent?: string | null
  venue?: string | null
}) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { data, error } = await supabase.from('rosters').insert({
    competition_id: params.competitionId,
    club_id: clubId,
    name: params.name,
    match_date: params.matchDate,
    opponent: params.opponent ?? null,
    venue: params.venue ?? null,
  }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/competitions/${params.competitionId}`)
  return data
}

export async function deleteRoster(rosterId: string, competitionId: string) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { error } = await supabase.from('rosters').delete()
    .eq('id', rosterId).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/competitions/${competitionId}`)
}

export async function addAthleteToRoster(params: {
  rosterId: string
  competitionId: string
  athleteId: string
  number?: number | null
  position?: string | null
  isCaptain?: boolean
}) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data: roster } = await supabase
    .from('rosters').select('id').eq('id', params.rosterId).eq('club_id', clubId).single()
  if (!roster) throw new Error('Nómina no encontrada')

  const { data: existing } = await supabase
    .from('roster_athletes').select('id').eq('roster_id', params.rosterId).eq('athlete_id', params.athleteId).single()
  if (existing) throw new Error('El atleta ya está en esta nómina')

  const { error } = await supabase.from('roster_athletes').insert({
    roster_id: params.rosterId,
    athlete_id: params.athleteId,
    number: params.number ?? null,
    position: params.position ?? null,
    is_captain: params.isCaptain ?? false,
    status: 'confirmed',
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/competitions/${params.competitionId}`)
}

export async function removeAthleteFromRoster(params: {
  rosterAthleteId: string
  competitionId: string
}) {
  await getClubId()
  const supabase = await createClient()
  const { error } = await supabase.from('roster_athletes').delete().eq('id', params.rosterAthleteId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/competitions/${params.competitionId}`)
}
