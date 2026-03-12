import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@clerk/nextjs/server'

/**
 * Haversine distance in meters between two lat/lng points.
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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

    // Get user email from Clerk via user_clubs or athletes
    // We need to find the athlete linked to this Clerk user
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, name, email, status, health_status')
      .eq('club_id', venue.club_id)

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({ error: 'No hay atletas registrados en este club.' }, { status: 404 })
    }

    // Try to match by checking user email from Clerk
    // First get the Clerk user's email addresses
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

    const athlete = athletes.find(
      (a) => a.email?.toLowerCase() === primaryEmail.toLowerCase()
    )

    if (!athlete) {
      return NextResponse.json({ error: 'Tu email no está vinculado a un perfil de alumno en este club. Contacta al administrador.' }, { status: 404 })
    }

    // 4. Validate athlete status
    if (athlete.status !== 'active') {
      return NextResponse.json({ error: 'Tu membresía no está activa. Contacta al administrador.' }, { status: 403 })
    }

    if (athlete.health_status === 'injured') {
      return NextResponse.json({ error: 'Tienes una lesión activa registrada. Consulta con tu entrenador.' }, { status: 403 })
    }

    // 5. GPS validation (geofencing)
    if (venue.lat != null && venue.lng != null && venue.geofence_radius) {
      if (lat == null || lng == null) {
        return NextResponse.json({ error: 'Debes permitir el acceso a tu ubicación para registrar asistencia.' }, { status: 400 })
      }

      const distance = haversineMeters(lat, lng, venue.lat, venue.lng)
      if (distance > venue.geofence_radius) {
        return NextResponse.json({
          error: `Estás demasiado lejos de la sede (${Math.round(distance)}m). Debes estar dentro de ${venue.geofence_radius}m.`,
        }, { status: 403 })
      }
    }

    // 6. Find today's schedule at this venue
    const todayDow = new Date().getDay()
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id, name')
      .eq('club_id', venue.club_id)
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .contains('day_of_week', [todayDow])

    const scheduleId = schedules?.[0]?.id ?? null

    // 7. Check duplicate attendance today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const duplicateQuery = supabase
      .from('attendance')
      .select('id')
      .eq('athlete_id', athlete.id)
      .gte('checked_in_at', today.toISOString())
      .lt('checked_in_at', tomorrow.toISOString())

    if (scheduleId) {
      duplicateQuery.eq('schedule_id', scheduleId)
    }

    const { data: existing } = await duplicateQuery.single()

    if (existing) {
      return NextResponse.json({
        error: 'Ya registraste asistencia hoy',
        athleteName: athlete.name,
        alreadyCheckedIn: true,
      }, { status: 409 })
    }

    // 8. Register attendance
    await supabase.from('attendance').insert({
      club_id: venue.club_id,
      athlete_id: athlete.id,
      schedule_id: scheduleId,
      checked_in_at: new Date().toISOString(),
      check_in_lat: lat ?? null,
      check_in_lng: lng ?? null,
      is_valid: true,
    })

    return NextResponse.json({
      success: true,
      athleteName: athlete.name,
      venueName: venue.name,
      scheduleName: schedules?.[0]?.name ?? null,
    })
  } catch (error) {
    console.error('QR check-in error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
