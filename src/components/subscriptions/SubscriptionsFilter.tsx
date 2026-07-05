'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_OPTIONS: { value: string | null; label: string; activeClass: string }[] = [
  { value: null, label: 'Todas', activeClass: 'bg-primary text-primary-foreground border-primary' },
  { value: 'active', label: 'Activa', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'paused', label: 'Pausada', activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'cancelled', label: 'Cancelada', activeClass: 'bg-zinc-600 text-white border-zinc-600' },
  { value: 'expired', label: 'Expirada', activeClass: 'bg-slate-500 text-white border-slate-500' },
]

const METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  webpay: 'Webpay',
  mercadopago: 'MercadoPago',
  flow: 'Flow',
  khipu: 'Khipu',
  other: 'Otro',
}

interface Props {
  plans: Array<{ id: string; name: string }>
  paymentMethods: string[]
  currentStatus?: string
  currentPlanId: string
  currentSearch: string
  currentExpiring: string
  currentMethod: string
  currentSort: string
  currentPriceMin: string
  currentPriceMax: string
  currentStartFrom: string
  currentStartTo: string
}

export function SubscriptionsFilter({
  plans,
  paymentMethods,
  currentStatus,
  currentPlanId,
  currentSearch,
  currentExpiring,
  currentMethod,
  currentSort,
  currentPriceMin,
  currentPriceMax,
  currentStartFrom,
  currentStartTo,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const hasAdvanced = !!(
    currentMethod ||
    currentExpiring ||
    currentSort ||
    currentPriceMin ||
    currentPriceMax ||
    currentStartFrom ||
    currentStartTo
  )
  const [expanded, setExpanded] = useState(hasAdvanced)

  const buildUrl = useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(sp.toString())
      for (const [k, v] of Object.entries(overrides)) {
        if (v === null || v === '') params.delete(k)
        else params.set(k, v)
      }
      params.delete('page')
      const q = params.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [pathname, sp],
  )

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      router.push(buildUrl({ [key]: value }))
    },
    [router, buildUrl],
  )

  const advancedCount = [
    currentMethod,
    currentExpiring,
    currentSort,
    currentPriceMin || currentPriceMax,
    currentStartFrom || currentStartTo,
  ].filter(Boolean).length

  const hasAny = !!(
    currentStatus ||
    currentPlanId ||
    currentSearch ||
    advancedCount > 0
  )

  return (
    <div className="space-y-3">
      <div className="rounded-[20px] border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-9 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              defaultValue={currentSearch}
              onChange={(e) => {
                const val = e.target.value
                const w = window as Window & { _subSearch?: ReturnType<typeof setTimeout> }
                clearTimeout(w._subSearch)
                w._subSearch = setTimeout(() => updateParam('search', val || null), 350)
              }}
            />
            {currentSearch ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => updateParam('search', null)}
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:max-w-[55%] xl:max-w-none">
            <span className="hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:inline">Estado</span>
            {STATUS_OPTIONS.map((opt) => {
              const active =
                (opt.value === null && !currentStatus) ||
                (opt.value !== null && currentStatus === opt.value)
              return (
                <button
                  key={opt.value ?? 'all'}
                  type="button"
                  onClick={() => {
                    if (opt.value === null) {
                      router.push(buildUrl({ status: null }))
                      return
                    }
                    router.push(
                      buildUrl({ status: currentStatus === opt.value ? null : opt.value }),
                    )
                  }}
                  className={`h-8 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? opt.activeClass
                      : 'border-input bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {plans.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plan</span>
            <div className="flex max-w-full flex-1 flex-wrap gap-1.5 overflow-x-auto pb-0.5 sm:flex-nowrap">
              <button
                type="button"
                onClick={() => router.push(buildUrl({ planId: null }))}
                className={`h-7 shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  !currentPlanId
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-input bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                Todos
              </button>
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    router.push(
                      buildUrl({ planId: currentPlanId === p.id ? null : p.id }),
                    )
                  }
                  className={`h-7 max-w-[200px] shrink-0 truncate rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    currentPlanId === p.id
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-input bg-background text-muted-foreground hover:bg-muted'
                  }`}
                  title={p.name}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${
              expanded || advancedCount > 0
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-input bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Más filtros
            {advancedCount > 0 ? (
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {advancedCount}
              </span>
            ) : null}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {hasAny ? (
            <button
              type="button"
              onClick={() => router.push(pathname)}
              className="flex h-9 items-center gap-1.5 rounded-md border border-input px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Limpiar
            </button>
          ) : null}
        </div>

        {expanded ? (
          <div className="mt-3 space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            {paymentMethods.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Método de pago</span>
                <button
                  type="button"
                  onClick={() => router.push(buildUrl({ method: null }))}
                  className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                    !currentMethod
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todos
                </button>
                {paymentMethods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      router.push(buildUrl({ method: currentMethod === m ? null : m }))
                    }
                    className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                      currentMethod === m
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {METHOD_LABELS[m] ?? m}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Por vencer</span>
              {[
                { v: '', label: 'Cualquiera' },
                { v: '7', label: '7 días' },
                { v: '30', label: '30 días' },
              ].map(({ v, label }) => (
                <button
                  key={v || 'any'}
                  type="button"
                  onClick={() => router.push(buildUrl({ expiring: v || null }))}
                  className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                    (currentExpiring || '') === v
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Orden</span>
              <button
                type="button"
                onClick={() => router.push(buildUrl({ sort: null }))}
                className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                  !currentSort
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Predeterminado
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(buildUrl({ sort: currentSort === 'expiring' ? null : 'expiring' }))
                }
                className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                  currentSort === 'expiring'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Próximo vencimiento
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Rango precio plan</span>
                <form
                  method="get"
                  action="/dashboard/subscriptions"
                  className="flex flex-wrap items-center gap-2"
                >
                  {currentStatus ? <input type="hidden" name="status" value={currentStatus} /> : null}
                  {currentPlanId ? <input type="hidden" name="planId" value={currentPlanId} /> : null}
                  {currentSearch ? <input type="hidden" name="search" value={currentSearch} /> : null}
                  {currentExpiring ? <input type="hidden" name="expiring" value={currentExpiring} /> : null}
                  {currentMethod ? <input type="hidden" name="method" value={currentMethod} /> : null}
                  {currentSort ? <input type="hidden" name="sort" value={currentSort} /> : null}
                  <input
                    type="number"
                    name="priceMin"
                    min={0}
                    placeholder="Mín."
                    defaultValue={currentPriceMin}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <input
                    type="number"
                    name="priceMax"
                    min={0}
                    placeholder="Máx."
                    defaultValue={currentPriceMax}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Aplicar
                  </button>
                  {(currentPriceMin || currentPriceMax) && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => router.push(buildUrl({ priceMin: null, priceMax: null }))}
                      aria-label="Quitar rango de precio"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </form>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Inicio suscripción</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    defaultValue={currentStartFrom}
                    className="h-8 flex-1 min-w-[120px] rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    onChange={(e) => updateParam('startFrom', e.target.value || null)}
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <input
                    type="date"
                    defaultValue={currentStartTo}
                    className="h-8 flex-1 min-w-[120px] rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                    onChange={(e) => updateParam('startTo', e.target.value || null)}
                  />
                  {(currentStartFrom || currentStartTo) && (
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        router.push(buildUrl({ startFrom: null, startTo: null }))
                      }
                      aria-label="Quitar fechas"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
