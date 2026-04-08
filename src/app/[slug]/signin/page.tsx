import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { SignIn } from "@clerk/nextjs"
import { getClubBySlug } from "@/lib/actions/onboarding"
import Link from "next/link"
import { TenantAuthLogoBlock, TenantAuthShell } from "@/components/tenant/TenantAuthBranding"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function TenantSignInPage({ params }: PageProps) {
  const { slug } = await params

  const club = await getClubBySlug(slug)
  if (!club) notFound()

  const { userId } = await auth()
  if (userId) redirect(`/api/join/${club.slug}`)

  const subtitle = [club.sport_type, club.city].filter(Boolean).join(" · ") || "Club deportivo"

  return (
    <TenantAuthShell club={club}>
      <div className="w-full max-w-md space-y-8">
        <TenantAuthLogoBlock club={club} title={club.name} subtitle={subtitle} />

        <div className="flex justify-center">
          <SignIn
            routing="hash"
            forceRedirectUrl={`/api/join/${club.slug}`}
            fallbackRedirectUrl={`/api/join/${club.slug}`}
            signUpForceRedirectUrl={`/api/join/${club.slug}`}
            signUpFallbackRedirectUrl={`/api/join/${club.slug}`}
          />
        </div>

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
    </TenantAuthShell>
  )
}
