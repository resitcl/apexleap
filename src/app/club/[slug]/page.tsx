import { notFound } from 'next/navigation'
import { getPublicClubLanding, getPublicClubCoaches } from '@/lib/actions/landing'
import { ClubLandingPage } from '@/components/landing/ClubLandingPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const club = await getPublicClubLanding(slug)
  if (!club) return { title: 'Club no encontrado' }
  return {
    title: club.name,
    description: club.landing_description ?? club.description ?? `Bienvenido a ${club.name}`,
    openGraph: {
      title: club.name,
      description: club.landing_description ?? club.description ?? '',
      images: club.logo_url ? [club.logo_url] : [],
    },
  }
}

export default async function ClubLandingRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const club = await getPublicClubLanding(slug)
  if (!club) notFound()

  const coaches = club.landing_show_team ? await getPublicClubCoaches(club.id) : []

  return <ClubLandingPage club={club} coaches={coaches} />
}
