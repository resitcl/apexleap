import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@clerk/nextjs/server'
import {
  calendarDateInTimeZone,
  haversineMeters,
  resolveScheduleForQrCheckIn,
  venueRequiresGeofence,
  type ScheduleForCheckIn,
  weekdayInTimeZone,
} from '@/lib/attendance/clubCheckIn'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { qrToken, lat, lng } = body as { qrToken?: string; lat?: number; lng?: number }

    if (!qrToken) {
      return NextResponse.json({ error: 'QR inválido' }, { status: 400 })
    }

    // 1. Authenticate via Clerk
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // 2. Resolve QR token → venue
    const { data: venue } = await supabase
      .from('venues')
      .select('id, club_id, name, lat, lng, geofence_radius, is_active')
      .eq('qr_token', qrToken)
      .single()

    if (!venue || !venue.is_active) {
      return NextResponse.json({ error: 'QR inválido o sede inactiva. Contacta al administrador.' }, { status: 404 })
    }

    if (!venueRequiresGeofence(venue)) {
      return NextResponse.json(
        {
          error:
            'Esta sede no tiene activado el check-in por ubicación. El club debe configurar coordenadas GPS y el radio (geofencing) en la sede.',
        },
        { status: 400 }
      )
    }

    const { data: clubRow } = await supabase
      .from('clubs')
      .select('timezone')
      .eq('id', venue.club_id)
      .single()

    const clubTimeZone = clubRow?.timezone ?? 'America/Santiago'

    // 3. Find athlete by Clerk userId → user_clubs → email match
    const { data: userClub } = await supabase
      .from('user_clubs')
      .select('club_id, role')
      .eq('user_id', userId)
      .eq('club_id', venue.club_id)
      .eq('is_active', true)
      .single()

    if (!userClub) {
      return NextResponse.json({ error: 'No perteneces a este club. Verifica tu cuenta.' }, { status: 403 })
    }

    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, name, email, status, health_status')
      .eq('club_id', venue.club_id)
      .is('archived_at', null)

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({ error: 'No hay atletas registrados en este club.' }, { status: 404 })
    }

    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    const clerkUser = clerkRes.ok ? await clerkRes.json() : null
    const primaryEmail = clerkUser?.email_addresses?.find(
      (e: { id: string }) => e.id === clerkUser?.primary_email_address_id
    )?.email_address as string | undefined

    if (!primaryEmail) {
      return NextResponse.json({ error: 'No se pudo obtener tu email. Contacta al administrador.' }, { status: 500 })
    }

    const athlete = athletes.find((a) => a.email?.toLowerCase() === primaryEmail.toLowerCase())

    if (!athlete) {
      return NextResponse.json({
        error: 'Tu email no está vinculado a un perfil de alumno en este club. Contacta al administrador.',
      }, { status: 404 })
    }

    if (athlete.status !== 'active') {
      return NextResponse.json({ error: 'Tu membresía no está activa. Contacta al administrador.' }, { status: 403 })
    }

    if (athlete.health_status === 'injured') {
      return NextResponse.json({ error: 'Tienes una lesión activa registrada. Consulta con tu entrenador.' }, { status: 403 })
    }

    // 5. GPS obligatorio (geofencing siempre activo para QR fijo)
    const vLat = Number(venue.lat)
    const vLng = Number(venue.lng)
    const radius = Number(venue.geofence_radius)
    if (lat == null || lng == null) {
      return NextResponse.json(
        { error: 'Debes permitir el acceso a tu ubicación para registrar asistencia.' },
        { status: 400 }
      )
    }

    const distance = haversineMeters(lat, lng, vLat, vLng)
    if (distance > radius) {
      return NextResponse.json({
        error: `Estás demasiado lejos de la sede (${Math.round(distance)}m). Debes estar dentro de ${radius}m.`,
      }, { status: 403 })
    }

    // 6. Horario del día en la sede (zona horaria del club)
    const todayDow = weekdayInTimeZone(new Date(), clubTimeZone)
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id, name, day_of_week, start_time, end_time, start_date, end_date')
      .eq('club_id', venue.club_id)
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .contains('day_of_week', [todayDow])
      .order('start_time', { ascending: true })

    const resolvedSchedule = resolveScheduleForQrCheckIn(
      (schedules ?? []) as ScheduleForCheckIn[],
      new Date(),
      clubTimeZone
    )
    const scheduleId = resolvedSchedule?.id ?? null

    // 7. Duplicado: mismo día local del club y misma sesión (o cualquier sesión si no hay schedule_id)
    const todayLocal = calendarDateInTimeZone(new Date(), clubTimeZone)
    const since = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString()
    const { data: recentAttendance } = await supabase
      .from('attendance')
      .select('id, checked_in_at, schedule_id')
      .eq('athlete_id', athlete.id)
      .gte('checked_in_at', since)

    const existing = (recentAttendance ?? []).find((row) => {
      if (calendarDateInTimeZone(new Date(row.checked_in_at), clubTimeZone) !== todayLocal) return false
      if (scheduleId) return row.schedule_id === scheduleId
      return true
    })

    if (existing) {
      return NextResponse.json({
        error: 'Ya registraste asistencia hoy',
        athleteName: athlete.name,
        alreadyCheckedIn: true,
      }, { status: 409 })
    }

    const { error: insertError } = await supabase.from('attendance').insert({
      club_id: venue.club_id,
      athlete_id: athlete.id,
      schedule_id: scheduleId,
      checked_in_at: new Date().toISOString(),
      check_in_lat: lat,
      check_in_lng: lng,
      is_valid: true,
    })

    if (insertError) {
      console.error('QR check-in insert:', insertError)
      return NextResponse.json({ error: 'No se pudo guardar la asistencia. Intenta de nuevo.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      athleteName: athlete.name,
      venueName: venue.name,
      scheduleName: resolvedSchedule?.name ?? null,
    })
  } catch (error) {
    console.error('QR check-in error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
