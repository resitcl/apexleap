'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  const [checked, setChecked] = useState(false)
  const [hasAccess, setHasAccess] = useState(true)

  // Check if current path should bypass agreement check
  const shouldBypass = BYPASS_PATHS.some(path => pathname?.startsWith(path))

  useEffect(() => {
    if (shouldBypass) {
      setChecked(true)
      setHasAccess(true)
      return
    }

    async function checkAgreements() {
      try {
        const res = await fetch('/api/agreements/check-pending')
        const data = await res.json()

        if (data.hasPending) {
          router.push('/dashboard/agreements')
          setHasAccess(false)
        } else {
          setHasAccess(true)
        }
      } catch {
        // On error, allow access
        setHasAccess(true)
      } finally {
        setChecked(true)
      }
    }

    checkAgreements()
  }, [pathname, shouldBypass, router])

  // Show nothing while checking (prevents flash)
  if (!checked && !shouldBypass) {
    return null
  }

  // If no access, don't render children (redirect is happening)
  if (!hasAccess && !shouldBypass) {
    return null
  }

  return <>{children}</>
}
