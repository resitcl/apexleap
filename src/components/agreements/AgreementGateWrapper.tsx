'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  children: React.ReactNode
}

// Paths that should bypass the agreement check
const BYPASS_PATHS = [
  '/dashboard/agreements',
  '/dashboard/settings',
]

export function AgreementGateWrapper({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const shouldBypass = BYPASS_PATHS.some((path) => pathname?.startsWith(path))

  useEffect(() => {
    if (shouldBypass) return

    let cancelled = false
    async function checkAgreements() {
      try {
        const res = await fetch('/api/agreements/check-pending')
        const data = await res.json()
        if (!cancelled && data.hasPending) {
          router.replace('/dashboard/agreements')
        }
      } catch {
        /* permitir acceso si el check falla */
      }
    }

    void checkAgreements()
    return () => {
      cancelled = true
    }
  }, [pathname, shouldBypass, router])

  // Siempre renderizar hijos (misma salida SSR / hidratación). El redirect ocurre en segundo plano.
  return <>{children}</>
}
