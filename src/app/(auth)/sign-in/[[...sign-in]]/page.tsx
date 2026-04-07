import { SignIn } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth"

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ club?: string }>
}) {
  const { userId } = await auth()
  const sp = await searchParams
  const clubInvalido = sp?.club === "invalido"

  if (userId) {
    const path = await getPostAuthRedirectPath()
    if (path !== "/onboarding") {
      redirect(path)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      {clubInvalido && (
        <div
          className="w-full max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
          role="alert"
        >
          No encontramos un club activo con ese enlace. Comprueba la URL o pide a tu club el enlace correcto
          (debe terminar en <span className="font-mono text-xs">/signin</span>).
        </div>
      )}
      <SignIn forceRedirectUrl="/post-auth" fallbackRedirectUrl="/post-auth" />
    </div>
  )
}
