'use client'

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"

interface SidebarItem {
  href: string
  label: string
  icon: ReactNode
  badge?: number
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
  const pathname = usePathname()
  const color = brandColor ?? '#000000'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Club header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={() => setOpen(false)}>
            {logoUrl ? (
              <Image src={logoUrl} alt={clubName ?? 'Club'} width={32} height={32} className="rounded-lg object-cover shrink-0" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs"
                style={{ backgroundColor: color }}
              >
                {(clubName ?? 'AL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{clubName ?? 'ApexLeap'}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Performance Hub</p>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        }`}
                      >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 ? (
                          <span className="bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                            {item.badge > 99 ? "99+" : item.badge}
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
