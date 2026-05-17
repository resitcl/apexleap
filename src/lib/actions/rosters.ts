'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, assertClubStaff } from '@/lib/actions/club-context'

function revalidateRosterRelatedPaths(competitionId?: string | null, matchId?: string | null) {
  const comp = competitionId?.trim() || null
  if (comp) revalidatePath(`/dashboard/competitions/${comp}`)
  revalidatePath('/dashboard/rosters')
  revalidatePath('/dashboard/matches')
  if (matchId) revalidatePath(`/dashboard/matches/${matchId}`)
}

export async function createRoster(params: {
  competitionId?: string | null
  name: string
  matchDate: string
  matchTime?: string | null
  opponent?: string | null
  venue?: string | null
  matchId?: string | null
}) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const matchTime = params.matchTime?.trim() ? params.matchTime.trim() : null
  const { data, error } = await supabase.from('rosters').insert({
    competition_id: params.competitionId ?? null,
    club_id: clubId,
    name: params.name,
    match_date: params.matchDate,
    match_time: matchTime,
    opponent: params.opponent ?? null,
    venue: params.venue ?? null,
  }).select().single()
  if (error) throw new Error(error.message)

  if (params.matchId && data?.id) {
    await supabase.from('matches').update({ roster_id: data.id }).eq('id', params.matchId).eq('club_id', clubId)
  }

  revalidateRosterRelatedPaths(params.competitionId ?? null, params.matchId ?? null)
  return data
}

/**
 * Partidos programados citables en una nómina: sin `roster_id` o el partido ya vinculado a `rosterId` (edición).
 */
export async function getScheduledMatchesForRosterLinking(options?: { rosterId?: string | null }) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: matches } = await supabase
    .from('matches')
    .select('id, opponent, match_date, match_time, location, roster_id, competition_id')
    .eq('club_id', clubId)
    .eq('status', 'scheduled')
    .order('match_date', { ascending: true })
    .limit(150)

  let linkedId: string | null = null
  if (options?.rosterId) {
    const { data: row } = await supabase
      .from('matches')
      .select('id')
      .eq('club_id', clubId)
      .eq('roster_id', options.rosterId)
      .maybeSingle()
    linkedId = row?.id ?? null
  }

  return (matches ?? []).filter((m) => !m.roster_id || m.id === linkedId)
}

export async function updateRoster(params: {
  rosterId: string
  competitionId: string | null
  name: string
  matchDate: string
  matchTime?: string | null
  opponent?: string | null
  venue?: string | null
  /** Partido a vincular; vacío desvincula el partido anterior. */
  matchId?: string | null
}) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: prevLink } = await supabase
    .from('matches')
    .select('id')
    .eq('roster_id', params.rosterId)
    .eq('club_id', clubId)
    .maybeSingle()
  const previousMatchId = prevLink?.id ?? null

  await supabase.from('matches').update({ roster_id: null }).eq('roster_id', params.rosterId).eq('club_id', clubId)

  const { error } = await supabase
    .from('rosters')
    .update({
      name: params.name,
      match_date: params.matchDate,
      match_time: params.matchTime?.trim() ? params.matchTime.trim() : null,
      opponent: params.opponent ?? null,
      venue: params.venue ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.rosterId)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)

  if (params.matchId) {
    const { error: linkErr } = await supabase
      .from('matches')
      .update({ roster_id: params.rosterId })
      .eq('id', params.matchId)
      .eq('club_id', clubId)
    if (linkErr) throw new Error(linkErr.message)
  }

  revalidateRosterRelatedPaths(params.competitionId, params.matchId ?? null)
  if (previousMatchId && previousMatchId !== (params.matchId ?? null)) {
    revalidatePath(`/dashboard/matches/${previousMatchId}`)
  }
  revalidatePath('/dashboard/rosters')
}

export async function deleteRoster(rosterId: string, competitionId?: string | null) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('rosters').delete()
    .eq('id', rosterId).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  const comp = competitionId?.trim() || null
  if (comp) revalidatePath(`/dashboard/competitions/${comp}`)
  revalidatePath('/dashboard/rosters')
  revalidatePath('/dashboard/matches')
}

export async function addAthleteToRoster(params: {
  rosterId: string
  competitionId: string | null
  athleteId: string
  number?: number | null
  position?: string | null
  isCaptain?: boolean
  /** true = titular (defecto), false = suplente / reserva */
  isStarter?: boolean
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
    is_starter: params.isStarter !== false,
    status: 'confirmed',
  })
  if (error) throw new Error(error.message)

  const { data: linkedMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('roster_id', params.rosterId)
    .eq('club_id', clubId)
    .maybeSingle()
  revalidateRosterRelatedPaths(params.competitionId, linkedMatch?.id ?? null)
}

