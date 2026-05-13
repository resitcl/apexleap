import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  calendarDateInTimeZone,
  haversineMeters,
  venueRequiresGeofence,
} from '@/lib/attendance/clubCheckIn'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { venueId, scheduleId, documentNumber, lat, lng } = body

    if (!venueId || !scheduleId) {
      return NextResponse.json({ error: 'Sede y sesión requeridos' }, { status: 400 })
    }

    if (!documentNumber) {
      return NextResponse.json({ error: 'Ingresa tu RUT o número de documento' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: venue } = await supabase
      .from('venues')
      .select('id, club_id, lat, lng, geofence_radius')
      .eq('id', venueId)
      .eq('is_active', true)
      .single()

    if (!venue) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }

    const { data: clubRow } = await supabase
      .from('clubs')
      .select('timezone')
      .eq('id', venue.club_id)
      .single()

    const clubTimeZone = clubRow?.timezone ?? 'America/Santiago'

    const { data: schedule } = await supabase
      .from('schedules')
      .select('id, name, venue_id')
      .eq('id', scheduleId)
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .single()

    if (!schedule) {
      return NextResponse.json({ error: 'Sesión no encontrada o no corresponde a esta sede' }, { status: 404 })
    }

    const cleanDoc = documentNumber.replace(/[.-]/g, '').toLowerCase()
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, name, club_id, status, health_status')
      .eq('club_id', venue.club_id)
      .or(`document_number.ilike.%${cleanDoc}%`)
      .eq('status', 'active')
      .is('archived_at', null)
      .single()

    if (!athlete) {
      return NextResponse.json({ error: 'Alumno no encontrado. Verifica tu RUT o contacta al entrenador.' }, { status: 404 })
    }

    if (athlete.health_status === 'injured') {
      return NextResponse.json({ error: 'Tienes una lesión activa. Consulta con tu entrenador.' }, { status: 403 })
    }

    if (venueRequiresGeofence(venue)) {
      const vLat = Number(venue.lat)
      const vLng = Number(venue.lng)
      const radius = Number(venue.geofence_radius)
      if (lat == null || lng == null) {
        return NextResponse.json(
          { error: 'Debes permitir el acceso a tu ubicación para registrar asistencia en esta sede.' },
          { status: 400 }
        )
      }
      const distance = haversineMeters(lat, lng, vLat, vLng)
      if (distance > radius) {
        return NextResponse.json(
          {
            error: `Estás demasiado lejos de la sede (${Math.round(distance)}m). Debes estar dentro de ${radius}m.`,
          },
          { status: 403 }
        )
      }
    }

    const todayLocal = calendarDateInTimeZone(new Date(), clubTimeZone)
    const since = new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString()
    const { data: recentAttendance } = await supabase
      .from('attendance')
      .select('id, checked_in_at')
      .eq('athlete_id', athlete.id)
      .eq('schedule_id', scheduleId)
      .gte('checked_in_at', since)

    const existing = (recentAttendance ?? []).find(
      (row) => calendarDateInTimeZone(new Date(row.checked_in_at), clubTimeZone) === todayLocal
    )

    if (existing) {
      return NextResponse.json(
        { error: 'Ya registraste asistencia en esta sesión hoy', athleteName: athlete.name },
        { status: 409 }
      )
    }

    const { error: insertError } = await supabase.from('attendance').insert({
      club_id: venue.club_id,
      athlete_id: athlete.id,
      schedule_id: scheduleId,
      checked_in_at: new Date().toISOString(),
      check_in_lat: lat ?? null,
      check_in_lng: lng ?? null,
      is_valid: true,
    })

    if (insertError) {
      console.error('Venue check-in insert:', insertError)
      return NextResponse.json({ error: 'No se pudo guardar la asistencia. Intenta de nuevo.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, athleteName: athlete.name })
  } catch (error) {
    console.error('Venue check-in error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
