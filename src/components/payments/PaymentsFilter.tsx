'use client'

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useState } from "react"
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react"

function getCurrentMonthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const start = `${y}-${m}-01`
  const end = new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

const PILL = 'h-10 shrink-0 rounded-lg border px-3.5 text-sm font-medium transition-colors active:scale-[0.98]'
const PILL_IDLE = 'bg-background border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground'
const SMALL_PILL = 'h-9 shrink-0 rounded-lg border px-3 text-[13px] font-medium transition-colors'

/**
 * Fila de filtros que en móvil desplaza horizontalmente en vez de apilar botones diminutos.
 * La etiqueta va arriba en móvil y a la izquierda desde `sm`.
 */
function ScrollRow({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="sm:flex sm:items-start sm:gap-2">
      {label ? (
        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 sm:mb-0 sm:w-28 sm:shrink-0 sm:pt-2 sm:text-xs sm:font-medium sm:normal-case sm:tracking-normal">
          {label}
        </span>
      ) : null}
      <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max items-center gap-2 sm:min-w-0 sm:flex-wrap">{children}</div>
      </div>
    </div>
  )
}

function MonthPresetButtons({
  currentFrom,
  currentTo,
  currentPaidFrom,
  currentPaidTo,
  currentStatus,
}: {
  currentFrom?: string
  currentTo?: string
  currentPaidFrom?: string
  currentPaidTo?: string
  currentStatus?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const { start, end } = getCurrentMonthRange()

  function applyPreset(preset: 'due-month' | 'paid-month') {
    const params = new URLSearchParams(sp.toString())
    params.delete('page')
    if (preset === 'due-month') {
      params.set('from', start)
      params.set('to', end)
      params.delete('paidFrom')
      params.delete('paidTo')
      params.delete('status')
    } else {
      params.set('paidFrom', start)
      params.set('paidTo', end)
      params.delete('from')
      params.delete('to')
      params.set('status', 'paid')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const dueMonthActive = currentFrom === start && currentTo === end && !currentPaidFrom && !currentPaidTo
  const paidMonthActive = currentPaidFrom === start && currentPaidTo === end && currentStatus === 'paid'

  return (
    <>
      <button
        type="button"
        onClick={() => applyPreset('due-month')}
        className={`${PILL} ${dueMonthActive ? 'bg-amber-500 text-white border-amber-500' : PILL_IDLE}`}
      >
        Cuotas del mes
      </button>
      <button
        type="button"
        onClick={() => applyPreset('paid-month')}
        className={`${PILL} ${paidMonthActive ? 'bg-emerald-500 text-white border-emerald-500' : PILL_IDLE}`}
      >
        Cobrados del mes
      </button>
    </>
  )
}

const STATUS_OPTIONS = [
  { value: 'paid',      label: 'Pagado',    dot: 'bg-emerald-500', activeClass: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'pending',   label: 'Pendiente', dot: 'bg-amber-500',   activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'overdue',   label: 'Vencido',   dot: 'bg-red-500',     activeClass: 'bg-red-500 text-white border-red-500' },
  { value: 'failed',    label: 'Fallido',   dot: 'bg-red-700',     activeClass: 'bg-red-700 text-white border-red-700' },
  { value: 'cancelled', label: 'Cancelado', dot: 'bg-zinc-500',    activeClass: 'bg-zinc-500 text-white border-zinc-500' },
]

const METHOD_OPTIONS = [
  { value: 'cash',        label: 'Efectivo' },
  { value: 'transfer',    label: 'Transferencia' },
  { value: 'webpay',      label: 'Webpay' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'flow',        label: 'Flow' },
  { value: 'khipu',       label: 'Khipu' },
  { value: 'other',       label: 'Otro' },
]

interface Props {
  className?: string
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
  className,
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
    <div className={`space-y-3${className ? ` ${className}` : ''}`}>
      {/* Búsqueda */}
      <form
        method="get"
        action="/dashboard/payments"
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
      >
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
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:max-w-[16rem] sm:text-sm"
        />
        <div className="flex items-center gap-2">
          <input
            type="text" name="search" defaultValue={currentSearch ?? ''}
            placeholder="Concepto..."
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring sm:h-10 sm:w-32 sm:flex-none sm:text-sm"
          />
          <button type="submit" className="h-11 shrink-0 rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 sm:h-10">
            Buscar
          </button>
        </div>
      </form>

      {/* Estado de pago */}
      <ScrollRow label="Estado de pago">
        <button
          type="button"
          onClick={() => router.push(buildUrl({ status: null }))}
          className={`${PILL} ${!currentStatus ? 'border-foreground/40 bg-foreground text-background' : PILL_IDLE}`}
        >
          Todos
        </button>
        {STATUS_OPTIONS.map((opt) => {
          const active = currentStatus === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => router.push(buildUrl({ status: active ? null : opt.value }))}
              className={`${PILL} inline-flex items-center gap-2 ${active ? opt.activeClass : PILL_IDLE}`}
            >
              <span className={`h-2 w-2 rounded-full ${active ? 'bg-white' : opt.dot}`} />
              {opt.label}
            </button>
          )
        })}
      </ScrollRow>

      {/* Atajos + avanzado */}
      <ScrollRow label="Atajos">
        <MonthPresetButtons
          currentFrom={currentFrom}
          currentTo={currentTo}
          currentPaidFrom={currentPaidFrom}
          currentPaidTo={currentPaidTo}
          currentStatus={currentStatus}
        />

        <span className="h-6 w-px shrink-0 bg-border" />

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`${PILL} inline-flex items-center gap-1.5 ${
            expanded || advancedCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : PILL_IDLE
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Más filtros
          {advancedCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {advancedCount}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {hasAny && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className={`${PILL} inline-flex items-center gap-1.5 ${PILL_IDLE}`}
          >
            <X className="w-4 h-4" /> Limpiar
          </button>
        )}
      </ScrollRow>

      {/* Advanced panel */}
      {expanded && (
        <div className="p-3 sm:p-4 rounded-lg border border-border bg-muted/30 space-y-4">
          {/* Method */}
          <ScrollRow label="Método de pago">
            {METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => router.push(buildUrl({ paymentMethod: currentMethod === opt.value ? null : opt.value }))}
                className={`${SMALL_PILL} ${
                  currentMethod === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : PILL_IDLE
                }`}
              >
                {opt.label}
              </button>
            ))}
          </ScrollRow>

          {/* Date ranges */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Fecha vencimiento</span>
              <div className="flex items-center gap-2">
                <input type="date" defaultValue={currentFrom ?? ''}
                  className="min-w-0 flex-1 h-10 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => router.push(buildUrl({ from: e.target.value || null }))} />
                <span className="text-xs text-muted-foreground">—</span>
                <input type="date" defaultValue={currentTo ?? ''}
                  className="min-w-0 flex-1 h-10 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => router.push(buildUrl({ to: e.target.value || null }))} />
                {(currentFrom || currentTo) && (
                  <button type="button" onClick={() => router.push(buildUrl({ from: null, to: null }))} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Fecha de pago efectivo</span>
              <div className="flex items-center gap-2">
                <input type="date" defaultValue={currentPaidFrom ?? ''}
                  className="min-w-0 flex-1 h-10 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => router.push(buildUrl({ paidFrom: e.target.value || null }))} />
                <span className="text-xs text-muted-foreground">—</span>
                <input type="date" defaultValue={currentPaidTo ?? ''}
                  className="min-w-0 flex-1 h-10 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => router.push(buildUrl({ paidTo: e.target.value || null }))} />
                {(currentPaidFrom || currentPaidTo) && (
                  <button type="button" onClick={() => router.push(buildUrl({ paidFrom: null, paidTo: null }))} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Amount range */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Rango de monto</span>
            <form method="get" action="/dashboard/payments" className="flex flex-wrap items-center gap-2">
              {currentStatus    && <input type="hidden" name="status"        value={currentStatus}    />}
              {currentMethod    && <input type="hidden" name="paymentMethod" value={currentMethod}    />}
              {currentFrom      && <input type="hidden" name="from"          value={currentFrom}      />}
              {currentTo        && <input type="hidden" name="to"            value={currentTo}        />}
              {currentPaidFrom  && <input type="hidden" name="paidFrom"      value={currentPaidFrom}  />}
              {currentPaidTo    && <input type="hidden" name="paidTo"        value={currentPaidTo}    />}
              {currentSearch    && <input type="hidden" name="search"        value={currentSearch}    />}
              {currentAthleteName && <input type="hidden" name="athleteName" value={currentAthleteName} />}
              <input type="number" inputMode="numeric" name="amountMin" defaultValue={currentAmountMin ?? ''} min={0} placeholder="Mín."
                className="h-10 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-24" />
              <span className="text-xs text-muted-foreground">—</span>
              <input type="number" inputMode="numeric" name="amountMax" defaultValue={currentAmountMax ?? ''} min={0} placeholder="Máx."
                className="h-10 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-24" />
              <button type="submit" className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90">
                Aplicar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
