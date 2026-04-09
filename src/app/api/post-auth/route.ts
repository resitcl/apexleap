import { NextResponse } from 'next/server'
import { getPostAuthRedirectPath } from '@/lib/auth/post-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { TENANT_ENTRY_SLUG_COOKIE } from '@/lib/constants'

export async function GET() {
  const cookieStore = await cookies()
  const entrySlug = cookieStore.get(TENANT_ENTRY_SLUG_COOKIE)?.value?.trim().toLowerCase()

  if (entrySlug) {
    const supabase = createAdminClient()
    const { data: club } = await supabase
      .from('clubs')
      .select('slug, is_active')
      .eq('slug', entrySlug)
      .maybeSingle()

    const path = club?.is_active ? `/api/join/${entrySlug}` : await getPostAuthRedirectPath()
    const response = NextResponse.json({ path })
    response.cookies.set(TENANT_ENTRY_SLUG_COOKIE, '', { path: '/', maxAge: 0, sameSite: 'lax' })
    return response
  }

  const path = await getPostAuthRedirectPath()
  return NextResponse.json({ path })
}
