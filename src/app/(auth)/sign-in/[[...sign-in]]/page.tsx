import { SignIn } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth"

export default async function SignInPage() {
  const { userId } = await auth()

  if (userId) {
    const path = await getPostAuthRedirectPath()
    // Only auto-redirect if user has a real destination (dashboard/super-admin).
    // If they'd land on onboarding, show the sign-in form so they can switch accounts.
    if (path !== '/onboarding') {
      redirect(path)
    }
  }

  return <SignIn forceRedirectUrl="/post-auth" fallbackRedirectUrl="/post-auth" />
}
