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
import { SubscriptionStatusButton } from "@/components/subscriptions/SubscriptionStatusButton"
import { RenewSubscriptionButton } from "@/components/subscriptions/RenewSubscriptionButton"
import { ExportSubscriptionsButton } from "@/components/subscriptions/ExportSubscriptionsButton"

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
  searchParams: Promise<{ status?: string; page?: string; planId?: string; search?: string; expiring?: string; method?: string; sort?: string }>
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page     = Number(params.page ?? 1)
  const planId   = params.planId   ?? ""
  const search   = params.search   ?? ""
  const expiring = params.expiring ?? ""
  const method   = params.method   ?? ""
  const sortBy   = params.sort     ?? ""

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
    const [result, allResult, statsResult, plansResult, athletesResult] = await Promise.all([
      getSubscriptions({ ...filterParams, page, limit: 25 }),
      getSubscriptions({ ...filterParams, page: 1, limit: 1000 }),
      getSubscriptionStats(),
      getPlans(),
      getAthletes({ limit: 500 }),
    ])
    let sList = result.subscriptions
    let aList  = allResult.subscriptions
    if (method) {
      sList = sList.filter((s) => s.payment_method === method)
      aList  = aList.filter((s) => s.payment_method === method)
    }
    if (sortBy === 'expiring') {
      sList = sList.slice().sort((a, b) => {
        const dA = a.end_date ?? '9999-12-31'
        const dB = b.end_date ?? '9999-12-31'
        return dA.localeCompare(dB)
      })
    }
    subs = sList
    allSubs = aList
    total = result.total
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
  const hasFilters = !!(params.status || planId || search || expiring)

  const now = new Date()
  const in7  = new Date(now); in7.setDate(in7.getDate() + 7)
  const in30 = new Date(now); in30.setDate(in30.getDate() + 30)
  const expiringIn7  = allSubs.filter((s) => s.status === 'active' && s.end_date && new Date(s.end_date) <= in7  && new Date(s.end_date) >= now).length
  const expiringIn30 = allSubs.filter((s) => s.status === 'active' && s.end_date && new Date(s.end_date) <= in30 && new Date(s.end_date) >= now).length
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const longExpired = allSubs.filter((s) => s.status === 'expired' && s.end_date && new Date(s.end_date) < thirtyDaysAgo)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suscripciones</h1>
          <p className="text-muted-foreground">
            {total} registros
            {hasFilters && filteredMrr > 0 && (
              <span className="ml-2 text-green-600 font-medium">
                · MRR filtrado: ${Math.round(filteredMrr).toLocaleString('es-CL')}
              </span>
            )}
            {expiringIn7 > 0 && (
              <span className="ml-2 text-red-600 font-medium">· {expiringIn7} vence{expiringIn7 > 1 ? 'n' : ''} esta semana</span>
            )}
            {expiringIn7 === 0 && expiringIn30 > 0 && (
              <span className="ml-2 text-yellow-600 font-medium">· {expiringIn30} vence{expiringIn30 > 1 ? 'n' : ''} este mes</span>
            )}
            {athletesWithoutSub > 0 && (
              <span className="ml-2 text-orange-600 font-medium">· ⚠ {athletesWithoutSub} activo{athletesWithoutSub !== 1 ? 's' : ''} sin suscripción</span>
            )}
            {(() => {
              const noMethod = allSubs.filter((s) => s.status === 'active' && !s.payment_method).length
              return noMethod > 0 ? (
                <span className="ml-2 text-yellow-600 font-medium">· ⚠ {noMethod} activa{noMethod !== 1 ? 's' : ''} sin método de pago</span>
              ) : null
            })()}
            {(() => {
              const counts: Record<string, { name: string; count: number }> = {}
              for (const s of allSubs.filter((s) => s.status === 'active')) {
                const plan = s.plans as { name: string } | null
                if (!plan) continue
                const key = plan.name
                if (!counts[key]) counts[key] = { name: plan.name, count: 0 }
                counts[key].count++
              }
              const top = Object.values(counts).sort((a, b) => b.count - a.count)[0]
              return top ? (
                <span className="ml-2 text-primary font-medium">· {top.name} ({top.count})</span>
              ) : null
            })()}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportSubscriptionsButton subscriptions={allSubs.map((s) => ({
            ...s,
            athletes: s.athletes as { name: string } | null,
            plans: s.plans as { name: string; price: number; billing_cycle: string } | null,
          }))} />
          <Link href="/dashboard/subscriptions/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Asignar Plan
            </Button>
          </Link>
        </div>
      </div>

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
        const stale = allSubs.filter((s) =>
          s.status === 'active' &&
          s.start_date &&
          new Date(s.start_date) < sixMonthsAgo &&
          (!s.end_date || new Date(s.end_date) >= now)
        )
        if (stale.length === 0) return null
        return (
          <Link href="/dashboard/subscriptions?status=active">
            <Card className="border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800 font-medium">
                    {stale.length} suscripción{stale.length !== 1 ? 'es' : ''} activa{stale.length !== 1 ? 's' : ''} lleva{stale.length !== 1 ? 'n' : ''} más de 6 meses sin renovarse
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {stats.active > 4 && expiringIn7 > 0 && Math.round((expiringIn7 / stats.active) * 100) >= 20 && (
        <Link href="/dashboard/subscriptions?expiring=7">
          <Card className="border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
                <p className="text-sm text-orange-800 font-medium">
                  {expiringIn7} suscripciones ({Math.round((expiringIn7 / stats.active) * 100)}% de activas) vencen esta semana
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activas</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">suscriptores vigentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR estimado</CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingreso Promedio</CardTitle>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">ARR proyectado</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Pausadas</CardTitle>
            <PauseCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
            <p className="text-xs text-muted-foreground">en pausa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">canceladas / expiradas</p>
          </CardContent>
        </Card>
        {(() => {
          const base = stats.active + stats.cancelled
          if (base < 2) return null
          const rate = Math.round((stats.active / base) * 100)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Renovación</CardTitle>
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
          const curMonth = new Date().toISOString().slice(0, 7)
          const cancelledThisMonth = allSubs.filter((s) =>
            s.status === 'cancelled' &&
            (s as { updated_at?: string }).updated_at?.startsWith(curMonth)
          ).length
          if (cancelledThisMonth === 0) return null
          const churnRate = stats.active + cancelledThisMonth > 0
            ? Math.round((cancelledThisMonth / (stats.active + cancelledThisMonth)) * 100)
            : 0
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Churn Mensual</CardTitle>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[undefined, "active", "paused", "cancelled", "expired"].map((s) => (
            <Link
              key={s ?? "all"}
              href={s
                ? `/dashboard/subscriptions?status=${s}${planId ? `&planId=${planId}` : ''}`
                : `/dashboard/subscriptions${planId ? `?planId=${planId}` : ''}`}
            >
              <Badge
                variant={params.status === s || (!params.status && !s) ? "default" : "outline"}
                className="cursor-pointer"
              >
                {s ? STATUS_CONFIG[s]?.label : "Todas"}
              </Badge>
            </Link>
          ))}
        </div>
        {(() => {
          const methods = [...new Set(allSubs.map((s) => s.payment_method).filter(Boolean))] as string[]
          if (methods.length < 2) return null
          const METHOD_LABELS: Record<string, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', webpay: 'Webpay', mercadopago: 'MP', flow: 'Flow' }
          return (
            <div className="flex flex-wrap gap-2 items-center w-full">
              <span className="text-xs text-muted-foreground font-medium">Método:</span>
              <Link href={`/dashboard/subscriptions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(planId ? { planId } : {}), ...(search ? { search } : {}) }).toString()}`}>
                <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${!method ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'}`}>Todos</button>
              </Link>
              {methods.map((m) => (
                <Link key={m} href={`/dashboard/subscriptions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(planId ? { planId } : {}), ...(search ? { search } : {}), method: m }).toString()}`}>
                  <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${method === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'}`}>{METHOD_LABELS[m] ?? m}</button>
                </Link>
              ))}
            </div>
          )
        })()}
        <div className="flex flex-wrap gap-2 items-center w-full">
          <span className="text-xs text-muted-foreground font-medium">Orden:</span>
          <Link href={`/dashboard/subscriptions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(planId ? { planId } : {}), ...(search ? { search } : {}), ...(method ? { method } : {}) }).toString()}`}>
            <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${!sortBy ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'}`}>Predeterminado</button>
          </Link>
          <Link href={`/dashboard/subscriptions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(planId ? { planId } : {}), ...(search ? { search } : {}), ...(method ? { method } : {}), sort: 'expiring' }).toString()}`}>
            <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${sortBy === 'expiring' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'}`}>📅 Por vencer</button>
          </Link>
        </div>
        <form method="get" action="/dashboard/subscriptions" className="flex flex-wrap items-center gap-2">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <input
            type="text" name="search" defaultValue={search}
            placeholder="Buscar alumno..."
            className="h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36"
          />
          {plans.length > 0 && (
            <select name="planId" defaultValue={planId}
              className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos los planes</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <select name="method" defaultValue={method}
            className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Cualquier método</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="card">Tarjeta</option>
            <option value="webpay">Webpay</option>
            <option value="mercadopago">MercadoPago</option>
            <option value="flow">Flow</option>
          </select>
          <select name="expiring" defaultValue={expiring}
            className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Cualquier vencimiento</option>
            <option value="7">Vence en 7 días</option>
            <option value="30">Vence en 30 días</option>
          </select>
          <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Filtrar</button>
          {(planId || search || expiring || method) && (
            <Link href={`/dashboard/subscriptions${params.status ? `?status=${params.status}` : ''}`}
              className="text-xs text-muted-foreground hover:text-foreground">
              ✕ Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* List */}
      {subs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin suscripciones</h3>
            <p className="text-muted-foreground mb-4">Asigna un plan a tus alumnos</p>
            <Link href="/dashboard/subscriptions/new">
              <Button>Asignar Plan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {subs.map((sub) => {
            const athlete = sub.athletes as { id: string; name: string; photo_url: string | null } | null
            const plan = sub.plans as { id: string; name: string; price: number; billing_cycle: string } | null
            const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.cancelled

            const daysLeft = sub.end_date && sub.status === 'active'
              ? Math.ceil((new Date(sub.end_date).getTime() - today.getTime()) / 86400000)
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
                        <span>
                          Desde {new Date(sub.start_date).toLocaleDateString("es-CL")}
                          {sub.status === 'active' && (() => {
                            const days = Math.floor((today.getTime() - new Date(sub.start_date).getTime()) / 86400000)
                            return days > 0 ? <span className="ml-1 text-primary font-medium">({days}d activa)</span> : null
                          })()}
                        </span>
                        {sub.end_date && <span>Hasta {new Date(sub.end_date).toLocaleDateString("es-CL")}</span>}
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
                            Próximo cobro: {new Date(sub.end_date).toLocaleDateString('es-CL')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {plan && (
                        <span className="font-bold">
                          ${Number(plan.price).toLocaleString("es-CL")}
                          <span className="text-xs font-normal text-muted-foreground ml-0.5">
                            {CYCLE_LABELS[plan.billing_cycle] ?? ""}
                          </span>
                        </span>
                      )}
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      {(sub.status === 'expired' || sub.status === 'cancelled') && (
                        <RenewSubscriptionButton subscriptionId={sub.id} />
                      )}
                      <SubscriptionStatusButton subscriptionId={sub.id} currentStatus={sub.status as "active" | "paused" | "cancelled" | "expired"} />
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
              <Link href={`/dashboard/subscriptions?${new URLSearchParams({
                ...(params.status ? { status:   params.status } : {}),
                ...(planId        ? { planId }                  : {}),
                ...(search        ? { search }                  : {}),
                ...(expiring      ? { expiring }                : {}),
                page: String(page - 1),
              }).toString()}`}>
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">← Anterior</button>
              </Link>
            )}
            {page * 25 < total && (
              <Link href={`/dashboard/subscriptions?${new URLSearchParams({
                ...(params.status ? { status:   params.status } : {}),
                ...(planId        ? { planId }                  : {}),
                ...(search        ? { search }                  : {}),
                ...(expiring      ? { expiring }                : {}),
                page: String(page + 1),
              }).toString()}`}>
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">Siguiente →</button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
