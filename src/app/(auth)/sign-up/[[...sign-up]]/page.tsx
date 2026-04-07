import { SignUp } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth"
import Link from "next/link"

export default async function SignUpPage() {
  const { userId } = await auth()

  if (userId) {
    redirect(await getPostAuthRedirectPath())
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <p className="text-center text-sm text-muted-foreground max-w-md">
        <strong className="text-foreground">¿Eres alumno?</strong> No uses esta página: entra con el enlace que te envió tu club
        (ej. <span className="font-mono text-xs">…/tu-club/signin</span>).{" "}
        <Link href="/sign-in" className="text-primary font-medium underline-offset-4 hover:underline">
          Solo administradores
        </Link>{" "}
        crean una cuenta aquí para registrar su academia.
      </p>
      <SignUp forceRedirectUrl="/post-auth" fallbackRedirectUrl="/post-auth" />
    </div>
  )
}
