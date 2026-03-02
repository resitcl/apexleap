'use client'

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { X, SlidersHorizontal } from "lucide-react"

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pendiente', color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400' },
  { value: 'paid',      label: 'Pagado',    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400' },
  { value: 'overdue',   label: 'Vencido',   color: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-200 dark:border-zinc-700 dark:text-zinc-400' },
]

const METHOD_OPTIONS = [
  { value: 'cash',        label: 'Efectivo' },
  { value: 'transfer',    label: 'Transferencia' },
  { value: 'card',        label: 'Tarjeta' },
  { value: 'webpay',      label: 'Webpay' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'flow',        label: 'Flow' },
]

interface Props {
  currentStatus?: string
  currentMethod?: string
  currentFrom?: string
  currentTo?: string
  currentDueFrom?: string
  currentDueTo?: string
}

export function PaymentsFilter({ currentStatus, currentMethod, currentFrom, currentTo, currentDueFrom, currentDueTo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    params.delete('page')
    return `${pathname}?${params.toString()}`
  }

  const pill = (active: boolean, color?: string) =>
    active
      ? `${color} shadow-sm border`
      : 'bg-transparent border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'

  const activeCount = [currentStatus, currentMethod, currentFrom || currentTo, currentDueFrom || currentDueTo].filter(Boolean).length
  const hasAny = activeCount > 0

  return (
    <div className="space-y-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Filtros</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        {hasAny && (
          <button
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" /> Limpiar todo
          </button>
        )}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-14 shrink-0">Estado</span>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => router.push(buildUrl({ status: currentStatus === opt.value ? null : opt.value }))}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all ${pill(currentStatus === opt.value, opt.color)}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Method pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-14 shrink-0">Método</span>
        {METHOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => router.push(buildUrl({ paymentMethod: currentMethod === opt.value ? null : opt.value }))}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              currentMethod === opt.value
                ? 'bg-foreground text-background border border-foreground shadow-sm'
                : 'bg-transparent border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Date ranges */}
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-14 shrink-0">Pago</span>
          <input type="date" defaultValue={currentFrom ?? ''}
            className="flex-1 h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => router.push(buildUrl({ from: e.target.value || null }))} />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" defaultValue={currentTo ?? ''}
            className="flex-1 h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => router.push(buildUrl({ to: e.target.value || null }))} />
          {(currentFrom || currentTo) && (
            <button onClick={() => router.push(buildUrl({ from: null, to: null }))} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide w-14 shrink-0">Vence</span>
          <input type="date" defaultValue={currentDueFrom ?? ''}
            className="flex-1 h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => router.push(buildUrl({ dueFrom: e.target.value || null }))} />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" defaultValue={currentDueTo ?? ''}
            className="flex-1 h-8 px-2 rounded-lg border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => router.push(buildUrl({ dueTo: e.target.value || null }))} />
          {(currentDueFrom || currentDueTo) && (
            <button onClick={() => router.push(buildUrl({ dueFrom: null, dueTo: null }))} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>
    </div>
  )
}
