import { NextResponse } from 'next/server'
import { getPostAuthRedirectPath } from '@/lib/auth/post-auth'

export async function GET() {
  const path = await getPostAuthRedirectPath()
  return NextResponse.json({ path })
}
