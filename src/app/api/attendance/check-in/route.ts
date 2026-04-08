import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, athleteId, documentNumber, lat, lng } = body

    if (!token && !athleteId) {
      return NextResponse.json({ error: 'Token o athleteId requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // If athleteId provided directly (internal use)
    if (athleteId) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('athlete_id', athleteId)
        .gte('checked_in_at', today.toISOString())
        .lt('checked_in_at', tomorrow.toISOString())
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Ya registraste asistencia hoy' }, { status: 409 })
      }

      const { data: athlete } = await supabase
        .from('athletes')
        .select('id, name, club_id, status, health_status')
        .eq('id', athleteId)
        .is('archived_at', null)
        .single()

      if (!athlete) {
        return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
      }

      if (athlete.status !== 'active') {
        return NextResponse.json({ error: 'Tu membresía no está activa' }, { status: 403 })
      }

      if (athlete.health_status === 'injured') {
        return NextResponse.json({ error: 'Tienes una lesión activa. Consulta con tu entrenador.' }, { status: 403 })
      }

      await supabase.from('attendance').insert({
        club_id: athlete.club_id,
        athlete_id: athleteId,
        checked_in_at: new Date().toISOString(),
        check_in_lat: lat ?? null,
        check_in_lng: lng ?? null,
        is_valid: true,
      })

      return NextResponse.json({ success: true, athleteName: athlete.name })
    }

    // Token-based flow (QR scan) — validate against check_in_tokens table
    const { data: tokenRecord } = await supabase
      .from('check_in_tokens')
      .select('club_id, schedule_id, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!tokenRecord) {
      return NextResponse.json({ error: 'QR expirado o inválido. Pide un nuevo código al entrenador.' }, { status: 401 })
    }

    if (!documentNumber) {
      return NextResponse.json({ error: 'Ingresa tu RUT o número de documento' }, { status: 400 })
    }

    // Lookup athlete by document_number within this club
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, name, club_id, status, health_status')
      .eq('club_id', tokenRecord.club_id)
      .ilike('document_number', documentNumber.replace(/[.-]/g, ''))
      .eq('status', 'active')
      .is('archived_at', null)
      .single()

    if (!athlete) {
      return NextResponse.json({ error: 'Alumno no encontrado. Verifica tu RUT o contacta al entrenador.' }, { status: 404 })
    }

    if (athlete.health_status === 'injured') {
      return NextResponse.json({ error: 'Tienes una lesión activa. Consulta con tu entrenador.' }, { status: 403 })
    }

    // Check duplicate today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('athlete_id', athlete.id)
      .gte('checked_in_at', today.toISOString())
      .lt('checked_in_at', tomorrow.toISOString())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya registraste asistencia hoy', athleteName: athlete.name }, { status: 409 })
    }

    await supabase.from('attendance').insert({
      club_id: tokenRecord.club_id,
      athlete_id: athlete.id,
      schedule_id: tokenRecord.schedule_id ?? null,
      checked_in_at: new Date().toISOString(),
      check_in_lat: lat ?? null,
      check_in_lng: lng ?? null,
      is_valid: true,
    })

    return NextResponse.json({ success: true, athleteName: athlete.name })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
