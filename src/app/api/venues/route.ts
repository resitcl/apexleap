import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: userClub } = await supabase
      .from('user_clubs')
      .select('club_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!userClub) {
      return NextResponse.json([], { status: 200 })
    }

    const { data: venues } = await supabase
      .from('venues')
      .select('id, name, address, qr_token, lat, lng, geofence_radius, is_active')
      .eq('club_id', userClub.club_id)
      .eq('is_active', true)
      .order('name')

    return NextResponse.json(venues ?? [])
  } catch (error) {
    console.error('Venues API error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
