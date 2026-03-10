'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

export default function PostAuthPage() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()

  useEffect(() => {
    if (!isLoaded) return

    if (!userId) {
      router.replace('/sign-in')
      return
    }

    let cancelled = false

    async function resolveRedirect() {
      try {
        const res = await fetch('/api/post-auth', { cache: 'no-store' })
        const data = await res.json() as { path?: string }
        if (!cancelled) {
          router.replace(data.path || '/dashboard')
        }
      } catch {
        if (!cancelled) {
          router.replace('/dashboard')
        }
      }
    }

    void resolveRedirect()

    return () => {
      cancelled = true
    }
  }, [isLoaded, router, userId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Preparando tu panel...</span>
      </div>
    </div>
  )
}
