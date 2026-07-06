export const dynamic = "force-dynamic"

import Link from "next/link"
import { getSubscriptions, getSubscriptionStats } from "@/lib/actions/subscriptions"
import { getPlans } from "@/lib/actions/plans"
import { getAthletes } from "@/lib/actions/athletes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Users, TrendingUp, PauseCircle, XCircle, AlertTriangle, DollarSign, Clock } from "lucide-react"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { DashboardPage, DashboardPageHeader } from "@/components/ui/dashboard-kit"
import { SubscriptionStatusButton } from "@/components/subscriptions/SubscriptionStatusButton"
import { RenewSubscriptionButton } from "@/components/subscriptions/RenewSubscriptionButton"
import { EditSubscriptionValidityButton } from "@/components/subscriptions/EditSubscriptionValidityButton"
import { ExportSubscriptionsButton } from "@/components/subscriptions/ExportSubscriptionsButton"
import { SubscriptionsFilter } from "@/components/subscriptions/SubscriptionsFilter"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Activa",     variant: "default" },
  paused:    { label: "Pausada",    variant: "secondary" },
  cancelled: { label: "Cancelada",  variant: "destructive" },
  expired:   { label: "Expirada",   variant: "outline" },
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "/mes", quarterly: "/trim.", semiannual: "/sem.",
  annual: "/año", single: "único",
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string; planId?: string; search?: string; expiring?: string; method?: string; sort?: string; priceMin?: string; priceMax?: string; startFrom?: string; startTo?: string }>
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page     = Number(params.page ?? 1)
  const planId   = params.planId   ?? ""
  const search   = params.search   ?? ""
  const expiring = params.expiring ?? ""
  const method    = params.method    ?? ""
  const sortBy    = params.sort      ?? ""
  const priceMinStr = params.priceMin ?? ""
  const priceMaxStr = params.priceMax ?? ""
  const priceMin  = priceMinStr ? Number(priceMinStr) : undefined
  const priceMax  = priceMaxStr ? Number(priceMaxStr) : undefined
  const startFrom = params.startFrom ?? ""
  const startTo   = params.startTo   ?? ""

  let subs: Awaited<ReturnType<typeof getSubscriptions>>["subscriptions"] = []
  let allSubs: Awaited<ReturnType<typeof getSubscriptions>>["subscriptions"] = []
  let total = 0
  let stats = { active: 0, paused: 0, cancelled: 0, expired: 0, mrr: 0 }
  let plans: Array<{ id: string; name: string }> = []
  let athletesWithoutSub = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const filterParams = { status: params.status, planId: planId || undefined, search: search || undefined, expiringIn: expiring ? Number(expiring) : undefined }
    const [allResult, statsResult, plansResult, athletesResult] = await Promise.all([
      getSubscriptions({ ...filterParams, page: 1, limit: 1000 }),
      getSubscriptionStats(),
      getPlans(),
      getAthletes({ limit: 500 }),
    ])
    // Los filtros que no viven en el backend (método, precio, fecha, orden) se aplican sobre el
    // conjunto completo y luego se pagina, para que filtros/orden/paginación sean consistentes
    // con el total real y no solo con la página visible.
    let aList = allResult.subscriptions
    if (method) aList = aList.filter((s) => s.payment_method === method)
    if (priceMin !== undefined) aList = aList.filter((s) => (((s.plans as { price?: number } | null)?.price ?? 0) >= priceMin))
    if (priceMax !== undefined) aList = aList.filter((s) => (((s.plans as { price?: number } | null)?.price ?? 0) <= priceMax))
    if (startFrom) aList = aList.filter((s) => s.start_date >= startFrom)
    if (startTo)   aList = aList.filter((s) => s.start_date <= startTo)
    if (sortBy === 'expiring') {
      aList = aList.slice().sort((a, b) => (a.end_date ?? '9999-12-31').localeCompare(b.end_date ?? '9999-12-31'))
    }
    allSubs = aList
    total = aList.length
    subs = aList.slice((page - 1) * 25, page * 25)
    stats = statsResult
    plans = plansResult.map((p) => ({ id: p.id, name: p.name }))
    const activeAthleteIds = new Set(athletesResult.athletes.filter((a) => a.status === 'active').map((a) => a.id))
    const withActiveSub = new Set(allResult.subscriptions.filter((s) => s.status === 'active').map((s) => s.athlete_id))
    athletesWithoutSub = [...activeAthleteIds].filter((id) => !withActiveSub.has(id)).length
  } catch {
    // show empty state
  }

  const CYCLE_MONTHLY: Record<string, number> = {
    monthly: 1, quarterly: 1/3, semiannual: 1/6, annual: 1/12, single: 0
  }
  const filteredMrr = allSubs
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => {
      const plan = s.plans as { price: number; billing_cycle: string } | null
      if (!plan) return sum
      return sum + plan.price * (CYCLE_MONTHLY[plan.billing_cycle] ?? 1)
    }, 0)

  const now = new Date()
  const in7  = new Date(now); in7.setDate(in7.getDate() + 7)
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30)
  const expiringIn7  = allSubs.filter((s) => s.status === 'active' && s.end_date && new Date(s.end_date) <= in7  && new Date(s.end_date) >= now).length
  const expiringIn30 = allSubs.filter((s) => s.status === 'active' && s.end_date && new Date(s.end_date) <= in30 && new Date(s.end_date) >= now).length
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const longExpired = allSubs.filter((s) => s.status === 'expired' && s.end_date && new Date(s.end_date) < thirtyDaysAgo)
  const paymentMethods = [...new Set(allSubs.map((s) => s.payment_method).filter(Boolean))] as string[]

  const subscriptionsListQuery = (pageOverride?: number) => {
    const o: Record<string, string> = {}
    if (params.status) o.status = params.status
    if (planId) o.planId = planId
    if (search) o.search = search
    if (expiring) o.expiring = expiring
    if (method) o.method = method
    if (sortBy) o.sort = sortBy
    if (priceMinStr) o.priceMin = priceMinStr
    if (priceMaxStr) o.priceMax = priceMaxStr
    if (startFrom) o.startFrom = startFrom
    if (startTo) o.startTo = startTo
    if (pageOverride !== undefined) o.page = String(pageOverride)
    const s = new URLSearchParams(o).toString()
    return s ? `?${s}` : ''
  }

  const hasActiveFilters = !!(params.status || planId || search || expiring || method || sortBy || priceMinStr || priceMaxStr || startFrom || startTo)

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Suscripciones"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{total} registros</span>
            {stats.mrr > 0 && <span className="text-green-600 font-medium">· MRR: ${Math.round(stats.mrr).toLocaleString('es-CL')}</span>}
            {expiringIn7 > 0 && <span className="text-red-600 font-medium">· {expiringIn7} vence{expiringIn7 > 1 ? 'n' : ''} esta semana</span>}
            {expiringIn7 === 0 && expiringIn30 > 0 && <span className="text-yellow-600 font-medium">· {expiringIn30} vence{expiringIn30 > 1 ? 'n' : ''} en 30 días</span>}
            {athletesWithoutSub > 0 && <span className="text-orange-600 font-medium">· {athletesWithoutSub} sin suscripción</span>}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportSubscriptionsButton subscriptions={allSubs.map((s) => ({
              ...s,
              athletes: s.athletes as { name: string } | null,
              plans: s.plans as { name: string; price: number; billing_cycle: string } | null,
            }))} />
            <Link href="/dashboard/subscriptions/new">
              <Button className="gap-2 rounded-xl font-black uppercase tracking-widest text-xs">
                <Plus className="w-4 h-4" />
                Asignar Plan
              </Button>
            </Link>
          </div>
        }
      />

      {longExpired.length > 0 && (
        <Link href="/dashboard/subscriptions?status=expired">
          <Card className="border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-800 font-medium">
                  {longExpired.length} suscripción{longExpired.length !== 1 ? 'es' : ''} vencida{longExpired.length !== 1 ? 's' : ''} hace más de 30 días sin renovar
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {(() => {
        const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        const todayISO = new Date().toISOString().split('T')[0]

        const stale = allSubs.filter((s) =>
          s.status === 'active' &&
          s.start_date &&
          new Date(s.start_date) < sixMonthsAgo &&
          (!s.end_date || new Date(s.end_date) >= now)
        )

        const showExpiring = stats.active > 4 && expiringIn7 > 0 && Math.round((expiringIn7 / stats.active) * 100) >= 20
        const expiringPct  = stats.active > 0 ? Math.round((expiringIn7 / stats.active) * 100) : 0

        const future = allSubs.filter((s) => s.status === 'active' && s.start_date && s.start_date > todayISO)
        const futureNames = future.slice(0, 2).map((s) => (s.athletes as { name?: string } | null)?.name ?? '—').join(', ')

        const hasAlerts = stale.length > 0 || showExpiring || future.length > 0
        if (!hasAlerts) return null

        const alertCount = [stale.length > 0, showExpiring, future.length > 0].filter(Boolean).length

        return (
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <CardTitle className="text-sm font-semibold">Alertas de suscripciones</CardTitle>
                <span className="ml-auto text-xs text-muted-foreground">{alertCount} alerta{alertCount !== 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pt-1 pb-2">
              <div className="divide-y divide-border">
                {showExpiring && (
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-0.5 h-10 rounded-full bg-orange-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {expiringIn7} suscripcion{expiringIn7 !== 1 ? 'es' : ''} vence{expiringIn7 === 1 ? '' : 'n'} esta semana
                        <span className="text-muted-foreground font-normal"> · {expiringPct}% de activas</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Contactar para renovación anticipada</p>
                    </div>
                    <Link href="/dashboard/subscriptions?expiring=7" className="text-xs text-primary hover:underline shrink-0">Ver →</Link>
                  </div>
                )}
                {stale.length > 0 && (
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-0.5 h-10 rounded-full bg-amber-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {stale.length} suscripción{stale.length !== 1 ? 'es' : ''} activa{stale.length !== 1 ? 's' : ''} sin renovarse
                        <span className="text-muted-foreground font-normal"> · más de 6 meses</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Verificar si el plan sigue vigente</p>
                    </div>
                    <Link href="/dashboard/subscriptions?status=active" className="text-xs text-primary hover:underline shrink-0">Ver →</Link>
                  </div>
                )}
                {future.length > 0 && (
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-0.5 h-10 rounded-full bg-blue-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {future.length} suscripción{future.length !== 1 ? 'es' : ''} con fecha de inicio en el futuro
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {futureNames}{future.length > 2 ? ` +${future.length - 2} más` : ''}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Activas</CardTitle>
              <InfoTooltip text="Suscripciones con estado activo y dentro de su período de vigencia." />
            </div>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">suscriptores vigentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR estimado</CardTitle>
              <InfoTooltip text="Monthly Recurring Revenue: ingresos mensuales recurrentes estimados sumando el valor de todas las suscripciones activas." />
            </div>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Math.round(stats.mrr).toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground">ingreso mensual recurrente</p>
          </CardContent>
        </Card>
        {stats.active > 0 && stats.mrr > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ingreso Promedio</CardTitle>
                <InfoTooltip text="MRR dividido por la cantidad de suscripciones activas. Valor promedio mensual por cliente." />
              </div>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Math.round(stats.mrr / stats.active).toLocaleString('es-CL')}</div>
              <p className="text-xs text-muted-foreground">por suscriptor activo/mes</p>
            </CardContent>
          </Card>
        )}
        {filteredMrr > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">ARR proyectado</CardTitle>
                <InfoTooltip text="Annual Recurring Revenue: el MRR multiplicado por 12. Proyección de ingresos anuales si se mantiene el nivel actual." />
              </div>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-600">${Math.round(filteredMrr * 12).toLocaleString("es-CL")}</div>
              <p className="text-xs text-muted-foreground">MRR × 12 meses</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pausadas</CardTitle>
              <InfoTooltip text="Suscripciones temporalmente suspendidas. El atleta no paga ni tiene acceso, pero mantiene su historial." />
            </div>
            <PauseCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
            <p className="text-xs text-muted-foreground">en pausa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
              <InfoTooltip text="Suscripciones dadas de baja definitivamente este mes. Contribuyen al cálculo de churn." />
            </div>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">canceladas / expiradas</p>
          </CardContent>
        </Card>
        {(() => {
          const base = stats.active + stats.cancelled + stats.expired
          if (base < 2) return null
          const rate = Math.round((stats.active / base) * 100)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Retención</CardTitle>
                  <InfoTooltip text="Suscripciones activas sobre el total histórico (activas + canceladas + expiradas). Aproximación de retención; no mide la renovación real de las vencidas." />
                </div>
                <TrendingUp className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${rate >= 70 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{rate}%</div>
                <p className="text-xs text-muted-foreground">{stats.active} activas de {base} totales</p>
              </CardContent>
            </Card>
          )
        })()}
        {(() => {
          const cancelled = allSubs.filter((s) => s.status === 'cancelled' && s.start_date && s.end_date)
          if (cancelled.length < 2) return null
          const avgDays = Math.round(
            cancelled.reduce((sum, s) => {
              const diff = new Date(s.end_date!).getTime() - new Date(s.start_date!).getTime()
              return sum + diff / (1000 * 60 * 60 * 24)
            }, 0) / cancelled.length
          )
          if (avgDays <= 0) return null
          const avgMonths = Math.round(avgDays / 30)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Dur. Prom. Canceladas</CardTitle>
                  <InfoTooltip text="Cuántos días duraron en promedio las suscripciones antes de ser canceladas. Mayor duración = mayor retención." />
                </div>
                <XCircle className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-600">{avgMonths}m</div>
                <p className="text-xs text-muted-foreground">{cancelled.length} canceladas · {avgDays}d promedio</p>
              </CardContent>
            </Card>
          )
        })()}
        {(() => {
          const curMonth = new Date().toISOString().slice(0, 7)
          const cancelledThisMonth = allSubs.filter((s) => {
            if (s.status !== 'cancelled') return false
            // Preferir cancelled_at (columna dedicada, migración 036); fallback a updated_at
            // mientras no esté poblada, para no romper el número antes de aplicar la migración.
            const when = (s as { cancelled_at?: string | null }).cancelled_at
              ?? (s as { updated_at?: string }).updated_at
            return when?.startsWith(curMonth) ?? false
          }).length
          if (cancelledThisMonth === 0) return null
          const churnRate = stats.active + cancelledThisMonth > 0
            ? Math.round((cancelledThisMonth / (stats.active + cancelledThisMonth)) * 100)
            : 0
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Churn Mensual</CardTitle>
                  <InfoTooltip text="Tasa de cancelación mensual: canceladas / (activas + canceladas). Por debajo del 5% es saludable." />
                </div>
                <XCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${churnRate >= 10 ? 'text-red-600' : churnRate >= 5 ? 'text-orange-600' : 'text-yellow-600'}`}>{churnRate}%</div>
                <p className="text-xs text-muted-foreground">{cancelledThisMonth} cancelada{cancelledThisMonth !== 1 ? 's' : ''} este mes</p>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Active subscriptions by plan */}
      {plans.length > 0 && (() => {
        const byPlan = allSubs
          .filter((s) => s.status === 'active')
          .reduce<Record<string, { name: string; count: number; mrr: number }>>((acc, s) => {
            const plan = s.plans as { id: string; name: string; price: number; billing_cycle: string } | null
            if (!plan) return acc
            if (!acc[plan.id]) acc[plan.id] = { name: plan.name, count: 0, mrr: 0 }
            acc[plan.id].count++
            acc[plan.id].mrr += plan.price * (CYCLE_MONTHLY[plan.billing_cycle] ?? 1)
            return acc
          }, {})
        const entries = Object.values(byPlan).sort((a, b) => b.count - a.count)
        if (entries.length === 0) return null
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium">Por plan:</span>
            {entries.map((p) => (
              <span key={p.name} className="px-2.5 py-1 rounded-full border text-xs font-medium bg-primary/5 border-primary/20 text-primary">
                {p.name} <span className="font-bold">{p.count}</span>
                {p.mrr > 0 && <span className="text-muted-foreground ml-1">· ${Math.round(p.mrr).toLocaleString('es-CL')}/mes</span>}
              </span>
            ))}
          </div>
        )
      })()}

      <SubscriptionsFilter
        plans={plans}
        paymentMethods={paymentMethods}
        currentStatus={params.status}
        currentPlanId={planId}
        currentSearch={search}
        currentExpiring={expiring}
        currentMethod={method}
        currentSort={sortBy}
        currentPriceMin={priceMinStr}
        currentPriceMax={priceMaxStr}
        currentStartFrom={startFrom}
        currentStartTo={startTo}
      />

      {/* List */}
      {subs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-40" />
            {hasActiveFilters ? (
              <>
                <h3 className="font-semibold text-lg mb-1">Sin resultados</h3>
                <p className="text-muted-foreground mb-4">Ninguna suscripción coincide con los filtros aplicados.</p>
                <Link href="/dashboard/subscriptions">
                  <Button variant="outline">Limpiar filtros</Button>
                </Link>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg mb-1">Sin suscripciones</h3>
                <p className="text-muted-foreground mb-4">Asigna un plan a tus alumnos</p>
                <Link href="/dashboard/subscriptions/new">
                  <Button>Asignar Plan</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {subs.map((sub) => {
            const athlete = sub.athletes as { id: string; name: string; email?: string | null; photo_url: string | null } | null
            const plan = sub.plans as { id: string; name: string; price: number; billing_cycle: string } | null
            const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.cancelled

            const daysLeft = sub.end_date && sub.status === 'active'
              ? Math.ceil((new Date(`${sub.end_date}T12:00:00`).getTime() - today.getTime()) / 86400000)
              : null
            const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
            const isExpired   = daysLeft !== null && daysLeft < 0

            return (
              <Card key={sub.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm font-semibold">
                        {athlete?.name?.slice(0, 2).toUpperCase() ?? "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {athlete && (
                          <Link href={`/dashboard/athletes/${athlete.id}`} className="font-semibold hover:underline">
                            {athlete.name}
                          </Link>
                        )}
                        <span className="text-muted-foreground text-sm">·</span>
                        {plan && (
                          <Link href={`/dashboard/plans/${plan.id}`} className="text-sm text-muted-foreground hover:underline">
                            {plan.name}
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {athlete?.email && <span className="truncate max-w-[180px]">{athlete.email}</span>}
                        {(() => {
                          const pmts = (sub.payments as Array<{ paid_at: string | null; status: string }> | null) ?? []
                          const lastPaid = pmts
                            .filter((p) => p.status === 'paid' && p.paid_at)
                            .map((p) => p.paid_at!)
                            .sort()
                            .at(-1)
                          if (!lastPaid) return null
                          return <span>Último pago: {new Date(lastPaid).toLocaleDateString('es-CL')}</span>
                        })()}
                        {(() => {
                          const pmts = (sub.payments as Array<{ paid_at: string | null; status: string }> | null) ?? []
                          const paidMonths = pmts
                            .filter((p) => p.status === 'paid' && p.paid_at)
                            .map((p) => p.paid_at!.slice(0, 7))
                            .filter((v, i, a) => a.indexOf(v) === i)
                            .sort()
                          if (paidMonths.length < 2) return null
                          let streak = 1
                          for (let i = paidMonths.length - 1; i > 0; i--) {
                            const cur  = new Date(paidMonths[i] + '-01')
                            const prev = new Date(paidMonths[i - 1] + '-01')
                            const diff = (cur.getFullYear() - prev.getFullYear()) * 12 + cur.getMonth() - prev.getMonth()
                            if (diff === 1) streak++; else break
                          }
                          if (streak < 2) return null
                          return <span className="text-green-600 font-medium">🔥 {streak} meses seguidos</span>
                        })()}
                        <span>
                          Desde {new Date(`${sub.start_date}T12:00:00`).toLocaleDateString("es-CL")}
                          {sub.status === 'active' && (() => {
                            const days = Math.floor((today.getTime() - new Date(`${sub.start_date}T12:00:00`).getTime()) / 86400000)
                            return days > 0 ? <span className="ml-1 text-muted-foreground">({days}d activa)</span> : null
                          })()}
                        </span>
                        {sub.end_date && <span>Hasta {new Date(`${sub.end_date}T12:00:00`).toLocaleDateString("es-CL")}</span>}
                        {daysLeft !== null && daysLeft >= 0 && (
                          <span className={expiringSoon ? 'text-yellow-600 font-medium' : 'text-muted-foreground'}>
                            {expiringSoon && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                            {daysLeft === 0 ? 'Vence hoy' : `${daysLeft}d restantes`}
                          </span>
                        )}
                        {isExpired && <span className="text-destructive font-medium">Vencida</span>}
                        {sub.auto_renew && <span className="text-green-600">↺ Auto-renovación</span>}
                        {sub.auto_renew && sub.end_date && sub.status === 'active' && daysLeft !== null && daysLeft >= 0 && (
                          <span className="text-blue-600 font-medium">
                            Próximo cobro: {new Date(`${sub.end_date}T12:00:00`).toLocaleDateString('es-CL')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-2">
                        {plan && (
                          <span className="font-bold">
                            ${Number(plan.price).toLocaleString("es-CL")}
                            <span className="text-xs font-normal text-muted-foreground ml-0.5">
                              {CYCLE_LABELS[plan.billing_cycle] ?? ""}
                            </span>
                          </span>
                        )}
                        <Badge variant={isExpired ? 'outline' : cfg.variant}>{isExpired ? 'Vencida' : cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <EditSubscriptionValidityButton
                          subscriptionId={sub.id}
                          endDate={sub.end_date}
                          currentPeriodEnd={
                            (sub as { current_period_end?: string | null }).current_period_end ?? null
                          }
                        />
                        {(sub.status === 'expired' || sub.status === 'cancelled') && (
                          <RenewSubscriptionButton subscriptionId={sub.id} />
                        )}
                        <SubscriptionStatusButton subscriptionId={sub.id} currentStatus={sub.status as "active" | "paused" | "cancelled" | "expired"} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} de {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/dashboard/subscriptions${subscriptionsListQuery(page - 1)}`}>
                <button type="button" className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">← Anterior</button>
              </Link>
            )}
            {page * 25 < total && (
              <Link href={`/dashboard/subscriptions${subscriptionsListQuery(page + 1)}`}>
                <button type="button" className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">Siguiente →</button>
              </Link>
            )}
          </div>
        </div>
      )}
    </DashboardPage>
  )
}
