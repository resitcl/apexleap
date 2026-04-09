import { NextResponse } from 'next/server'
import { getPublicClubLanding } from '@/lib/actions/landing'

export const dynamic = 'force-dynamic'

function themeColor(hex: unknown): string {
  if (typeof hex !== 'string') return '#dc2626'
  const h = hex.trim()
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h) ? h : '#dc2626'
}

function iconMime(url: string): string {
  const u = url.split('?')[0].toLowerCase()
  if (u.endsWith('.png')) return 'image/png'
  if (u.endsWith('.webp')) return 'image/webp'
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg'
  if (u.endsWith('.svg')) return 'image/svg+xml'
  return 'image/png'
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const club = await getPublicClubLanding(slug)
  if (!club) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const c = club as Record<string, unknown>
  const name = String(c.name ?? 'Club')
  const shortName = name.length > 12 ? `${name.slice(0, 12).trim()}…` : name
  const description = String(
    c.landing_description ?? c.description ?? `Web de ${name}`
  )
  const logoUrl =
    typeof c.logo_url === 'string' && c.logo_url.length > 0 ? c.logo_url : null
  const basePath = `/club/${slug}/`
  const defaultIcon = '/icons/pwa-icon.svg'

  const body = {
    name,
    short_name: shortName,
    description,
    start_url: basePath,
    scope: basePath,
    display: 'standalone' as const,
    orientation: 'portrait-primary' as const,
    background_color: '#fafafa',
    theme_color: themeColor(c.primary_color),
    lang: 'es',
    dir: 'ltr' as const,
    categories: ['sports', 'business', 'productivity'],
    icons: logoUrl
      ? [
          {
            src: logoUrl,
            sizes: '192x192',
            type: iconMime(logoUrl),
            purpose: 'any' as const,
          },
          {
            src: logoUrl,
            sizes: '512x512',
            type: iconMime(logoUrl),
            purpose: 'any' as const,
          },
          {
            src: logoUrl,
            sizes: '512x512',
            type: iconMime(logoUrl),
            purpose: 'maskable' as const,
          },
        ]
      : [
          {
            src: defaultIcon,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any' as const,
          },
          {
            src: defaultIcon,
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable' as const,
          },
        ],
  }

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      // Evita cachear logo/nombre de otro club en CDN del mismo slugs
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  })
}
