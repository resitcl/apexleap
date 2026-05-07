import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let clubId: string
    try {
      clubId = await getClubId()
    } catch {
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const scheduleId = body.scheduleId ?? null

    const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    const expiresAt = new Date(Date.now() + 65_000).toISOString() // 65s for buffer

    const admin = createAdminClient()
    const { error } = await admin.from('check_in_tokens').insert({
      club_id: clubId,
      token,
      schedule_id: scheduleId,
      expires_at: expiresAt,
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ token, expiresAt })
  } catch (err) {
    console.error('Token generation error:', err)
    return NextResponse.json({ error: 'Error al generar token' }, { status: 500 })
  }
}
