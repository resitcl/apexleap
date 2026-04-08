import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { SignUp } from "@clerk/nextjs"
import { getClubBySlug } from "@/lib/actions/onboarding"
import Link from "next/link"
import { TenantAuthLogoBlock, TenantAuthShell } from "@/components/tenant/TenantAuthBranding"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function TenantSignUpPage({ params }: PageProps) {
  const { slug } = await params

  const club = await getClubBySlug(slug)
  if (!club) notFound()

  const { userId } = await auth()
  if (userId) redirect(`/api/join/${club.slug}`)

  const subtitle = [club.sport_type, club.city].filter(Boolean).join(" · ") || "Club deportivo"

  return (
    <TenantAuthShell club={club}>
      <div className="w-full max-w-md space-y-8">
        <TenantAuthLogoBlock
          club={club}
          title={`Inscríbete en ${club.name}`}
          subtitle={subtitle}
        />

        <div className="flex justify-center">
          <SignUp
            routing="hash"
            forceRedirectUrl={`/api/join/${club.slug}`}
            fallbackRedirectUrl={`/api/join/${club.slug}`}
            signInForceRedirectUrl={`/api/join/${club.slug}`}
            signInFallbackRedirectUrl={`/api/join/${club.slug}`}
          />
        </div>

        <div className="text-center space-y-2 text-sm text-muted-foreground">
          <p>
            ¿Ya tienes cuenta?{" "}
            <Link href={`/${club.slug}/signin`} className="text-primary hover:underline font-medium">
              Inicia sesión
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
