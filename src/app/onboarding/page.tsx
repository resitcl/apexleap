import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { OnboardingForm } from "@/components/onboarding/OnboardingForm"
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth"

export default async function OnboardingPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const hasClub = await checkUserHasClub()
  if (hasClub) redirect(await getPostAuthRedirectPath())

  const postAuthPath = await getPostAuthRedirectPath()
  if (postAuthPath === "/super-admin") redirect(postAuthPath)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-xl">AL</span>
          </div>
          <h1 className="text-3xl font-bold">Bienvenido a ApexLeap</h1>
          <p className="text-muted-foreground">
            Configura tu club en menos de 2 minutos para comenzar
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
            <span className="font-medium text-foreground">Crear Club</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
            <span>Agregar Alumnos</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
            <span>Configurar Planes</span>
          </div>
        </div>

        <OnboardingForm />
      </div>
    </div>
  )
}
