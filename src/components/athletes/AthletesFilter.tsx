'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

const ATHLETE_STATUS: { value: string | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'suspended', label: 'Suspendidos' },
]

const HEALTH_FILTERS: { value: string; label: string; dot: string }[] = [
  { value: 'healthy', label: 'Aptos', dot: 'bg-emerald-400' },
  { value: 'observation', label: 'Observación', dot: 'bg-amber-400' },
  { value: 'injured', label: 'Lesionados', dot: 'bg-red-500' },
]

const SUB_STATUS: { value: string | null; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 'active', label: 'Activa' },
  { value: 'expired', label: 'Vencida' },
  { value: 'paused', label: 'Pausada' },
  { value: 'cancelled', label: 'Cancelada' },
]

const SORT_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'Nombre A-Z' },
  { value: 'created_at', label: 'Más recientes' },
  { value: 'status', label: 'Por estado' },
  { value: 'last_attendance', label: 'Última asistencia' },
  { value: 'debt', label: 'Más deuda' },
  { value: 'paid', label: 'Más pagado' },
  { value: 'docs', label: 'Más documentos' },
  { value: 'last_payment', label: 'Último pago' },
]

type Category = { id: string; name: string; color: string | null }

interface Props {
  plans: Array<{ id: string; name: string }>
  categories: Category[]
}

