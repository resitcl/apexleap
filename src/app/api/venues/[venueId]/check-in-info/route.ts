import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ venueId: string }> }
) {
  const { venueId } = await params
  const supabase = createAdminClient()

  // Get venue info
  const { data: venue, error: venueError } = await supabase
    .from('venues')
    .select('id, name, club_id, clubs(name)')
    .eq('id', venueId)
    .eq('is_active', true)
    .single()

  if (venueError || !venue) {
    return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }

  // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
  const today = new Date()
  const dayOfWeek = today.getDay()

  // Get schedules for this venue on today's day
  const { data: schedules } = await supabase
    .from('schedules')
    .select('id, name, start_time, end_time, day_of_week')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .contains('day_of_week', [dayOfWeek])
    .order('start_time', { ascending: true })

  // Filter sessions that are currently active or upcoming today
  const now = today.getHours() * 60 + today.getMinutes()
  const todaySessions = (schedules ?? [])
    .filter(s => {
      const [endH, endM] = s.end_time.split(':').map(Number)
      const endMins = endH * 60 + endM
      // Show sessions that haven't ended yet (with 30 min grace period)
      return endMins + 30 >= now
    })
    .map(s => ({
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
  })
}
