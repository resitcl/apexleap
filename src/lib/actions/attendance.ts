'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, assertClubStaff } from '@/lib/actions/club-context'


export async function getAttendanceToday(params?: { categoryId?: string }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let athleteIds: string[] | null = null
  if (params?.categoryId) {
    const { data: catAthletes } = await supabase
      .from('athletes')
      .select('id')
      .eq('club_id', clubId)
      .eq('category_id', params.categoryId)
    athleteIds = (catAthletes ?? []).map((a) => a.id)
    if (athleteIds.length === 0) return []
  }

  let query = supabase
    .from('attendance')
    .select('*, athletes(id, name, photo_url, health_status)')
    .eq('club_id', clubId)
    .gte('checked_in_at', today.toISOString())
    .lt('checked_in_at', tomorrow.toISOString())
    .order('checked_in_at', { ascending: false })

  if (athleteIds) query = query.in('athlete_id', athleteIds)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAttendanceHistory(params?: {
  athleteId?: string
  scheduleId?: string
  categoryId?: string
  days?: number
  from?: string
  to?: string
  limit?: number
  page?: number
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const limit = params?.limit ?? 50
  const page  = params?.page  ?? 1
  const from  = params?.from
    ? new Date(params.from + 'T00:00:00').toISOString()
    : (() => { const d = new Date(); d.setDate(d.getDate() - (params?.days ?? 30)); return d.toISOString() })()
  const to    = params?.to
    ? new Date(params.to + 'T23:59:59').toISOString()
    : new Date().toISOString()

  let query = supabase
    .from('attendance')
    .select('*, athletes(id, name, photo_url), schedules(id, name)', { count: 'exact' })
    .eq('club_id', clubId)
    .gte('checked_in_at', from)
    .lte('checked_in_at', to)
    .order('checked_in_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (params?.athleteId) query = query.eq('athlete_id', params.athleteId)
  if (params?.scheduleId) query = query.eq('schedule_id', params.scheduleId)
  if (params?.categoryId) {
    const { data: catAthletes } = await supabase
      .from('athletes')
      .select('id')
      .eq('club_id', clubId)
      .eq('category_id', params.categoryId)
    const ids = (catAthletes ?? []).map((a) => a.id)
    if (ids.length === 0) return { records: [], total: 0 }
    query = query.in('athlete_id', ids)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { records: data ?? [], total: count ?? 0 }
}

export async function checkIn(params: {
  athleteId: string
  scheduleId: string
  lat?: number
  lng?: number
}) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  if (!params.scheduleId) {
    throw new Error('Selecciona un entrenamiento/sesión para registrar la asistencia')
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('id')
    .eq('id', params.scheduleId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle()

  if (scheduleError) throw new Error(scheduleError.message)
  if (!schedule) throw new Error('Entrenamiento/sesión inválida o inactiva')

  // Evita doble registro del mismo atleta en la misma sesión el mismo día
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('club_id', clubId)
    .eq('athlete_id', params.athleteId)
    .eq('schedule_id', params.scheduleId)
    .gte('checked_in_at', today.toISOString())
    .lt('checked_in_at', tomorrow.toISOString())
    .maybeSingle()

  if (existing) throw new Error('El alumno ya registró asistencia en esta sesión hoy')

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      club_id: clubId,
      athlete_id: params.athleteId,
      schedule_id: params.scheduleId,
      checked_in_at: new Date().toISOString(),
      check_in_lat: params.lat ?? null,
      check_in_lng: params.lng ?? null,
      is_valid: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/attendance')
  return data
}

export async function justifyAttendance(params: { attendanceId: string; reason: string }) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('attendance')
    .update({ notes: params.reason, is_valid: true })
    .eq('id', params.attendanceId)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/attendance')
}

export async function markAttendanceInvalid(params: { attendanceId: string }) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('attendance')
    .update({ is_valid: false })
    .eq('id', params.attendanceId)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/attendance')
}

export async function bulkCheckIn(params: {
  athleteIds: string[]
  date: string
  scheduleId: string
}) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  if (params.athleteIds.length === 0) {
    throw new Error('Selecciona al menos un alumno')
  }
  if (!params.scheduleId) {
    throw new Error('Selecciona un entrenamiento/sesión para registrar la asistencia')
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('id')
    .eq('id', params.scheduleId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle()
  if (scheduleError) throw new Error(scheduleError.message)
  if (!schedule) throw new Error('Entrenamiento/sesión inválida o inactiva')

  const checkInDate = new Date(params.date + 'T12:00:00')

  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (checkInDate > today) {
    throw new Error('No puedes registrar asistencia para fechas futuras')
  }

  // Duplicados solo dentro del mismo entrenamiento+fecha
  const dayStart = new Date(params.date + 'T00:00:00').toISOString()
  const dayEnd = new Date(params.date + 'T23:59:59').toISOString()

  const { data: existing } = await supabase
    .from('attendance')
    .select('athlete_id')
    .eq('club_id', clubId)
    .eq('schedule_id', params.scheduleId)
    .in('athlete_id', params.athleteIds)
    .gte('checked_in_at', dayStart)
    .lte('checked_in_at', dayEnd)

  const existingIds = new Set((existing ?? []).map(e => e.athlete_id))
  const newAthleteIds = params.athleteIds.filter(id => !existingIds.has(id))

  if (newAthleteIds.length === 0) {
    throw new Error('Todos los alumnos seleccionados ya tienen asistencia registrada en esa sesión y fecha')
  }

  const records = newAthleteIds.map(athleteId => ({
    club_id: clubId,
    athlete_id: athleteId,
    schedule_id: params.scheduleId,
    checked_in_at: checkInDate.toISOString(),
    is_valid: true,
    notes: 'Registro histórico manual',
  }))

  const { error } = await supabase.from('attendance').insert(records)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/attendance')
  return { count: newAthleteIds.length, skipped: existingIds.size }
}

/**
 * Devuelve las asistencias agrupadas por (entrenamiento, fecha local YYYY-MM-DD).
 * Pensada para la pestaña "Por entrenamiento" en el módulo de Asistencia.
 *
 * El agrupamiento se hace en JS para evitar dependencias de funciones SQL/RPC
 * y respetar zona horaria de Chile (`America/Santiago`).
 */
export async function getPastSessionsAttendance(params?: {
  days?: number
  from?: string
  to?: string
  scheduleId?: string
  limit?: number
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const fromIso = params?.from
    ? new Date(params.from + 'T00:00:00').toISOString()
    : (() => { const d = new Date(); d.setDate(d.getDate() - (params?.days ?? 30)); return d.toISOString() })()
  const toIso = params?.to
    ? new Date(params.to + 'T23:59:59').toISOString()
    : new Date().toISOString()

  let query = supabase
    .from('attendance')
    .select('id, athlete_id, schedule_id, checked_in_at, is_valid, notes, athletes(id, name, photo_url), schedules(id, name)')
    .eq('club_id', clubId)
    .gte('checked_in_at', fromIso)
    .lte('checked_in_at', toIso)
    .not('schedule_id', 'is', null)
    .order('checked_in_at', { ascending: false })
    .limit(params?.limit ?? 1000)

  if (params?.scheduleId) query = query.eq('schedule_id', params.scheduleId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  type Row = {
    id: string
    athlete_id: string | null
    schedule_id: string | null
    checked_in_at: string
    is_valid: boolean | null
    notes: string | null
    athletes: { id: string; name: string; photo_url: string | null } | null
    schedules: { id: string; name: string } | null
  }

  const localDateKey = (iso: string) => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(iso))
  }

  const groups = new Map<string, {
    scheduleId: string
    scheduleName: string
    date: string
    total: number
    valid: number
    records: Row[]
  }>()

  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.schedule_id || !r.schedules) continue
    const dateKey = localDateKey(r.checked_in_at)
    const key = `${r.schedule_id}__${dateKey}`
    const g = groups.get(key) ?? {
      scheduleId: r.schedule_id,
      scheduleName: r.schedules.name,
      date: dateKey,
      total: 0,
      valid: 0,
      records: [] as Row[],
    }
    g.total += 1
    if (r.is_valid) g.valid += 1
    g.records.push(r)
    groups.set(key, g)
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.scheduleName.localeCompare(b.scheduleName)
  })
}

export async function getAthleteAttendanceRate(athleteId: string, days = 30) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('attendance')
    .select('id, is_valid')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .gte('checked_in_at', since.toISOString())

  if (error) throw new Error(error.message)
  const valid = (data ?? []).filter((r) => r.is_valid).length
  return data?.length ? Math.round((valid / data.length) * 100) : 0
}
