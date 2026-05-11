import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Check-in vía token de un solo uso (almacenado en `check_in_tokens`).
 * Requiere `scheduleId` asociado al token. NO acepta `athleteId` directo
 * porque sería un canal sin autenticación que permitiría marcar a cualquiera.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, documentNumber, lat, lng } = body as {
      token?: string
      documentNumber?: string
      lat?: number
      lng?: number
    }

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }
    if (!documentNumber) {
      return NextResponse.json({ error: 'Ingresa tu RUT o número de documento' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: tokenRecord } = await supabase
      .from('check_in_tokens')
      .select('club_id, schedule_id, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!tokenRecord) {
      return NextResponse.json({ error: 'QR expirado o inválido. Pide un nuevo código al entrenador.' }, { status: 401 })
    }

    if (!tokenRecord.schedule_id) {
      return NextResponse.json({
        error: 'El QR no está asociado a una sesión. Genera uno nuevo desde una sesión válida.',
      }, { status: 400 })
    }

    // Validar que la sesión exista, sea del club y esté activa.
    const { data: schedule } = await supabase
      .from('schedules')
      .select('id')
      .eq('id', tokenRecord.schedule_id)
      .eq('club_id', tokenRecord.club_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!schedule) {
      return NextResponse.json({ error: 'Sesión inválida o inactiva' }, { status: 404 })
    }

    const cleanDoc = documentNumber.trim().replace(/[.-]/g, '').toLowerCase()

    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, name, club_id, status, health_status, archived_at')
      .eq('club_id', tokenRecord.club_id)
      .ilike('document_number', cleanDoc)
      .is('archived_at', null)
      .single()

    if (!athlete) {
      return NextResponse.json({ error: 'Alumno no encontrado. Verifica tu RUT o contacta al entrenador.' }, { status: 404 })
    }
    if (athlete.status !== 'active') {
      return NextResponse.json({ error: 'Tu membresía no está activa. Contacta al administrador.' }, { status: 403 })
    }
    if (athlete.health_status === 'injured') {
      return NextResponse.json({ error: 'Tienes una lesión activa. Consulta con tu entrenador.' }, { status: 403 })
    }

    // Duplicado: mismo atleta + misma sesión + mismo día (UTC; suficiente porque la
    // sesión sólo se imparte una vez por día por construcción del schedule).
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('athlete_id', athlete.id)
      .eq('schedule_id', tokenRecord.schedule_id)
      .gte('checked_in_at', today.toISOString())
      .lt('checked_in_at', tomorrow.toISOString())
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Ya registraste asistencia en esta sesión hoy', athleteName: athlete.name },
        { status: 409 }
      )
    }

    const { error: insertErr } = await supabase.from('attendance').insert({
      club_id: tokenRecord.club_id,
      athlete_id: athlete.id,
      schedule_id: tokenRecord.schedule_id,
      checked_in_at: new Date().toISOString(),
      check_in_lat: lat ?? null,
      check_in_lng: lng ?? null,
      is_valid: true,
    })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, athleteName: athlete.name })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
