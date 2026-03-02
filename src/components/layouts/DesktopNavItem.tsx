'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

interface Props {
  href: string
  label: string
  icon: ReactNode
  badge?: number
}

export function DesktopNavItem({ href, label, icon, badge }: Props) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  )
}
