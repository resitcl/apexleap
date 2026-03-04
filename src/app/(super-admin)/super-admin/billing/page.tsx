export const dynamic = "force-dynamic"

import Link from "next/link"
import { getAllClubs, getSaasPlans } from "@/lib/actions/super-admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/actions/super-admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react"

async function getBillingData() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const [clubsData, plansData, historyData] = await Promise.all([
    getAllClubs(),
    getSaasPlans(),
    supabase
      .from('saas_billing_history')
      .select('*, clubs(name, primary_color), saas_plans(name)')
      .order('billing_date', { ascending: false })
      .limit(50),
  ])

  return {
    clubs: clubsData,
    plans: plansData,
    history: historyData.data ?? [],
  }
}

const STATUS_COLORS: Record<string, string> = {
  paid:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  refunded:"bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}
const STATUS_LABELS: Record<string, string> = {
  paid: "Pagado", pending: "Pendiente", failed: "Fallido", refunded: "Devuelto",
}

const SAAS_STATUS_COLORS: Record<string, string> = {
  active:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  trialing:  "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400",
  past_due:  "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",
  cancelled: "bg-zinc-100  text-zinc-600  dark:bg-zinc-800     dark:text-zinc-400",
  paused:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
}
const SAAS_STATUS_LABELS: Record<string, string> = {
  active: "Activo", trialing: "Trial", past_due: "Vencido", cancelled: "Cancelado", paused: "Pausado",
}

export default async function SuperAdminBillingPage() {
  const { clubs, plans, history } = await getBillingData()

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)

  // MRR per plan
  const mrrByPlan = plans.map((plan) => {
    const count = clubs.filter((c) => {
      const sub = c.saas_sub as { saas_plans?: { slug?: string } | null; status?: string } | null
      return sub?.saas_plans && (sub.saas_plans as { slug?: string }).slug === plan.slug
        && (sub.status === 'active' || sub.status === 'trialing')
    }).length
    return { ...plan, count, mrr: count * plan.price_monthly }
  })
  const totalMrr = mrrByPlan.reduce((s, p) => s + p.mrr, 0)

  // This month paid
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const paidThisMonth = history
    .filter((h) => h.status === 'paid' && h.billing_date >= monthStart)
    .reduce((s, h) => s + Number(h.amount), 0)

  const pendingTotal = history
    .filter((h) => h.status === 'pending')
    .reduce((s, h) => s + Number(h.amount), 0)

  const pastDueClubs = clubs.filter((c) => {
    const sub = c.saas_sub as { status?: string } | null
    return sub?.status === 'past_due'
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Facturación SaaS</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Estado de pagos, MRR y planes por club
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "MRR Total",           value: fmt(totalMrr),        sub: "mensual recurrente estimado",          icon: TrendingUp,   color: "text-green-500" },
          { label: "Cobrado Este Mes",     value: fmt(paidThisMonth),   sub: "pagos confirmados",                    icon: DollarSign,   color: "text-emerald-500" },
          { label: "Por Cobrar",           value: fmt(pendingTotal),    sub: `${history.filter(h=>h.status==='pending').length} facturas pendientes`, icon: AlertCircle,  color: "text-yellow-500" },
          { label: "Vencidos / Past Due",  value: pastDueClubs.length,  sub: "clubes con pago atrasado",             icon: AlertCircle,  color: "text-red-500" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MRR by plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            MRR por Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mrrByPlan.map((plan) => {
              const pct = totalMrr > 0 ? Math.round((plan.mrr / totalMrr) * 100) : 0
              return (
                <div key={plan.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{plan.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{plan.count} club{plan.count !== 1 ? "s" : ""}</span>
                      <span className="font-mono font-medium">{fmt(plan.mrr)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{pct}% del MRR · {fmt(plan.price_monthly)}/club/mes</p>
                </div>
              )
            })}
            {totalMrr === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin suscripciones activas</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Club subscription status table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estado por Club</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Club</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Estado SaaS</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Próx. vencimiento</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Monto/mes</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {clubs.map((club) => {
                  const sub = club.saas_sub as {
                    status?: string
                    billing_cycle?: string
                    current_period_end?: string | null
                    trial_ends_at?: string | null
                    saas_plans?: { name: string; price_monthly: number } | null
                  } | null
                  const subStatus = sub?.status ?? ""
                  const statusMeta = SAAS_STATUS_COLORS[subStatus]
                  const statusLabel = SAAS_STATUS_LABELS[subStatus] ?? "—"
                  const periodEnd = sub?.current_period_end ?? sub?.trial_ends_at
                  return (
                    <tr key={club.id} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: club.primary_color ?? "#6366f1" }}
                          >
                            {club.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium truncate max-w-[140px]">{club.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {sub?.saas_plans?.name ?? <span className="text-xs italic">Sin plan</span>}
                      </td>
                      <td className="px-4 py-3">
                        {subStatus ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusMeta}`}>
                            {statusLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                        {periodEnd
                          ? new Date(periodEnd).toLocaleDateString("es-CL")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-sm">
                        {sub?.saas_plans?.price_monthly
                          ? fmt(sub.saas_plans.price_monthly)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/super-admin/clubs/${club.id}`}
                          className="text-xs text-primary hover:underline whitespace-nowrap"
                        >
                          Editar →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent billing history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Historial Reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Club</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Plan</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Monto</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const clubData = h.clubs as { name: string; primary_color?: string } | null
                  const planData = h.saas_plans as { name: string } | null
                  return (
                    <tr key={h.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{clubData?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{planData?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(Number(h.amount))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[h.status] ?? ""}`}>
                          {STATUS_LABELS[h.status] ?? h.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                        {new Date(h.billing_date).toLocaleDateString("es-CL")}
                      </td>
                    </tr>
                  )
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Sin registros de facturación
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
