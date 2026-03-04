'use client'

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

const STORAGE_KEY = 'apexleap-dismissed-notifications'

interface Props {
  href: string
  label: string
  icon: ReactNode
  badge?: number
  notificationId?: string
}

export function DesktopNavItem({ href, label, icon, badge, notificationId }: Props) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setDismissed(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const dismissBadge = useCallback(() => {
    if (!notificationId || !badge) return
    const key = `${notificationId}-${badge}`
    const next = [...new Set([...dismissed, key])]
    setDismissed(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }, [notificationId, badge, dismissed])

  const isDismissed = !!(notificationId && badge && dismissed.includes(`${notificationId}-${badge}`))
  const showBadge = !!badge && badge > 0 && !isDismissed

  return (
    <Link
      href={href}
      onClick={dismissBadge}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {showBadge ? (
        <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  )
}
