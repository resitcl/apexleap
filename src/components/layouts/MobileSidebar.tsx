'use client'

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, ShieldAlert } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"

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
  /** Subtítulo bajo el nombre del club (ej. Performance Hub) */
  subtitle?: string | null
  /** Enlace Super Admin (solo si el usuario es super admin) */
  showSuperAdminLink?: boolean
  /** Estilo del cajón forzado oscuro (legacy; preferir tema + destructiveNav) */
  variant?: "default" | "dark"
  /** Ítems activos en rojo / destructive (p. ej. Super Admin HQ) */
  destructiveNav?: boolean
  /** Pie opcional (ej. enlace “Volver” en vista HQ) */
  footerExtra?: ReactNode
  /** Mostrar interruptor de tema al pie del menú móvil */
  showThemeToggle?: boolean
}

export function MobileSidebar({
  groups,
  clubName,
  logoUrl,
  brandColor,
  subtitle = "Performance Hub",
  showSuperAdminLink = false,
  variant = "default",
  destructiveNav = false,
  footerExtra,
  showThemeToggle = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const pathname = usePathname()
  const color = brandColor ?? "#000000"
  const isDark = variant === "dark"
  const redActive = isDark || destructiveNav
  const drawerSurface = isDark
    ? "bg-zinc-950 border-zinc-800/80 text-zinc-100"
    : "bg-sidebar border-sidebar-border text-foreground"
  const mutedLabel = isDark ? "text-zinc-500" : "text-muted-foreground/50"

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setDismissed(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

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
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors shrink-0 -ml-1 active:scale-95 ${
          isDark ? "hover:bg-zinc-800 text-zinc-100" : "hover:bg-muted/60"
        }`}
        aria-label="Abrir menú"
        aria-expanded={open}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay — por encima del chat flotante (z-50) */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-[101] h-dvh w-[min(100vw-3rem,20rem)] max-w-[88vw] border-r flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${drawerSurface} ${
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Club header — el inset va en el borde exterior; con `box-content` el padding horizontal
            se sumaba al ancho y la cabecera desbordaba el cajón. */}
        <div
          className={`shrink-0 border-b pt-[env(safe-area-inset-top)] ${
            isDark ? "border-zinc-800/80" : "border-sidebar-border"
          }`}
        >
        <div className="h-16 flex items-center justify-between px-4">
          <Link
            href={isDark ? "/super-admin" : "/dashboard"}
            className="flex items-center gap-3 min-w-0 flex-1"
            onClick={() => setOpen(false)}
          >
            {logoUrl ? (
              <Image src={logoUrl} alt={clubName ?? "Club"} width={38} height={38} className="rounded-xl object-cover shrink-0" />
            ) : (
              <div
                className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm shadow-sm"
                style={{ backgroundColor: color }}
              >
                {(clubName ?? "AL").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-[15px] leading-tight truncate">{clubName ?? "ApexLeap"}</p>
              <p className={`text-[11px] leading-tight font-medium uppercase tracking-wider ${mutedLabel}`}>
                {subtitle ?? ""}
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors shrink-0 ml-2 ${
              isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-muted/60 text-muted-foreground"
            }`}
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-4 px-2 min-h-0">
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-5" : ""}>
              {group.label && (
                <div className="flex items-center gap-2 px-2 mb-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.18em] shrink-0 ${
                      isDark ? "text-zinc-600" : "text-muted-foreground/45"
                    }`}
                  >
                    {group.label}
                  </span>
                  <div className={`h-px flex-1 ${isDark ? "bg-zinc-800" : "bg-border/40"}`} />
                </div>
              )}
              <ul className="space-y-px">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      item.href !== "/super-admin" &&
                      pathname.startsWith(`${item.href}/`))
                  const showBadge =
                    !!item.badge &&
                    item.badge > 0 &&
                    !dismissed.includes(`${item.notificationId}-${item.badge}`)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          setOpen(false)
                          dismissBadge(item.notificationId, item.badge)
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15px] transition-colors active:scale-[0.99] ${
                          isActive
                            ? redActive
                              ? "bg-gradient-to-br from-destructive/25 via-destructive/12 to-destructive/6 text-destructive font-semibold ring-1 ring-inset ring-destructive/20"
                              : "bg-gradient-to-br from-primary/[0.22] via-primary/[0.10] to-primary/[0.04] dark:from-primary/[0.28] dark:via-primary/[0.14] dark:to-primary/[0.06] text-primary font-semibold ring-1 ring-inset ring-primary/15"
                            : isDark
                              ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                              : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        <span
                          className={`shrink-0 ${
                            isActive
                              ? redActive
                                ? "text-destructive"
                                : "text-primary"
                              : isDark
                                ? "text-zinc-500"
                                : "text-muted-foreground/50"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 leading-tight">{item.label}</span>
                        {showBadge ? (
                          <span className="bg-destructive text-destructive-foreground text-[11px] font-black rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shrink-0">
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

        {showSuperAdminLink && (
          <div className={`shrink-0 border-t px-2 py-2 ${isDark ? "border-zinc-800/80" : "border-border"}`}>
            <Link
              href="/super-admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Super Admin
            </Link>
          </div>
        )}

        {footerExtra && (
          <div className={`shrink-0 border-t px-2 py-2 ${isDark ? "border-zinc-800/80" : "border-border"}`}>
            {footerExtra}
          </div>
        )}

        {showThemeToggle && (
          <div
            className={`shrink-0 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] ${
              isDark ? "border-zinc-800/80" : "border-border"
            }`}
          >
            <ThemeToggle />
          </div>
        )}
      </div>
    </>
  )
}
