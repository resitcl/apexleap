'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, assertClubStaff } from '@/lib/actions/club-context'

function translateError(msg: string): string {
  if (msg.includes("schema cache")) return "Tabla de partidos no encontrada. Contacta al administrador."
  if (msg.includes("violates foreign key")) return "Referencia inválida. Verifica los datos."
  if (msg.includes("violates unique")) return "Ya existe un registro con esos datos."
  if (msg.includes("not-null")) return "Faltan campos obligatorios."
  if (msg.includes("permission denied")) return "Sin permisos para realizar esta acción."
  if (msg.includes("invalid input syntax")) return "Formato de datos inválido."
  return "Error al guardar el partido. Intenta nuevamente."
}


// ─── Matches ──────────────────────────────────────────────────

export async function getMatches(competitionId: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('club_id', clubId)
    .eq('competition_id', competitionId)
    .order('match_date', { ascending: false })
  if (error) throw new Error(translateError(error.message))
  return data ?? []
}

export async function createMatch(input: {
  competition_id?: string | null
  category_id?: string | null
  opponent: string
  match_date: string
  match_time?: string | null
  location?: string
  is_home?: boolean
  home_score?: number | null
  away_score?: number | null
  status?: string
  notes?: string
}) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const matchTime = input.match_time?.trim() ? input.match_time.trim() : null

  // 1. Create the match
  const { data: match, error } = await supabase
    .from('matches')
    .insert({ ...input, match_time: matchTime, club_id: clubId })
    .select()
    .single()
  if (error) throw new Error(translateError(error.message))

  // 2. Auto-create a linked roster
  const rosterName = `Nómina vs. ${input.opponent}`
  const { data: roster } = await supabase
    .from('rosters')
    .insert({
      club_id:        clubId,
      competition_id: input.competition_id ?? null,
      name:           rosterName,
      match_date:     input.match_date,
      match_time:     matchTime,
      opponent:       input.opponent,
      venue:          input.location ?? null,
    })
    .select()
    .single()

  // 3. Link roster back to match
  if (roster?.id) {
    await supabase
      .from('matches')
      .update({ roster_id: roster.id })
      .eq('id', match.id)
      .eq('club_id', clubId)
  }

  if (input.competition_id) {
    revalidatePath(`/dashboard/competitions/${input.competition_id}`)
  }
  revalidatePath('/dashboard/matches')
  return { ...match, roster_id: roster?.id ?? null }
}

function revalidateMatchPaths(matchId: string, competitionId: string | null | undefined) {
  const comp = competitionId?.trim() || null
  if (comp) revalidatePath(`/dashboard/competitions/${comp}`)
  revalidatePath('/dashboard/matches')
  revalidatePath(`/dashboard/matches/${matchId}`)
}

export async function updateMatch(
  matchId: string,
  competitionId: string | null | undefined,
  input: {
    opponent?: string
    match_date?: string
    match_time?: string | null
    location?: string
    is_home?: boolean
    home_score?: number | null
    away_score?: number | null
    status?: string
    notes?: string
  }
) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const payload: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() }
  if ('match_time' in input) {
    payload.match_time = input.match_time?.trim() ? input.match_time.trim() : null
  }
  const { data, error } = await supabase
    .from('matches')
    .update(payload)
    .eq('id', matchId)
    .eq('club_id', clubId)
    .select()
    .single()
  if (error) throw new Error(translateError(error.message))
  revalidateMatchPaths(matchId, competitionId)
  return data
}

export async function deleteMatch(matchId: string, competitionId: string | null | undefined) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)
    .eq('club_id', clubId)
  if (error) throw new Error(translateError(error.message))
  revalidateMatchPaths(matchId, competitionId)
  return { deleted: true }
}

export async function getAllMatches(params?: { from?: string; to?: string }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  let query = supabase
    .from('matches')
    .select('*, competitions(id, name)')
    .eq('club_id', clubId)
    .order('match_date', { ascending: true })
  if (params?.from) query = query.gte('match_date', params.from)
  if (params?.to)   query = query.lte('match_date', params.to)
  const { data, error } = await query
  if (error) throw new Error(translateError(error.message))
  return data ?? []
}

// ─── Match Events ─────────────────────────────────────────────

export async function getMatchEvents(matchId: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('match_events')
    .select('*, athletes(id, name)')
    .eq('match_id', matchId)
    .eq('club_id', clubId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(translateError(error.message))
  return data ?? []
}

export async function upsertPlayerStats(
  matchId: string,
  competitionId: string | null | undefined,
  stats: Array<{
    athlete_id: string
    event_type: string
    event_value: number
    team?: string
  }>
) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Delete existing events for this match
  await supabase.from('match_events').delete().eq('match_id', matchId).eq('club_id', clubId)

  if (stats.length === 0) {
    revalidateMatchPaths(matchId, competitionId)
    return []
  }

  const rows = stats
    .filter((s) => s.event_value > 0)
    .map((s) => ({
      club_id: clubId,
      match_id: matchId,
      athlete_id: s.athlete_id,
      event_type: s.event_type,
      event_value: s.event_value,
      team: s.team ?? 'home',
    }))

  const { data, error } = await supabase.from('match_events').insert(rows).select()
  if (error) throw new Error(translateError(error.message))
  revalidateMatchPaths(matchId, competitionId)
  return data ?? []
}

