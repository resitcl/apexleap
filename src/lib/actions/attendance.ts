'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'


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
  scheduleId?: string
  lat?: number
  lng?: number
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Check if already checked in today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('club_id', clubId)
    .eq('athlete_id', params.athleteId)
    .gte('checked_in_at', today.toISOString())
    .lt('checked_in_at', tomorrow.toISOString())
    .single()

  if (existing) throw new Error('El alumno ya registró asistencia hoy')

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      club_id: clubId,
      athlete_id: params.athleteId,
      schedule_id: params.scheduleId ?? null,
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
  scheduleId?: string
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  if (params.athleteIds.length === 0) {
    throw new Error('Selecciona al menos un alumno')
  }

  // Parse the date and set time to noon to avoid timezone issues
  const checkInDate = new Date(params.date + 'T12:00:00')
  
  // Validate date is not in the future
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (checkInDate > today) {
    throw new Error('No puedes registrar asistencia para fechas futuras')
  }

  // Check for existing attendance on that date for these athletes
  const dayStart = new Date(params.date + 'T00:00:00').toISOString()
  const dayEnd = new Date(params.date + 'T23:59:59').toISOString()

  const { data: existing } = await supabase
    .from('attendance')
    .select('athlete_id')
    .eq('club_id', clubId)
    .in('athlete_id', params.athleteIds)
    .gte('checked_in_at', dayStart)
    .lte('checked_in_at', dayEnd)

  const existingIds = new Set((existing ?? []).map(e => e.athlete_id))
  const newAthleteIds = params.athleteIds.filter(id => !existingIds.has(id))

  if (newAthleteIds.length === 0) {
    throw new Error('Todos los alumnos seleccionados ya tienen asistencia registrada en esa fecha')
  }

  // Insert attendance records
  const records = newAthleteIds.map(athleteId => ({
    club_id: clubId,
    athlete_id: athleteId,
    schedule_id: params.scheduleId ?? null,
    checked_in_at: checkInDate.toISOString(),
    is_valid: true,
    notes: 'Registro histórico manual',
  }))

  const { error } = await supabase.from('attendance').insert(records)

  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard/attendance')
  return { count: newAthleteIds.length, skipped: existingIds.size }
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
