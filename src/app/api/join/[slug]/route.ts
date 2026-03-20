import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLUB_COOKIE } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.redirect(new URL(`/${slug}/signin`, request.url))
  }

  const supabase = createAdminClient()

  // Find club by slug
  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, slug, is_active')
    .eq('slug', slug.trim().toLowerCase())
    .single()

  if (!club || !club.is_active) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Check if user is already linked to this club
  const { data: existing } = await supabase
    .from('user_clubs')
    .select('id, is_active, role')
    .eq('user_id', userId)
    .eq('club_id', club.id)
    .maybeSingle()

  if (existing) {
    // Reactivate if inactive
    if (!existing.is_active) {
      await supabase
        .from('user_clubs')
        .update({ is_active: true })
        .eq('id', existing.id)
    }
  } else {
    // Create new link as athlete
    await supabase
      .from('user_clubs')
      .insert({
        user_id: userId,
        club_id: club.id,
        role: 'athlete',
        is_active: true,
      })
  }

  // Determine role for redirect
  const role = existing?.role ?? 'athlete'
  const destination = role === 'athlete' ? '/dashboard/athlete' : '/dashboard'

  // Set club cookie and redirect
  const response = NextResponse.redirect(new URL(destination, request.url))
  response.cookies.set(CLUB_COOKIE, club.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })

  return response
}
