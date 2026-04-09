import type { Metadata } from 'next'
import { getClubBySlug } from '@/lib/actions/onboarding'

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const club = await getClubBySlug(slug)
  if (!club) {
    return {}
  }

  const logoUrl = club.logo_url ?? undefined
  const description = `Acceso a ${club.name}`

  return {
    title: `${club.name} | ApexLeap`,
    description,
    manifest: `/${club.slug}/manifest`,
    appleWebApp: {
      capable: true,
      title: club.name,
      statusBarStyle: 'default',
    },
    ...(logoUrl
      ? {
          icons: {
            icon: [{ url: logoUrl }],
            apple: [{ url: logoUrl }],
          },
          openGraph: {
            images: [logoUrl],
          },
        }
      : {}),
  }
}

export default async function TenantLayout({ children }: LayoutProps) {
  return children
}
