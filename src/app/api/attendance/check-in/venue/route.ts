import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // Verify venue exists and get club_id
    const { data: venue } = await supabase
      .from('venues')
      .select('id, club_id')
      .eq('id', venueId)
      .eq('is_active', true)
      .single()

    if (!venue) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }

    // Verify schedule exists and belongs to this venue
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

    // Lookup athlete by document_number within this club
    const cleanDoc = documentNumber.replace(/[.-]/g, '').toLowerCase()
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, name, club_id, status, health_status')
      .eq('club_id', venue.club_id)
      .or(`document_number.ilike.%${cleanDoc}%`)
      .eq('status', 'active')
      .single()

    if (!athlete) {
      return NextResponse.json({ error: 'Alumno no encontrado. Verifica tu RUT o contacta al entrenador.' }, { status: 404 })
    }

    if (athlete.health_status === 'injured') {
      return NextResponse.json({ error: 'Tienes una lesión activa. Consulta con tu entrenador.' }, { status: 403 })
    }

    // Check duplicate today for this schedule
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('athlete_id', athlete.id)
      .eq('schedule_id', scheduleId)
      .gte('checked_in_at', today.toISOString())
      .lt('checked_in_at', tomorrow.toISOString())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya registraste asistencia en esta sesión hoy', athleteName: athlete.name }, { status: 409 })
    }

    // Insert attendance record
    await supabase.from('attendance').insert({
      club_id: venue.club_id,
      athlete_id: athlete.id,
      schedule_id: scheduleId,
      checked_in_at: new Date().toISOString(),
      check_in_lat: lat ?? null,
      check_in_lng: lng ?? null,
      is_valid: true,
    })

    return NextResponse.json({ success: true, athleteName: athlete.name })
  } catch (error) {
    console.error('Venue check-in error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