// ─── Player Stats Aggregated ──────────────────────────────────

export async function getPlayerStatsForCompetition(competitionId: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: matchIds } = await supabase
    .from('matches')
    .select('id')
    .eq('club_id', clubId)
    .eq('competition_id', competitionId)

  if (!matchIds || matchIds.length === 0) return []

  const ids = matchIds.map((m) => m.id)

  const { data, error } = await supabase
    .from('match_events')
    .select('athlete_id, event_type, event_value, athletes(id, name)')
    .in('match_id', ids)
    .eq('club_id', clubId)

  if (error) throw new Error(translateError(error.message))
  if (!data) return []

  // Aggregate by athlete
  const byAthlete = new Map<string, {
    athlete_id: string
    name: string
    stats: Record<string, number>
  }>()

  for (const ev of data) {
    if (!ev.athlete_id) continue
    const name = (ev.athletes as unknown as { id: string; name: string } | null)?.name ?? 'Desconocido'
    if (!byAthlete.has(ev.athlete_id)) {
      byAthlete.set(ev.athlete_id, { athlete_id: ev.athlete_id, name, stats: {} })
    }
    const entry = byAthlete.get(ev.athlete_id)!
    entry.stats[ev.event_type] = (entry.stats[ev.event_type] ?? 0) + Number(ev.event_value)
  }

  return Array.from(byAthlete.values()).sort((a, b) => a.name.localeCompare(b.name))
}

// ─── Athlete Match Stats (perfil del jugador) ─────────────────

export interface AthleteMatchStatsGame {
  matchId: string
  date: string
  opponent: string | null
  competition: string | null
  /** Marcador desde la perspectiva del club (según localía del partido). */
  ourScore: number | null
  theirScore: number | null
  stats: Record<string, number>
}

export interface AthleteMatchStatsResult {
  gamesPlayed: number
  totals: Record<string, number>
  games: AthleteMatchStatsGame[]
}

/**
 * Estadísticas de UN jugador derivadas de sus partidos: totales acumulados en
 * el club + desglose partido a partido. Scoped al club activo.
 */
export async function getAthleteMatchStats(athleteId: string): Promise<AthleteMatchStatsResult> {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('match_events')
    .select('event_type, event_value, match_id, matches(match_date, opponent, is_home, home_score, away_score, competitions(name))')
    .eq('athlete_id', athleteId)
    .eq('club_id', clubId)

  if (error) throw new Error(translateError(error.message))
  if (!data || data.length === 0) return { gamesPlayed: 0, totals: {}, games: [] }

  const byMatch = new Map<string, AthleteMatchStatsGame>()
  const totals: Record<string, number> = {}

  for (const ev of data) {
    const m = ev.matches as unknown as {
      match_date: string; opponent: string | null; is_home: boolean;
      home_score: number | null; away_score: number | null;
      competitions: { name: string } | null
    } | null
    if (!ev.match_id || !m) continue

    if (!byMatch.has(ev.match_id)) {
      byMatch.set(ev.match_id, {
        matchId: ev.match_id,
        date: m.match_date,
        opponent: m.opponent,
        competition: m.competitions?.name ?? null,
        ourScore: m.is_home ? m.home_score : m.away_score,
        theirScore: m.is_home ? m.away_score : m.home_score,
        stats: {},
      })
    }
    const game = byMatch.get(ev.match_id)!
    const value = Number(ev.event_value)
    game.stats[ev.event_type] = (game.stats[ev.event_type] ?? 0) + value
    totals[ev.event_type] = (totals[ev.event_type] ?? 0) + value
  }

  const games = Array.from(byMatch.values()).sort((a, b) => b.date.localeCompare(a.date))
  return { gamesPlayed: games.length, totals, games }
}

// ─── Global Player Stats (all competitions) ───────────────────

export async function getGlobalPlayerStats() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('match_events')
    .select('athlete_id, event_type, event_value, athletes(id, name)')
    .eq('club_id', clubId)

  if (error) throw new Error(translateError(error.message))
  if (!data) return []

  const byAthlete = new Map<string, { athlete_id: string; name: string; stats: Record<string, number> }>()

  for (const ev of data) {
    if (!ev.athlete_id) continue
    const name = (ev.athletes as unknown as { id: string; name: string } | null)?.name ?? 'Desconocido'
    if (!byAthlete.has(ev.athlete_id)) {
      byAthlete.set(ev.athlete_id, { athlete_id: ev.athlete_id, name, stats: {} })
    }
    const entry = byAthlete.get(ev.athlete_id)!
    entry.stats[ev.event_type] = (entry.stats[ev.event_type] ?? 0) + Number(ev.event_value)
  }

  return Array.from(byAthlete.values()).sort((a, b) => a.name.localeCompare(b.name))
}
