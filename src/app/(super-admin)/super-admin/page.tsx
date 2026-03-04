export const dynamic = "force-dynamic"

import Link from "next/link"
import { getSuperAdminKPIs, getAllClubs } from "@/lib/actions/super-admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2, Users, TrendingUp, DollarSign,
  CheckCircle2, XCircle, CreditCard,
} from "lucide-react"

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:   { label: "Activo",    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  trialing: { label: "Trial",     color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  past_due: { label: "Vencido",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelled:{ label: "Cancelado", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  paused:   { label: "Pausado",   color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
}

export default async function SuperAdminDashboard() {
  const [kpis, clubs] = await Promise.all([
    getSuperAdminKPIs(),
    getAllClubs(),
  ])

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Panel de Control · Super Admin</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Vista global de todos los clubes y facturación SaaS de ApexLeap
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Clubes Totales",
            value: kpis.total_clubs,
            sub: `${kpis.active_clubs} activos · ${kpis.inactive_clubs} inactivos`,
            icon: Building2,
            color: "text-blue-500",
          },
          {
            label: "Atletas Activos",
            value: kpis.total_athletes.toLocaleString("es-CL"),
            sub: "en todos los clubes",
            icon: Users,
            color: "text-violet-500",
          },
          {
            label: "MRR Estimado",
            value: fmt(kpis.mrr),
            sub: "facturación mensual recurrente",
            icon: TrendingUp,
            color: "text-green-500",
          },
          {
            label: "Cobrado Este Mes",
            value: fmt(kpis.revenue_this_month),
            sub: `${kpis.new_clubs_this_month} club${kpis.new_clubs_this_month !== 1 ? "s" : ""} nuevo${kpis.new_clubs_this_month !== 1 ? "s" : ""}`,
            icon: DollarSign,
            color: "text-emerald-500",
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SaaS Status breakdown */}
      <div className="grid gap-4 sm:grid-cols-4">
        {Object.entries(STATUS_BADGE).map(([status, meta]) => {
          const count = kpis.saas_breakdown[status] ?? 0
          return (
            <Card key={status} className="text-center py-3">
              <CardContent className="pt-0 pb-0 flex flex-col items-center gap-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                  {meta.label}
                </span>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">club{count !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* All Clubs list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Todos los Clubes</h2>
          <Link href="/super-admin/clubs" className="text-sm text-primary hover:underline">
            Ver gestión completa →
          </Link>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Club</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Deporte</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Atletas</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Plan SaaS</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => {
                const sub = club.saas_sub as {
                  status: string
                  saas_plans: { name: string; price_monthly: number } | null
                } | null
                const subMeta = sub ? STATUS_BADGE[sub.status] : null
                return (
                  <tr key={club.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: club.primary_color ?? "#6366f1" }}
                        >
                          {club.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium leading-tight">{club.name}</p>
                          <p className="text-xs text-muted-foreground">{club.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {club.sport_type ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {club.athlete_count}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {sub?.saas_plans ? (
                        <span className="text-xs font-medium">{sub.saas_plans.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {club.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
                          <XCircle className="w-3.5 h-3.5" /> Inactivo
                        </span>
                      )}
                      {subMeta && (
                        <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${subMeta.color}`}>
                          {subMeta.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/super-admin/clubs/${club.id}`}
                        className="text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {clubs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No hay clubes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/super-admin/clubs",   label: "Gestionar Clubes",    desc: "Activar, desactivar, ver usuarios",  icon: Building2,  color: "bg-blue-500" },
          { href: "/super-admin/billing", label: "Facturación SaaS",    desc: "Planes, cobros y estado de pagos",   icon: CreditCard, color: "bg-green-600" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-accent/40 transition-colors cursor-pointer h-full">
              <CardContent className="pt-5 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
