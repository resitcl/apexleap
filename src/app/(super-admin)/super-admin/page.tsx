export const dynamic = "force-dynamic"

import Link from "next/link"
import { getSuperAdminKPIs, getAllClubs } from "@/lib/actions/super-admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2, Users, TrendingUp, DollarSign,
  CheckCircle2, XCircle, CreditCard, Calendar,
} from "lucide-react"

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:   { label: "Activo",    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  trialing: { label: "Trial",     color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  past_due: { label: "Vencido",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  cancelled:{ label: "Cancelado", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  paused:   { label: "Pausado",   color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
}

export default async function SuperAdminDashboard() {
  let kpis = {
    total_clubs: 0, active_clubs: 0, inactive_clubs: 0,
    total_athletes: 0, mrr: 0, revenue_this_month: 0,
    new_clubs_this_month: 0, saas_breakdown: {} as Record<string, number>,
  }
  let clubs: Awaited<ReturnType<typeof getAllClubs>> = []

  try {
    const [k, c] = await Promise.all([getSuperAdminKPIs(), getAllClubs()])
    kpis = k
    clubs = c
  } catch { /* show zeros on error */ }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-4 pb-12 pt-1">
      {/* ── GREETING ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tighter">
            Super <span className="text-primary">Admin.</span>
          </h1>
          <p className="text-[15px] text-muted-foreground/70 font-normal mt-2 leading-relaxed">
            {kpis.total_clubs > 0
              ? `${kpis.total_clubs} clubes · ${kpis.active_clubs} activos · ${kpis.total_athletes.toLocaleString("es-CL")} atletas`
              : 'Vista global de todos los clubes y facturación SaaS.'}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 shrink-0 border border-border/40 rounded-xl px-4 py-3 bg-card/40">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}</span>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1.6fr] gap-3">

        <Link href="/super-admin/clubs" className="block">
          <div className="rounded-2xl bg-card p-5 hover:bg-muted/40 dark:hover:bg-white/[0.04] transition-colors h-full">
            <div className="flex items-center gap-2.5 mb-5">
              <Building2 className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Clubes</p>
            </div>
            <p className="text-4xl font-black tracking-tight text-primary leading-none">{kpis.total_clubs}</p>
            <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">{kpis.active_clubs} activos · {kpis.inactive_clubs} inactivos</p>
          </div>
        </Link>

        <div className="rounded-2xl bg-card p-5 h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <Users className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Atletas</p>
          </div>
          <p className="text-4xl font-black tracking-tight text-primary leading-none">{kpis.total_athletes.toLocaleString("es-CL")}</p>
          <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">en todos los clubes</p>
        </div>

        <Link href="/super-admin/billing" className="block">
          <div className="rounded-2xl bg-card p-5 hover:bg-muted/40 dark:hover:bg-white/[0.04] transition-colors h-full">
            <div className="flex items-center gap-2.5 mb-5">
              <TrendingUp className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">MRR</p>
            </div>
            <p className="text-4xl font-black tracking-tight text-primary leading-none">{fmt(kpis.mrr)}</p>
            <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">mensual recurrente</p>
          </div>
        </Link>

        <Link href="/super-admin/billing" className="block">
          <div className="rounded-2xl bg-card p-5 hover:bg-muted/40 dark:hover:bg-white/[0.04] transition-colors h-full">
            <div className="flex items-center gap-2.5 mb-5">
              <DollarSign className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Cobrado</p>
            </div>
            <p className="text-4xl font-black tracking-tight text-primary leading-none">{fmt(kpis.revenue_this_month)}</p>
            <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">este mes</p>
          </div>
        </Link>

        {/* Featured: Nuevos clubes este mes */}
        <div className="rounded-2xl bg-card p-5 h-full flex flex-col col-span-2 md:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Nuevos Este Mes</p>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-3xl lg:text-4xl font-black leading-none text-foreground tracking-tight">
            {kpis.new_clubs_this_month}
          </p>
          <p className="text-[13px] text-muted-foreground/50 mt-1.5 font-normal">
            club{kpis.new_clubs_this_month !== 1 ? "s" : ""} nuevo{kpis.new_clubs_this_month !== 1 ? "s" : ""}
          </p>
          {Object.keys(kpis.saas_breakdown).length > 0 && (
            <div className="mt-auto pt-3 flex flex-wrap gap-x-3 gap-y-1">
              {Object.entries(kpis.saas_breakdown).filter(([,v]) => v > 0).map(([status, count]) => (
                <span key={status} className="text-[11px] text-muted-foreground/70 font-medium">
                  {count} {status}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SaaS Status breakdown */}
      <div className="grid gap-3 grid-cols-3 sm:grid-cols-5">
        {Object.entries(STATUS_BADGE).map(([status, meta]) => {
          const count = kpis.saas_breakdown[status] ?? 0
          return (
            <div key={status} className="rounded-2xl bg-card p-4 flex flex-col items-center gap-1 text-center">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                {meta.label}
              </span>
              <p className="text-3xl font-black tracking-tight text-foreground leading-none mt-1">{count}</p>
              <p className="text-[11px] text-muted-foreground/50 font-normal">club{count !== 1 ? "s" : ""}</p>
            </div>
          )
        })}
      </div>

      {/* All Clubs list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black tracking-tight">Todos los Clubes</h2>
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