export async function bulkAddAthletesToRoster(params: {
  rosterId: string
  competitionId: string | null
  athletes: Array<{
    athleteId: string
    isStarter?: boolean
    number?: number | null
    isCaptain?: boolean
  }>
}) {
  if (params.athletes.length === 0) return { inserted: 0 }
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: roster } = await supabase
    .from('rosters').select('id').eq('id', params.rosterId).eq('club_id', clubId).single()
  if (!roster) throw new Error('Nómina no encontrada')

  // Validate jersey number uniqueness within the incoming batch
  const seenNumbers = new Set<number>()
  for (const a of params.athletes) {
    if (a.number != null) {
      if (seenNumbers.has(a.number)) throw new Error(`Número de camiseta #${a.number} duplicado en la convocatoria`)
      seenNumbers.add(a.number)
    }
  }

  const rows = params.athletes.map((a) => ({
    roster_id: params.rosterId,
    athlete_id: a.athleteId,
    number: a.number ?? null,
    position: null,
    is_captain: a.isCaptain ?? false,
    is_starter: a.isStarter !== false,
    status: 'confirmed',
  }))

  const { error } = await supabase.from('roster_athletes').insert(rows)
  if (error) throw new Error(error.message)

  const { data: linkedMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('roster_id', params.rosterId)
    .eq('club_id', clubId)
    .maybeSingle()
  revalidateRosterRelatedPaths(params.competitionId, linkedMatch?.id ?? null)
  return { inserted: rows.length }
}

export async function updateRosterAthleteStarter(params: {
  rosterAthleteId: string
  rosterId: string
  competitionId: string | null
  isStarter: boolean
}) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: roster } = await supabase
    .from('rosters')
    .select('id')
    .eq('id', params.rosterId)
    .eq('club_id', clubId)
    .maybeSingle()
  if (!roster) throw new Error('Nómina no encontrada')

  const { data: row } = await supabase
    .from('roster_athletes')
    .select('id')
    .eq('id', params.rosterAthleteId)
    .eq('roster_id', params.rosterId)
    .maybeSingle()
  if (!row) throw new Error('Citación no encontrada')

  const { error } = await supabase
    .from('roster_athletes')
    .update({ is_starter: params.isStarter })
    .eq('id', params.rosterAthleteId)
  if (error) throw new Error(error.message)

  const { data: linkedMatch } = await supabase
    .from('matches')
    .select('id')
    .eq('roster_id', params.rosterId)
    .eq('club_id', clubId)
    .maybeSingle()
  revalidateRosterRelatedPaths(params.competitionId, linkedMatch?.id ?? null)
}

export async function removeAthleteFromRoster(params: {
  rosterAthleteId: string
  competitionId: string | null
  rosterId?: string | null
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  let rosterId = params.rosterId ?? null
  if (!rosterId) {
    const { data: row } = await supabase
      .from('roster_athletes')
      .select('roster_id')
      .eq('id', params.rosterAthleteId)
      .maybeSingle()
    rosterId = row?.roster_id ?? null
  }

  const { error } = await supabase.from('roster_athletes').delete().eq('id', params.rosterAthleteId)
  if (error) throw new Error(error.message)

  let matchId: string | null = null
  if (rosterId) {
    const { data: linkedMatch } = await supabase
      .from('matches')
      .select('id')
      .eq('roster_id', rosterId)
      .eq('club_id', clubId)
      .maybeSingle()
    matchId = linkedMatch?.id ?? null
  }
  revalidateRosterRelatedPaths(params.competitionId, matchId)
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

  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  
  const fromDate = sevenDaysAgo.toISOString().split('T')[0]

  const [rostersRes, overdueRes] = await Promise.all([
    supabase
      .from('rosters')
      .select(`
        id, name, match_date, match_time, opponent, venue, competition_id,
        competitions(id, name, type, status),
        roster_athletes(
          id, number, position, is_captain, is_starter, status,
          athletes(id, name, health_status)
        )
      `)
      .eq('club_id', clubId)
      .gte('match_date', fromDate)
      .order('match_date', { ascending: true })
      .limit(50),

    supabase
      .from('payments')
      .select('athlete_id')
      .eq('club_id', clubId)
      .eq('status', 'overdue'),
  ])

  const overdueIds = new Set((overdueRes.data ?? []).map((p) => p.athlete_id))
  const rows = rostersRes.data ?? []
  const rosterIds = rows.map((r) => r.id)
  let linkedByRoster = new Map<string, string>()
  if (rosterIds.length > 0) {
    const { data: linkRows } = await supabase
      .from('matches')
      .select('id, roster_id')
      .eq('club_id', clubId)
      .in('roster_id', rosterIds)
    for (const m of linkRows ?? []) {
      if (m.roster_id && !linkedByRoster.has(m.roster_id)) linkedByRoster.set(m.roster_id, m.id)
    }
  }

  return rows.map((r) => {
    type RA = { id: string; number: number | null; position: string | null; is_captain: boolean; is_starter?: boolean | null; status: string; athletes: { id: string; name: string; health_status: string } | null }
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
      match_time: (r as { match_time?: string | null }).match_time ?? null,
      opponent: r.opponent as string | null,
      venue: r.venue as string | null,
      competition_id: r.competition_id as string | null,
      linked_match_id: linkedByRoster.get(r.id) ?? null,
      competition,
      athletes: withSem,
    }
  })
}
