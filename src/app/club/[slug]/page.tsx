import { notFound } from 'next/navigation'
import {
  getPublicClubLanding,
  getPublicClubCoaches,
  getPublicClubAthletes,
  getPublicClubCategories,
  getPublicFeaturedMedia,
  getPublicRecentResults,
  getPublicUpcomingSchedule,
  getPublicClubStats,
} from '@/lib/actions/landing'
import { ClubLandingPage } from '@/components/landing/ClubLandingPage'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const club = await getPublicClubLanding(slug)
  if (!club) return { title: 'Club no encontrado' }
  const c = club as Record<string, unknown>
  return {
    title: c.name as string,
    description: (c.landing_description ?? c.description ?? `Bienvenido a ${c.name}`) as string,
    openGraph: {
      title: c.name as string,
      description: (c.landing_description ?? c.description ?? '') as string,
      images: c.logo_url ? [c.logo_url as string] : [],
    },
  }
}

export default async function ClubLandingRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const club = await getPublicClubLanding(slug)
  if (!club) notFound()

  const c = club as Record<string, unknown>
  const clubId = c.id as string

  const [coaches, athletes, categories, media, results, schedule, stats] = await Promise.all([
    (c.landing_show_team as boolean)     ? getPublicClubCoaches(clubId)       : Promise.resolve([]),
    (c.landing_show_athletes as boolean) ? getPublicClubAthletes(clubId)      : Promise.resolve([]),
    (c.landing_show_about as boolean)    ? getPublicClubCategories(clubId)    : Promise.resolve([]),
    (c.landing_show_media as boolean)    ? getPublicFeaturedMedia(clubId)     : Promise.resolve([]),
    (c.landing_show_results as boolean)  ? getPublicRecentResults(clubId)     : Promise.resolve([]),
    (c.landing_show_schedule as boolean) ? getPublicUpcomingSchedule(clubId)  : Promise.resolve([]),
    (c.landing_show_stats as boolean)    ? getPublicClubStats(clubId)         : Promise.resolve(null),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <ClubLandingPage club={club as any} coaches={coaches} athletes={athletes} categories={categories} media={media} results={results} schedule={schedule} stats={stats} />
}
