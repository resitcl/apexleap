import { NextResponse } from 'next/server'
import { getClubBySlug } from '@/lib/actions/onboarding'

export const dynamic = 'force-dynamic'

function themeColor(hex: string | null): string {
  if (!hex) return '#dc2626'
  const h = hex.trim()
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h) ? h : '#dc2626'
}

function iconMime(url: string): string {
  const normalized = url.split('?')[0].toLowerCase()
  if (normalized.endsWith('.png')) return 'image/png'
  if (normalized.endsWith('.webp')) return 'image/webp'
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg'
  if (normalized.endsWith('.svg')) return 'image/svg+xml'
  return 'image/png'
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const club = await getClubBySlug(slug)

  if (!club) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const logoUrl = club.logo_url
  const fallbackIcon = '/icons/pwa-icon.svg'

  const manifest = {
    name: `${club.name} — ApexLeap`,
    short_name: club.name.length > 12 ? `${club.name.slice(0, 12).trim()}…` : club.name,
    description: `Acceso a ${club.name}`,
    start_url: `/${club.slug}/signin`,
    scope: `/${club.slug}/`,
    display: 'standalone' as const,
    orientation: 'portrait-primary' as const,
    background_color: '#fafafa',
    theme_color: themeColor(club.primary_color ?? null),
    lang: 'es',
    dir: 'ltr' as const,
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
            src: fallbackIcon,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any' as const,
          },
        ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  })
}
