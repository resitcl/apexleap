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
      className={`flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] transition-all duration-150 ${
        isActive
          ? "bg-gradient-to-br from-primary/[0.22] via-primary/[0.10] to-primary/[0.04] dark:from-primary/[0.28] dark:via-primary/[0.14] dark:to-primary/[0.06] text-primary font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-inset ring-primary/15"
          : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/[0.05]"
      }`}
    >
      <span className={`shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground/50"}`}>
        {icon}
      </span>
      <span className="flex-1 leading-tight">{label}</span>
      {showBadge ? (
        <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0 leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  )
}
