import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'
import { TENANT_ENTRY_SLUG_COOKIE } from '@/lib/constants'

/* ── Rutas que Clerk NO debe tocar en absoluto ── */
const BYPASS_CLERK_PREFIXES = [
  '/api/payments/flow',
  '/api/webhooks/flow',
]

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/check-in(.*)',
  '/api/attendance(.*)',
  '/api/webhooks(.*)',
  '/api/payments(.*)',
  '/:slug/signin',
  '/:slug/signup',
])

const KNOWN_ROOTS = new Set([
  'sign-in', 'sign-up', 'onboarding', 'dashboard', 'post-auth',
  'super-admin', 'api', 'check-in', '_next', 'favicon.ico',
])

const clerkMw = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  const nextWithPathname = () => {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)
    const res = NextResponse.next({ request: { headers: requestHeaders } })

    const parts = pathname.split('/').filter(Boolean)
    const first = parts[0]
    const isKnownRoot = !!first && KNOWN_ROOTS.has(first)
    const isTenantEntry =
      !!first &&
      !isKnownRoot &&
      (parts.length === 1 || (parts.length === 2 && ['signin', 'signup'].includes(parts[1])))

    if (isTenantEntry) {
      res.cookies.set(TENANT_ENTRY_SLUG_COOKIE, first, {
        path: '/',
        maxAge: 60 * 30, // 30 minutos, solo para completar auth
        sameSite: 'lax',
      })
    }
    return res
  }

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

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl

  // Manifest PWA por slug (`/[slug]/manifest`): debe ser público para que el fetch del navegador no falle.
  if (/^\/[^/]+\/manifest$/.test(pathname)) {
    return NextResponse.next()
  }

  if (BYPASS_CLERK_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  return clerkMw(request, event)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
