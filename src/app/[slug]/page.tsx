import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getClubBySlug } from "@/lib/actions/onboarding"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function TenantRootPage({ params }: PageProps) {
  const { slug } = await params

  const club = await getClubBySlug(slug)
  if (!club) notFound()

  const { userId } = await auth()

  if (userId) {
    // Already authenticated → send to join flow which lands on portal
    redirect(`/api/join/${club.slug}`)
  } else {
    // Not authenticated → send to signin
    redirect(`/${club.slug}/signin`)
  }
}
