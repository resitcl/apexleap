'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getAttendanceToday() {
  const clubId = await getClubId()
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, error } = await supabase
    .from('attendance')
    .select('*, athletes(id, name, photo_url, health_status)')
    .eq('club_id', clubId)
    .gte('checked_in_at', today.toISOString())
    .lt('checked_in_at', tomorrow.toISOString())
    .order('checked_in_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAttendanceHistory(params?: {
  athleteId?: string
  scheduleId?: string
  days?: number
  from?: string
  to?: string
  limit?: number
  page?: number
}) {
  const clubId = await getClubId()
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance')
    .update({ is_valid: false })
    .eq('id', params.attendanceId)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/attendance')
}

export async function getAthleteAttendanceRate(athleteId: string, days = 30) {
  const clubId = await getClubId()
  const supabase = await createClient()

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