export function AthletesFilter({ plans, categories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const get = useCallback((k: string) => sp.get(k) ?? '', [sp])

  const currentSearch = get('search')
  const currentStatus = get('status')
  const currentHealth = get('health')
  const currentPlanId = get('planId')
  const currentSubStatus = get('subStatus')
  const currentCategoryId = get('categoryId')
  const currentSort = get('sort')
  const inactiveOn = get('inactive') === '1'
  const expiredDocsOn = get('expiredDocs') === '1'
  const debtOld60On = get('debtOld60') === '1'
  const ageMin = get('ageMin')
  const ageMax = get('ageMax')
  const debtMin = get('debtMin')
  const debtMax = get('debtMax')
  const minAtt = get('minAtt')

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

  const advancedCount = useMemo(() => {
    let n = 0
    if (currentHealth) n++
    if (currentPlanId) n++
    if (currentSubStatus) n++
    if (currentCategoryId) n++
    if (currentSort) n++
    if (inactiveOn) n++
    if (expiredDocsOn) n++
    if (debtOld60On) n++
    if (ageMin || ageMax) n++
    if (debtMin || debtMax) n++
    if (minAtt) n++
    return n
  }, [
    currentHealth,
    currentPlanId,
    currentSubStatus,
    currentCategoryId,
    currentSort,
    inactiveOn,
    expiredDocsOn,
    debtOld60On,
    ageMin,
    ageMax,
    debtMin,
    debtMax,
    minAtt,
  ])

  const hasAdvanced = advancedCount > 0
  const [expanded, setExpanded] = useState(hasAdvanced)

  const hasAny =
    !!(
      currentSearch ||
      currentStatus ||
      currentHealth ||
      currentPlanId ||
      currentSubStatus ||
      currentCategoryId ||
      currentSort ||
      inactiveOn ||
      expiredDocsOn ||
      debtOld60On ||
      ageMin ||
      ageMax ||
      debtMin ||
      debtMax ||
      minAtt
    )

  return (
    <div className="space-y-3">
      {/* Fila principal — misma idea que PaymentsFilter: sin card envolvente */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[220px] sm:max-w-md sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            data-athletes-filter-search
            placeholder="Buscar por nombre, email o RUT..."
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-[5.25rem] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            defaultValue={currentSearch}
            onChange={(e) => {
              const val = e.target.value
              const w = window as Window & { _athSearch?: ReturnType<typeof setTimeout> }
              clearTimeout(w._athSearch)
              w._athSearch = setTimeout(() => updateParam('search', val || null), 350)
            }}
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            {currentSearch ? (
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => updateParam('search', null)}
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              className="h-7 shrink-0 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const el = document.querySelector<HTMLInputElement>('input[data-athletes-filter-search]')
                updateParam('search', el?.value?.trim() || null)
              }}
            >
              Buscar
            </button>
          </div>
        </div>

        <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />

        {ATHLETE_STATUS.map((opt) => {
          const active =
            (opt.value === null && !currentStatus) || (opt.value !== null && currentStatus === opt.value)
          return (
            <button
              key={opt.value ?? 'all'}
              type="button"
              onClick={() => {
                if (opt.value === null) {
                  router.push(buildUrl({ status: null }))
                  return
                }
                router.push(buildUrl({ status: currentStatus === opt.value ? null : opt.value }))
              }}
              className={`h-9 shrink-0 rounded-md border px-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          )
        })}

        <div className="h-6 w-px shrink-0 bg-border" />

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors ${
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
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Limpiar
          </button>
        ) : null}
      </div>

      {/* Panel — Salud, plan y filtros avanzados (como vista de pagos) */}
      {expanded ? (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          {/* Salud */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">Salud</span>
            {HEALTH_FILTERS.map((f) => {
              const active = currentHealth === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => updateParam('health', active ? null : f.value)}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary-foreground' : f.dot}`} />
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Planes */}
          {plans.length > 0 ? (
            <div className="flex flex-wrap items-start gap-2">
              <span className="w-24 shrink-0 pt-1 text-xs font-medium text-muted-foreground">Plan</span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => router.push(buildUrl({ planId: null }))}
                  className={`h-7 shrink-0 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                    !currentPlanId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todos
                </button>
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => router.push(buildUrl({ planId: currentPlanId === p.id ? null : p.id }))}
                    className={`h-7 max-w-[200px] shrink-0 truncate rounded-md border px-2.5 text-xs font-medium transition-colors ${
                      currentPlanId === p.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:text-foreground'
                    }`}
                    title={p.name}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

            {categories.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Categoría</span>
                <button
                  type="button"
                  onClick={() => router.push(buildUrl({ categoryId: null }))}
                  className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                    !currentCategoryId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todas
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        buildUrl({ categoryId: currentCategoryId === c.id ? null : c.id }),
                      )
                    }
                    className={`h-7 max-w-[160px] truncate rounded-md border px-2.5 text-xs font-medium ${
                      currentCategoryId === c.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:text-foreground'
                    }`}
                    title={c.name}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Suscripción</span>
              {SUB_STATUS.map((opt) => {
                const active =
                  (opt.value === null && !currentSubStatus) ||
                  (opt.value !== null && currentSubStatus === opt.value)
                return (
                  <button
                    key={opt.value ?? 'all'}
                    type="button"
                    onClick={() => {
                      if (opt.value === null) {
                        router.push(buildUrl({ subStatus: null }))
                        return
                      }
                      router.push(
                        buildUrl({ subStatus: currentSubStatus === opt.value ? null : opt.value }),
                      )
                    }}
                    className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Orden</span>
              {SORT_OPTIONS.map((opt) => {
                const active =
                  (opt.value === null && !currentSort) || (opt.value !== null && currentSort === opt.value)
                return (
                  <button
                    key={opt.value ?? 'name'}
                    type="button"
                    onClick={() => {
                      if (opt.value === null) {
                        router.push(buildUrl({ sort: null }))
                        return
                      }
                      router.push(buildUrl({ sort: currentSort === opt.value ? null : opt.value }))
                    }}
                    className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">Alertas</span>
              <button
                type="button"
                onClick={() => router.push(buildUrl({ inactive: inactiveOn ? null : '1' }))}
                className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                  inactiveOn
                    ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'border-input bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Sin check-in 30d
              </button>
              <button
                type="button"
                onClick={() => router.push(buildUrl({ expiredDocs: expiredDocsOn ? null : '1' }))}
                className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                  expiredDocsOn
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Doc. vencidos
              </button>
              <button
                type="button"
                onClick={() => router.push(buildUrl({ debtOld60: debtOld60On ? null : '1' }))}
                className={`h-7 rounded-md border px-2.5 text-xs font-medium ${
                  debtOld60On
                    ? 'border-destructive/50 bg-destructive/10 text-destructive'
                    : 'border-input bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Deuda +60 días
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Edad (años)</span>
                <form
                  method="get"
                  action="/dashboard/athletes"
                  className="flex flex-wrap items-center gap-2"
                >
                  {[...sp.entries()].map(([k, v]) =>
                    !['ageMin', 'ageMax', 'page'].includes(k) ? (
                      <input key={`${k}-${v}`} type="hidden" name={k} value={v} />
                    ) : null,
                  )}
                  <input
                    name="ageMin"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Mín."
                    defaultValue={ageMin}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <input
                    name="ageMax"
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Máx."
                    defaultValue={ageMax}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Aplicar
                  </button>
                  {(ageMin || ageMax) && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => router.push(buildUrl({ ageMin: null, ageMax: null }))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </form>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Deuda vencida ($)</span>
                <form
                  method="get"
                  action="/dashboard/athletes"
                  className="flex flex-wrap items-center gap-2"
                >
                  {[...sp.entries()].map(([k, v]) =>
                    !['debtMin', 'debtMax', 'page'].includes(k) ? (
                      <input key={`${k}-${v}`} type="hidden" name={k} value={v} />
                    ) : null,
                  )}
                  <input
                    name="debtMin"
                    type="number"
                    min={0}
                    placeholder="Mín."
                    defaultValue={debtMin}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <input
                    name="debtMax"
                    type="number"
                    min={0}
                    placeholder="Máx."
                    defaultValue={debtMax}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Aplicar
                  </button>
                  {(debtMin || debtMax) && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => router.push(buildUrl({ debtMin: null, debtMax: null }))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </form>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Check-ins totales (mín.)</span>
                <form
                  method="get"
                  action="/dashboard/athletes"
                  className="flex flex-wrap items-center gap-2"
                >
                  {[...sp.entries()].map(([k, v]) =>
                    !['minAtt', 'page'].includes(k) ? (
                      <input key={`${k}-${v}`} type="hidden" name={k} value={v} />
                    ) : null,
                  )}
                  <input
                    name="minAtt"
                    type="number"
                    min={0}
                    placeholder="Ej. 10"
                    defaultValue={minAtt}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Aplicar
                  </button>
                  {minAtt ? (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => router.push(buildUrl({ minAtt: null }))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </form>
              </div>
            </div>
        </div>
      ) : null}
    </div>
  )
}
