'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

function translateError(msg: string): string {
  if (msg.includes("schema cache")) return "Tabla de partidos no encontrada. Contacta al administrador."
  if (msg.includes("violates foreign key")) return "Referencia inválida. Verifica los datos."
  if (msg.includes("violates unique")) return "Ya existe un registro con esos datos."
  if (msg.includes("not-null")) return "Faltan campos obligatorios."
  if (msg.includes("permission denied")) return "Sin permisos para realizar esta acción."
  if (msg.includes("invalid input syntax")) return "Formato de datos inválido."
  return "Error al guardar el partido. Intenta nuevamente."
}

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
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
  competition_id: string
  opponent: string
  match_date: string
  location?: string
  is_home?: boolean
  home_score?: number | null
  away_score?: number | null
  status?: string
  notes?: string
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('matches')
    .insert({ ...input, club_id: clubId })
    .select()
    .single()
  if (error) throw new Error(translateError(error.message))
  revalidatePath(`/dashboard/competitions/${input.competition_id}`)
  return data
}

export async function updateMatch(matchId: string, competitionId: string, input: {
  opponent?: string
  match_date?: string
  location?: string
  is_home?: boolean
  home_score?: number | null
  away_score?: number | null
  status?: string
  notes?: string
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('matches')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', matchId)
    .eq('club_id', clubId)
    .select()
    .single()
  if (error) throw new Error(translateError(error.message))
  revalidatePath(`/dashboard/competitions/${competitionId}`)
  return data
}

export async function deleteMatch(matchId: string, competitionId: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)
    .eq('club_id', clubId)
  if (error) throw new Error(translateError(error.message))
  revalidatePath(`/dashboard/competitions/${competitionId}`)
  return { deleted: true }
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

export async function upsertPlayerStats(matchId: string, competitionId: string, stats: Array<{
  athlete_id: string
  event_type: string
  event_value: number
  team?: string
}>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Delete existing events for this match
  await supabase.from('match_events').delete().eq('match_id', matchId).eq('club_id', clubId)

  if (stats.length === 0) {
    revalidatePath(`/dashboard/competitions/${competitionId}`)
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
  revalidatePath(`/dashboard/competitions/${competitionId}`)
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
