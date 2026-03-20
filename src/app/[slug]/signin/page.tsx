import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { SignIn } from "@clerk/nextjs"
import { getClubBySlug } from "@/lib/actions/onboarding"
import Link from "next/link"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function TenantSignInPage({ params }: PageProps) {
  const { slug } = await params

  const club = await getClubBySlug(slug)
  if (!club) notFound()

  // If already authenticated, redirect to join flow
  const { userId } = await auth()
  if (userId) redirect(`/api/join/${club.slug}`)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Club branding */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-2xl">
              {club.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{club.name}</h1>
            <p className="text-muted-foreground text-sm">
              {[club.sport_type, club.city].filter(Boolean).join(" · ") || "Club deportivo"}
            </p>
          </div>
        </div>

        {/* Clerk Sign In */}
        <div className="flex justify-center">
          <SignIn
            routing="hash"
            forceRedirectUrl={`/api/join/${club.slug}`}
            fallbackRedirectUrl={`/api/join/${club.slug}`}
          />
        </div>

        {/* Links */}
        <div className="text-center space-y-2 text-sm text-muted-foreground">
          <p>
            ¿No tienes cuenta?{" "}
            <Link href={`/${club.slug}/signup`} className="text-primary hover:underline font-medium">
              Inscríbete aquí
            </Link>
          </p>
          <p>
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
