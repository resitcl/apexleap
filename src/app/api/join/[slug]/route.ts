import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLUB_COOKIE, TENANT_ENTRY_SLUG_COOKIE } from '@/lib/constants'

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
    const u = new URL('/sign-in', request.url)
    u.searchParams.set('club', 'invalido')
    return NextResponse.redirect(u)
  }

  // Ensure user exists in Supabase (webhook may not have fired yet for new users)
  const { data: existingUser } = await supabase
    .from('users')
    .select('clerk_id')
    .eq('clerk_id', userId)
    .maybeSingle()

  if (!existingUser) {
    try {
      const clerk = await clerkClient()
      const clerkUser = await clerk.users.getUser(userId)
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? null
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email || userId
      await supabase.from('users').upsert({
        clerk_id: userId,
        email,
        name,
        avatar_url: clerkUser.imageUrl ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'clerk_id' })
    } catch {
      // If Clerk call fails, insert a minimal user record so the FK succeeds
      await supabase.from('users').upsert({
        clerk_id: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'clerk_id' })
    }
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

  // Set club cookie, clear tenant entry cookie, and redirect
  const response = NextResponse.redirect(new URL(destination, request.url))
  response.cookies.set(CLUB_COOKIE, club.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })
  response.cookies.set(TENANT_ENTRY_SLUG_COOKIE, '', { path: '/', maxAge: 0, sameSite: 'lax' })

  return response
}
