'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { ATHLETE_PAYMENT_STATUSES, ATHLETE_PAYMENT_STATUS_META } from '@/lib/payment-status'

const ATHLETE_STATUS: { value: string | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'suspended', label: 'Suspendidos' },
]

const HEALTH_FILTERS: { value: string; label: string; dot: string }[] = [
  { value: 'healthy', label: 'Aptos', dot: 'bg-emerald-500' },
  { value: 'observation', label: 'Observación', dot: 'bg-amber-500' },
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
  const currentPayStatus = get('payStatus')
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
      currentPayStatus ||
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

  const pillBase =
    'h-10 shrink-0 rounded-lg border px-3.5 text-sm font-medium transition-colors active:scale-[0.98]'
  const pillIdle =
    'border-input bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
  const smallPill = 'h-9 shrink-0 rounded-lg border px-3 text-[13px] font-medium transition-colors'

  return (
    <div className="space-y-3">
      {/* Búsqueda */}
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          data-athletes-filter-search
          placeholder="Buscar por nombre, email o RUT..."
          className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-[5.5rem] text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
          defaultValue={currentSearch}
          onChange={(e) => {
            const val = e.target.value
            const w = window as Window & { _athSearch?: ReturnType<typeof setTimeout> }
            clearTimeout(w._athSearch)
            w._athSearch = setTimeout(() => updateParam('search', val || null), 350)
          }}
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {currentSearch ? (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => updateParam('search', null)}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            className="h-8 shrink-0 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              const el = document.querySelector<HTMLInputElement>('input[data-athletes-filter-search]')
              updateParam('search', el?.value?.trim() || null)
            }}
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Estado de pago — el filtro más usado, siempre visible */}
      <ScrollRow label="Estado de pago">
        <button
          type="button"
          onClick={() => updateParam('payStatus', null)}
          className={`${pillBase} ${
            !currentPayStatus ? 'border-foreground/40 bg-foreground text-background' : pillIdle
          }`}
        >
          Todos
        </button>
        {ATHLETE_PAYMENT_STATUSES.map((key) => {
          const meta = ATHLETE_PAYMENT_STATUS_META[key]
          const active = currentPayStatus === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => updateParam('payStatus', active ? null : key)}
              className={`${pillBase} inline-flex items-center gap-2 ${active ? meta.active : pillIdle}`}
            >
              <span className={`h-2 w-2 rounded-full ${active ? 'bg-white' : meta.dot}`} />
              {meta.filterLabel}
            </button>
          )
        })}
      </ScrollRow>

      {/* Estado del alumno + acciones */}
      <ScrollRow label="Estado alumno">
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
              className={`${pillBase} ${
                active ? 'border-primary bg-primary text-primary-foreground' : pillIdle
              }`}
            >
              {opt.label}
            </button>
          )
        })}

        <span className="h-6 w-px shrink-0 bg-border" />

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`${pillBase} inline-flex items-center gap-1.5 ${
            expanded || advancedCount > 0 ? 'border-primary/30 bg-primary/10 text-primary' : pillIdle
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Más filtros
          {advancedCount > 0 ? (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {advancedCount}
            </span>
          ) : null}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {hasAny ? (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className={`${pillBase} inline-flex items-center gap-1.5 ${pillIdle}`}
          >
            <X className="h-4 w-4" /> Limpiar
          </button>
        ) : null}
      </ScrollRow>

      {/* Panel — Salud, plan y filtros avanzados */}
      {expanded ? (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
          {/* Salud */}
          <ScrollRow label="Salud">
            {HEALTH_FILTERS.map((f) => {
              const active = currentHealth === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => updateParam('health', active ? null : f.value)}
                  className={`${smallPill} inline-flex items-center gap-1.5 ${
                    active ? 'border-primary bg-primary text-primary-foreground' : pillIdle
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-primary-foreground' : f.dot}`} />
                  {f.label}
                </button>
              )
            })}
          </ScrollRow>

          {/* Planes */}
          {plans.length > 0 ? (
            <ScrollRow label="Plan">
              <button
                type="button"
                onClick={() => router.push(buildUrl({ planId: null }))}
                className={`${smallPill} ${
                  !currentPlanId ? 'border-primary bg-primary text-primary-foreground' : pillIdle
                }`}
              >
                Todos
              </button>
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => router.push(buildUrl({ planId: currentPlanId === p.id ? null : p.id }))}
                  className={`${smallPill} max-w-[200px] truncate ${
                    currentPlanId === p.id ? 'border-primary bg-primary text-primary-foreground' : pillIdle
                  }`}
                  title={p.name}
                >
                  {p.name}
                </button>
              ))}
            </ScrollRow>
          ) : null}

          {categories.length > 0 ? (
            <ScrollRow label="Categoría">
              <button
                type="button"
                onClick={() => router.push(buildUrl({ categoryId: null }))}
                className={`${smallPill} ${
                  !currentCategoryId ? 'border-primary bg-primary text-primary-foreground' : pillIdle
                }`}
              >
                Todas
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => router.push(buildUrl({ categoryId: currentCategoryId === c.id ? null : c.id }))}
                  className={`${smallPill} max-w-[160px] truncate ${
                    currentCategoryId === c.id ? 'border-primary bg-primary text-primary-foreground' : pillIdle
                  }`}
                  title={c.name}
                >
                  {c.name}
                </button>
              ))}
            </ScrollRow>
          ) : null}

          <ScrollRow label="Suscripción">
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
                    router.push(buildUrl({ subStatus: currentSubStatus === opt.value ? null : opt.value }))
                  }}
                  className={`${smallPill} ${
                    active ? 'border-primary bg-primary text-primary-foreground' : pillIdle
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </ScrollRow>

          <ScrollRow label="Orden">
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
                  className={`${smallPill} ${
                    active ? 'border-primary bg-primary text-primary-foreground' : pillIdle
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </ScrollRow>

          <ScrollRow label="Alertas">
            <button
              type="button"
              onClick={() => router.push(buildUrl({ inactive: inactiveOn ? null : '1' }))}
              className={`${smallPill} ${
                inactiveOn ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400' : pillIdle
              }`}
            >
              Sin check-in 30d
            </button>
            <button
              type="button"
              onClick={() => router.push(buildUrl({ expiredDocs: expiredDocsOn ? null : '1' }))}
              className={`${smallPill} ${
                expiredDocsOn ? 'border-primary bg-primary/10 text-primary' : pillIdle
              }`}
            >
              Doc. vencidos
            </button>
            <button
              type="button"
              onClick={() => router.push(buildUrl({ debtOld60: debtOld60On ? null : '1' }))}
              className={`${smallPill} ${
                debtOld60On ? 'border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-400' : pillIdle
              }`}
            >
              Deuda +60 días
            </button>
          </ScrollRow>

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
                  inputMode="numeric"
                  min={0}
                  max={120}
                  placeholder="Mín."
                  defaultValue={ageMin}
                  className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">—</span>
                <input
                  name="ageMax"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  placeholder="Máx."
                  defaultValue={ageMax}
                  className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Aplicar
                </button>
                {(ageMin || ageMax) && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(buildUrl({ ageMin: null, ageMax: null }))}
                  >
                    <X className="h-4 w-4" />
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
                  inputMode="numeric"
                  min={0}
                  placeholder="Mín."
                  defaultValue={debtMin}
                  className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">—</span>
                <input
                  name="debtMax"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Máx."
                  defaultValue={debtMax}
                  className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Aplicar
                </button>
                {(debtMin || debtMax) && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(buildUrl({ debtMin: null, debtMax: null }))}
                  >
                    <X className="h-4 w-4" />
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
                  inputMode="numeric"
                  min={0}
                  placeholder="Ej. 10"
                  defaultValue={minAtt}
                  className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Aplicar
                </button>
                {minAtt ? (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(buildUrl({ minAtt: null }))}
                  >
                    <X className="h-4 w-4" />
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
