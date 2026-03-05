import { auth } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLUB_COOKIE } from '@/lib/constants'


export async function getClubId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const supabase = createAdminClient()

  try {
    const cookieStore = await cookies()
    const preferred = cookieStore.get(CLUB_COOKIE)?.value
    if (preferred) {
      const { data } = await supabase
        .from('user_clubs')
        .select('club_id')
        .eq('user_id', userId)
        .eq('club_id', preferred)
        .eq('is_active', true)
        .maybeSingle()
      if (data) return data.club_id as string
    }
  } catch {
    // cookies() not available in this context — fall through to DB
  }

  const { data, error } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function switchToClub(clubId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) throw new Error('No tienes acceso a este club')

  const cookieStore = await cookies()
  cookieStore.set(CLUB_COOKIE, clubId, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
}
