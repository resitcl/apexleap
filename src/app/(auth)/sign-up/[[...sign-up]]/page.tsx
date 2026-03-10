import { SignUp } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getPostAuthRedirectPath } from "@/lib/auth/post-auth"

export default async function SignUpPage() {
  const { userId } = await auth()

  if (userId) {
    redirect(await getPostAuthRedirectPath())
  }

  return <SignUp forceRedirectUrl="/post-auth" fallbackRedirectUrl="/post-auth" />
}
