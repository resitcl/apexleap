import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getPostAuthRedirectPath() {
  const { userId } = await auth()
  if (!userId) return '/sign-in'

  const supabase = createAdminClient()

  const { data: superAdmin } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (superAdmin) return '/super-admin'

  const { data: userClub } = await supabase
    .from('user_clubs')
    .select('club_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (userClub) {
    const role = (userClub.role as string) ?? 'athlete'
    return role === 'athlete' ? '/dashboard/athlete' : '/dashboard'
  }

  return '/onboarding'
}
