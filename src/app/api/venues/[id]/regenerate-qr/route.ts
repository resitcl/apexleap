import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { auth } from '@clerk/nextjs/server'
import crypto from 'crypto'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: venueId } = await params
    const supabase = createAdminClient()

    // Verify user belongs to the club that owns this venue
    const { data: venue } = await supabase
      .from('venues')
      .select('id, club_id')
      .eq('id', venueId)
      .single()

    if (!venue) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }

    const { data: userClub } = await supabase
      .from('user_clubs')
      .select('role')
      .eq('user_id', userId)
      .eq('club_id', venue.club_id)
      .eq('is_active', true)
      .single()

    if (!userClub || !['admin', 'owner'].includes(userClub.role)) {
      return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 })
    }

    // Generate new token
    const newToken = crypto.randomBytes(16).toString('hex')

    const { data: updated, error } = await supabase
      .from('venues')
      .update({ qr_token: newToken })
      .eq('id', venueId)
      .select('id, qr_token')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ qrToken: updated.qr_token })
  } catch (error) {
    console.error('Regenerate QR error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
