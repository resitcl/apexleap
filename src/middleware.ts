import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/check-in(.*)',
  '/api/attendance(.*)',
  '/api/webhooks(.*)',
  '/:slug/signin',
  '/:slug/signup',
])

const KNOWN_ROOTS = new Set([
  'sign-in', 'sign-up', 'onboarding', 'dashboard', 'post-auth',
  'super-admin', 'api', 'check-in', '_next', 'favicon.ico',
])

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  const nextWithPathname = () => {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // /[slug] → /[slug]/signin  (club entry point, antes de auth check)
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 1 && !KNOWN_ROOTS.has(segments[0])) {
    const url = request.nextUrl.clone()
    url.pathname = `/${segments[0]}/signin`
    return NextResponse.redirect(url)
  }

  if (!isPublicRoute(request)) {
    await auth.protect()
  }

  return nextWithPathname()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
