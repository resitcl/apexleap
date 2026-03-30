'use client'

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"

const STORAGE_KEY = 'apexleap-dismissed-notifications'

interface SidebarItem {
  href: string
  label: string
  icon: ReactNode
  badge?: number
  notificationId?: string
}

interface NavGroup {
  label: string | null
  items: SidebarItem[]
}

interface Props {
  groups: NavGroup[]
  clubName?: string | null
  logoUrl?: string | null
  brandColor?: string | null
}

export function MobileSidebar({ groups, clubName, logoUrl, brandColor }: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const pathname = usePathname()
  const color = brandColor ?? '#000000'

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setDismissed(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const dismissBadge = useCallback((notificationId: string | undefined, badge: number | undefined) => {
    if (!notificationId || !badge) return
    const key = `${notificationId}-${badge}`
    setDismissed((prev) => {
      const next = [...new Set([...prev, key])]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-xl hover:bg-muted/60 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Club header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0 flex-1" onClick={() => setOpen(false)}>
            {logoUrl ? (
              <Image src={logoUrl} alt={clubName ?? 'Club'} width={34} height={34} className="rounded-xl object-cover shrink-0" />
            ) : (
              <div
                className="w-[34px] h-[34px] rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm shadow-sm"
                style={{ backgroundColor: color }}
              >
                {(clubName ?? 'AL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-[13px] leading-tight truncate">{clubName ?? 'ApexLeap'}</p>
              <p className="text-[10px] text-muted-foreground/50 leading-tight font-medium uppercase tracking-wider">Performance Hub</p>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-xl hover:bg-muted/60 transition-colors shrink-0 ml-2"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-5" : ""}>
              {group.label && (
                <div className="flex items-center gap-2 px-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/35 shrink-0">{group.label}</span>
                  <div className="h-px bg-border/40 flex-1" />
                </div>
              )}
              <ul className="space-y-px">
                {group.items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  const showBadge = !!item.badge && item.badge > 0 &&
                    !dismissed.includes(`${item.notificationId}-${item.badge}`)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => { setOpen(false); dismissBadge(item.notificationId, item.badge) }}
                        className={`flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] transition-colors ${
                          isActive
                            ? "bg-primary/10 dark:bg-primary/15 text-primary font-semibold"
                            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        <span className={`shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/50"}`}>
                          {item.icon}
                        </span>
                        <span className="flex-1 leading-tight">{item.label}</span>
                        {showBadge ? (
                          <span className="bg-destructive text-destructive-foreground text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">
                            {item.badge! > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </>
  )
}
