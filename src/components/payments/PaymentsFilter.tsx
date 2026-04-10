'use client'

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState } from "react"
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react"

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pendiente', activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'paid',      label: 'Pagado',    activeClass: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'overdue',   label: 'Vencido',   activeClass: 'bg-red-500 text-white border-red-500' },
  { value: 'failed',    label: 'Fallido',   activeClass: 'bg-red-700 text-white border-red-700' },
  { value: 'cancelled', label: 'Cancelado', activeClass: 'bg-zinc-500 text-white border-zinc-500' },
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
  currentPaidFrom?: string
  currentPaidTo?: string
  currentSearch?: string
  currentAthleteName?: string
  currentAmountMin?: string
  currentAmountMax?: string
}

export function PaymentsFilter({
  currentStatus, currentMethod, currentFrom, currentTo,
  currentPaidFrom, currentPaidTo, currentSearch, currentAthleteName,
  currentAmountMin, currentAmountMax,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const hasAdvanced = !!(currentMethod || currentFrom || currentTo || currentPaidFrom || currentPaidTo || currentAmountMin || currentAmountMax)
  const [expanded, setExpanded] = useState(hasAdvanced)

  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    params.delete('page')
    return `${pathname}?${params.toString()}`
  }

  const advancedCount = [
    currentMethod,
    currentFrom || currentTo,
    currentPaidFrom || currentPaidTo,
    currentAmountMin || currentAmountMax,
  ].filter(Boolean).length

  const hasAny = !!(currentStatus || currentSearch || currentAthleteName || advancedCount > 0)

  return (
    <div className="space-y-3">
      {/* Primary row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <form method="get" action="/dashboard/payments" className="flex items-center gap-2">
          {currentStatus    && <input type="hidden" name="status"        value={currentStatus}    />}
          {currentMethod    && <input type="hidden" name="paymentMethod" value={currentMethod}    />}
          {currentFrom      && <input type="hidden" name="from"          value={currentFrom}      />}
          {currentTo        && <input type="hidden" name="to"            value={currentTo}        />}
          {currentPaidFrom  && <input type="hidden" name="paidFrom"      value={currentPaidFrom}  />}
          {currentPaidTo    && <input type="hidden" name="paidTo"        value={currentPaidTo}    />}
          {currentAmountMin && <input type="hidden" name="amountMin"     value={currentAmountMin} />}
          {currentAmountMax && <input type="hidden" name="amountMax"     value={currentAmountMax} />}
          <input
            type="text" name="athleteName" defaultValue={currentAthleteName ?? ''}
            placeholder="Buscar alumno..."
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-40"
          />
          <input
            type="text" name="search" defaultValue={currentSearch ?? ''}
            placeholder="Concepto..."
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-32"
          />
          <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            Buscar
          </button>
        </form>

        <div className="w-px h-6 bg-border" />

        {/* Status pills */}
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => router.push(buildUrl({ status: currentStatus === opt.value ? null : opt.value }))}
            className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors ${
              currentStatus === opt.value
                ? opt.activeClass
                : 'bg-background border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <div className="w-px h-6 bg-border" />

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`h-9 px-3 rounded-md border text-sm font-medium transition-colors flex items-center gap-1.5 ${
            expanded || advancedCount > 0
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-background border-input text-muted-foreground hover:text-foreground'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Más filtros
          {advancedCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {advancedCount}
            </span>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {hasAny && (
          <button
            onClick={() => router.push(pathname)}
            className="h-9 px-3 rounded-md border border-input text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Advanced panel */}
      {expanded && (
        <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
          {/* Method */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">Método de pago</span>
            {METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => router.push(buildUrl({ paymentMethod: currentMethod === opt.value ? null : opt.value }))}
                className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                  currentMethod === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date ranges */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Fecha vencimiento</span>
              <div className="flex items-center gap-2">
                <input type="date" defaultValue={currentFrom ?? ''}
                  className="flex-1 h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => router.push(buildUrl({ from: e.target.value || null }))} />
                <span className="text-xs text-muted-foreground">—</span>
                <input type="date" defaultValue={currentTo ?? ''}
                  className="flex-1 h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => router.push(buildUrl({ to: e.target.value || null }))} />
                {(currentFrom || currentTo) && (
                  <button onClick={() => router.push(buildUrl({ from: null, to: null }))} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Fecha de pago efectivo</span>
              <div className="flex items-center gap-2">
                <input type="date" defaultValue={currentPaidFrom ?? ''}
                  className="flex-1 h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => router.push(buildUrl({ paidFrom: e.target.value || null }))} />
                <span className="text-xs text-muted-foreground">—</span>
                <input type="date" defaultValue={currentPaidTo ?? ''}
                  className="flex-1 h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => router.push(buildUrl({ paidTo: e.target.value || null }))} />
                {(currentPaidFrom || currentPaidTo) && (
                  <button onClick={() => router.push(buildUrl({ paidFrom: null, paidTo: null }))} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Amount range */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">Rango de monto</span>
            <form method="get" action="/dashboard/payments" className="flex items-center gap-2">
              {currentStatus    && <input type="hidden" name="status"        value={currentStatus}    />}
              {currentMethod    && <input type="hidden" name="paymentMethod" value={currentMethod}    />}
              {currentFrom      && <input type="hidden" name="from"          value={currentFrom}      />}
              {currentTo        && <input type="hidden" name="to"            value={currentTo}        />}
              {currentPaidFrom  && <input type="hidden" name="paidFrom"      value={currentPaidFrom}  />}
              {currentPaidTo    && <input type="hidden" name="paidTo"        value={currentPaidTo}    />}
              {currentSearch    && <input type="hidden" name="search"        value={currentSearch}    />}
              {currentAthleteName && <input type="hidden" name="athleteName" value={currentAthleteName} />}
              <input type="number" name="amountMin" defaultValue={currentAmountMin ?? ''} min={0} placeholder="Mín."
                className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-24" />
              <span className="text-xs text-muted-foreground">—</span>
              <input type="number" name="amountMax" defaultValue={currentAmountMax ?? ''} min={0} placeholder="Máx."
                className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-24" />
              <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
                Aplicar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
