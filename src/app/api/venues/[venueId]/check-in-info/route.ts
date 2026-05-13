import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  filterSchedulesForVenueCheckInToday,
  type ScheduleForCheckIn,
  venueRequiresGeofence,
  weekdayInTimeZone,
} from '@/lib/attendance/clubCheckIn'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const { venueId } = await params
  const supabase = createAdminClient()

  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, name, club_id, lat, lng, geofence_radius, clubs(name)')
    .eq('id', venueId)
    .eq('is_active', true)
    .single()

  if (venueError || !venue) {
    return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }

  const { data: clubRow } = await supabase
    .from('clubs')
    .select('timezone')
    .eq('id', venue.club_id)
    .single()

  const clubTimeZone = clubRow?.timezone ?? 'America/Santiago'
  const now = new Date()
  const dayOfWeek = weekdayInTimeZone(now, clubTimeZone)

  const { data: schedules } = await supabase
    .from('schedules')
    .select('id, name, start_time, end_time, day_of_week, start_date, end_date')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .contains('day_of_week', [dayOfWeek])
    .order('start_time', { ascending: true })

  const filtered = filterSchedulesForVenueCheckInToday(
    (schedules ?? []) as ScheduleForCheckIn[],
    now,
    clubTimeZone
  )

  const todaySessions = filtered.map((s) => ({
    id: s.id,
    name: s.name,
    start_time: s.start_time,
    end_time: s.end_time,
  }))

  return NextResponse.json({
    venueId: venue.id,
    venueName: venue.name,
    clubName: (venue.clubs as unknown as { name: string } | null)?.name ?? 'Club',
    sessions: todaySessions,
    requiresGeolocation: venueRequiresGeofence(venue),
  })
}
