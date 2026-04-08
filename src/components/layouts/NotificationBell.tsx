'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, CreditCard, FileText, Repeat2, CheckCheck, UserPlus } from 'lucide-react'
import Link from 'next/link'

export interface NotificationItem {
  id: string
  type: 'payment' | 'document' | 'subscription' | 'enrollment' | 'payment_success'
  title: string
  description: string
  href: string
  count: number
}

interface Props {
  notifications: NotificationItem[]
}

const TYPE_CONFIG = {
  payment:      { icon: CreditCard, bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-600 dark:text-red-400' },
  payment_success: { icon: CreditCard, bg: 'bg-primary/12', text: 'text-primary' },
  document:     { icon: FileText,   bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  subscription: { icon: Repeat2,    bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-600 dark:text-blue-400' },
  enrollment:   { icon: UserPlus,   bg: 'bg-primary/12', text: 'text-primary' },
}

const STORAGE_KEY = 'apexleap-dismissed-notifications'

export function NotificationBell({ notifications }: Props) {
  const [open, setOpen]         = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setDismissed(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const active = notifications.filter(
    (n) => n.count > 0 && !dismissed.includes(`${n.id}-${n.count}`)
  )

  function dismiss(n: NotificationItem) {
    const key = `${n.id}-${n.count}`
    const next = [...dismissed, key]
    setDismissed(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  function dismissAll() {
    const next = notifications.map((n) => `${n.id}-${n.count}`)
    const merged = [...new Set([...dismissed, ...next])]
    setDismissed(merged)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)) } catch { /* ignore */ }
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {active.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
            {active.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Notificaciones</h3>
              {active.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {active.length}
                </span>
              )}
            </div>
            {active.length > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Limpiar todo
              </button>
            )}
          </div>

          {/* Items */}
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Bell className="w-5 h-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">Todo al día</p>
              <p className="text-xs text-muted-foreground">No hay notificaciones pendientes</p>
            </div>
          ) : (
            <ul>
              {active.map((n) => {
                const cfg = TYPE_CONFIG[n.type]
                const Icon = cfg.icon
                return (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3.5 border-b border-border last:border-b-0 hover:bg-accent/40 group transition-colors relative"
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.text}`} />
                    </div>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex-1 min-w-0 pr-1"
                    >
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.description}</p>
                    </Link>
                    <button
                      onClick={() => dismiss(n)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-accent transition-all mt-0.5 shrink-0"
                      aria-label="Cerrar notificación"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
