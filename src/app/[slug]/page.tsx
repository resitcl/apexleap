import { notFound, redirect } from "next/navigation"
import { getClubBySlug } from "@/lib/actions/onboarding"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function TenantRootPage({ params }: PageProps) {
  const { slug } = await params

  const club = await getClubBySlug(slug)
  if (!club) notFound()

  // Siempre entrada por la vista de inicio de sesión del club (si ya hay sesión, esa página redirige al join)
  redirect(`/${club.slug}/signin`)
}
