import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { OnboardingForm } from "@/components/onboarding/OnboardingForm"
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth"
import { SignOutButton } from "@clerk/nextjs"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { UserCircle } from "lucide-react"

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
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver al inicio
          </Link>
          <SignOutButton redirectUrl="/">
            <button type="button" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cerrar sesión
            </button>
          </SignOutButton>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 pb-5 flex gap-3">
            <UserCircle className="w-9 h-9 text-primary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1.5">
              <p className="font-semibold text-foreground">¿Eres alumno o entrenador?</p>
              <p className="text-muted-foreground leading-relaxed">
                No uses esta página. Debes entrar con el <strong>enlace de tu club</strong>, por ejemplo{" "}
                <span className="font-mono text-xs bg-background/80 px-1.5 py-0.5 rounded border">
                  …/nombre-del-club/signin
                </span>
                . Pídeselo al administrador de tu academia.
              </p>
              <p className="text-muted-foreground text-xs pt-1">
                Si entraste con Google o correo desde la página general, cierra sesión arriba y abre el enlace que te envió tu club.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-xl">AL</span>
          </div>
          <h1 className="text-3xl font-bold">Crear tu club en ApexLeap</h1>
          <p className="text-muted-foreground">
            Solo para <strong>administradores</strong> que van a registrar una academia o club nuevo.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
            <span className="font-medium text-foreground">Crear club</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
            <span>Agregar alumnos</span>
          </div>
          <div className="h-px w-8 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
            <span>Planes</span>
          </div>
        </div>

        <OnboardingForm />
      </div>
    </div>
  )
}
