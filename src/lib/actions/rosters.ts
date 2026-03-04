'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).limit(1).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function createRoster(params: {
  competitionId: string
  name: string
  matchDate: string
  opponent?: string | null
  venue?: string | null
  matchId?: string | null
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('rosters').insert({
    competition_id: params.competitionId,
    club_id: clubId,
    name: params.name,
    match_date: params.matchDate,
    opponent: params.opponent ?? null,
    venue: params.venue ?? null,
  }).select().single()
  if (error) throw new Error(error.message)

  if (params.matchId && data?.id) {
    await supabase.from('matches').update({ roster_id: data.id }).eq('id', params.matchId).eq('club_id', clubId)
  }

  revalidatePath(`/dashboard/competitions/${params.competitionId}`)
  return data
}

export async function deleteRoster(rosterId: string, competitionId: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
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
  const supabase = createAdminClient()

  const { data: roster } = await supabase
    .from('rosters').select('id').eq('id', params.rosterId).eq('club_id', clubId).single()
  if (!roster) throw new Error('Nómina no encontrada')

  const { data: existing } = await supabase
    .from('roster_athletes').select('id').eq('roster_id', params.rosterId).eq('athlete_id', params.athleteId).single()
  if (existing) throw new Error('El atleta ya está en esta nómina')

  // Validate no duplicate jersey number within the same roster
  if (params.number != null) {
    const { data: numConflict } = await supabase
      .from('roster_athletes')
      .select('id, athletes(name)')
      .eq('roster_id', params.rosterId)
      .eq('number', params.number)
      .maybeSingle()
    if (numConflict) {
      const takenBy = (numConflict.athletes as unknown as { name: string } | null)?.name ?? 'otro jugador'
      throw new Error(`El número #${params.number} ya está asignado a ${takenBy} en esta nómina.`)
    }
  }

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
  const supabase = createAdminClient()
  const { error } = await supabase.from('roster_athletes').delete().eq('id', params.rosterAthleteId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/competitions/${params.competitionId}`)
}

export async function updateRosterScore(params: {
  rosterId: string
  competitionId: string
  homeScore: number
  awayScore: number
  status: 'upcoming' | 'live' | 'finished'
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const scoreData = JSON.stringify({ home: params.homeScore, away: params.awayScore, status: params.status, updatedAt: new Date().toISOString() })
  const { error } = await supabase
    .from('rosters')
    .update({ notes: scoreData })
    .eq('id', params.rosterId)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/competitions/${params.competitionId}`)
  revalidatePath('/dashboard/rosters')
}

export async function getAthletesSemaforo() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const [athletesRes, overdueRes] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, name, health_status, jersey_number, category')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('payments')
      .select('athlete_id')
      .eq('club_id', clubId)
      .eq('status', 'overdue'),
  ])

  const overdueIds = new Set((overdueRes.data ?? []).map((p) => p.athlete_id))
  return (athletesRes.data ?? []).map((a) => {
    const semaforo: 'green' | 'yellow' | 'red' =
      a.health_status === 'injured' || overdueIds.has(a.id) ? 'red' :
      a.health_status === 'observation' ? 'yellow' : 'green'
    return {
      id: a.id,
      name: a.name,
      health_status: a.health_status as string,
      semaforo,
      jersey_number: (a as { jersey_number?: number | null }).jersey_number ?? null,
      category: (a as { category?: string }).category ?? 'General',
    }
  })
}

export async function getRostersHub() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = new Date().toISOString().split('T')[0]

  const [rostersRes, overdueRes] = await Promise.all([
    supabase
      .from('rosters')
      .select(`
        id, name, match_date, opponent, venue,
        competitions(id, name, type, status),
        roster_athletes(
          id, number, position, is_captain, status,
          athletes(id, name, health_status)
        )
      `)
      .eq('club_id', clubId)
      .gte('match_date', today)
      .order('match_date', { ascending: true })
      .limit(30),

    supabase
      .from('payments')
      .select('athlete_id')
      .eq('club_id', clubId)
      .eq('status', 'overdue'),
  ])

  const overdueIds = new Set((overdueRes.data ?? []).map((p) => p.athlete_id))

  return (rostersRes.data ?? []).map((r) => {
    type RA = { id: string; number: number | null; position: string | null; is_captain: boolean; status: string; athletes: { id: string; name: string; health_status: string } | null }
    const athletes = (r.roster_athletes as unknown as RA[]) ?? []
    const withSem = athletes.map((ra) => {
      const a = ra.athletes
      const semaforo: 'green' | 'yellow' | 'red' = !a ? 'green' :
        a.health_status === 'injured' || overdueIds.has(a.id) ? 'red' :
        a.health_status === 'observation' ? 'yellow' : 'green'
      return { ...ra, semaforo }
    })
    type CompRaw = { id: string; name: string; type: string; status: string }
    const comp = (r.competitions as unknown as CompRaw | CompRaw[] | null)
    const competition = Array.isArray(comp) ? comp[0] ?? null : comp
    return {
      id: r.id,
      name: r.name,
      match_date: r.match_date as string,
      opponent: r.opponent as string | null,
      venue: r.venue as string | null,
      competition,
      athletes: withSem,
    }
  })
}
