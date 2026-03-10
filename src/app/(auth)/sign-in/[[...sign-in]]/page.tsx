import { SignIn } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth"

export default async function SignInPage() {
  const { userId } = await auth()

  if (userId) {
    redirect(await getPostAuthRedirectPath())
  }

  return <SignIn forceRedirectUrl="/post-auth" fallbackRedirectUrl="/post-auth" />
}
