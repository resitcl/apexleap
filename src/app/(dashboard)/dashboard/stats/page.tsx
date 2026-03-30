export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getClubStats } from "@/lib/actions/stats"
import { Button } from "@/components/ui/button"
import {
  DashboardEmptyState,
  DashboardMetaPill,
  DashboardMetricCard,
  DashboardPage,
  DashboardPageHeader,
  DashboardSectionCard,
} from "@/components/ui/dashboard-kit"
import { BarChart3, Users, CheckCircle, TrendingUp, Activity, Heart } from "lucide-react"

export default async function StatsPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let stats: Awaited<ReturnType<typeof getClubStats>> | null = null
  try { stats = await getClubStats() } catch { /* silent */ }

  if (!stats) {
    return (
      <DashboardPage className="flex min-h-[60vh] items-center">
        <div className="w-full">
          <DashboardEmptyState
            icon={<BarChart3 className="w-8 h-8" />}
            title="Analytics no disponibles"
            description="No pude cargar las métricas del club en este momento. Intenta nuevamente en unos minutos."
            action={
              <Link href="/dashboard">
                <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-xs">
                  Volver al dashboard
                </Button>
              </Link>
            }
          />
        </div>
      </DashboardPage>
    )
  }

  const maxAtt = Math.max(...stats.attendanceByMonth.map((m) => m.count), 1)
  const maxRev = Math.max(...stats.revenueByMonth.map((m) => m.amount), 1)
  const maxNew = Math.max(...stats.newAthletesByMonth.map((m) => m.count), 1)
  const maxInj = Math.max(...stats.injuriesByMonth.map((m) => m.count), 1)
  const totalHealth = stats.healthDist.healthy + stats.healthDist.observation + stats.healthDist.injured
  const totalAttendance = stats.attendanceByMonth.reduce((sum, month) => sum + month.count, 0)
  const totalRevenue = stats.revenueByMonth.reduce((sum, month) => sum + month.amount, 0)

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Analytics del Club"
        subtitle="Vista consolidada de asistencia, ingresos, altas y salud deportiva para tomar decisiones rápidas desde el dashboard."
        icon={<BarChart3 className="w-10 h-10" />}
        meta={
          <DashboardMetaPill icon={<TrendingUp className="w-4 h-4" />} tone="default">
            Últimos 6 meses
          </DashboardMetaPill>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <DashboardMetricCard
          label="Atletas activos"
          value={stats.totalAthletes}
          description="Base actual"
          icon={<Users className="w-4 h-4" />}
          tone="info"
          valueClassName="text-3xl"
        />
        <DashboardMetricCard
          label="Check-ins"
          value={stats.totalCheckInsLastMonth}
          description="Último mes"
          icon={<CheckCircle className="w-4 h-4" />}
          tone="success"
          valueClassName="text-3xl"
        />
        <DashboardMetricCard
          label="Promedio diario"
          value={stats.avgDailyCheckIns}
          description="Ventana 30d"
          icon={<TrendingUp className="w-4 h-4" />}
          tone="default"
          valueClassName="text-3xl"
        />
        <DashboardMetricCard
          label="Lesionados"
          value={stats.healthDist.injured}
          description="Semáforo rojo salud"
          icon={<Activity className="w-4 h-4" />}
          tone={stats.healthDist.injured > 0 ? "danger" : "success"}
          valueClassName="text-3xl"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardSectionCard
          title="Check-ins por mes"
          icon={<CheckCircle className="w-4 h-4" />}
          description={`${totalAttendance.toLocaleString("es-CL")} check-ins acumulados en la ventana analizada`}
        >
          <div className="flex items-end gap-2 h-28">
            {stats.attendanceByMonth.map((m, i) => {
              const h = Math.max(m.count > 0 ? Math.round((m.count / maxAtt) * 100) : 0, m.count > 0 ? 4 : 0)
              const isCur = i === stats.attendanceByMonth.length - 1
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{m.count > 0 ? m.count : ""}</span>
                  <div className={`w-full rounded-t-sm ${isCur ? "bg-emerald-400" : "bg-emerald-400/50"}`} style={{ height: h }} />
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
              )
            })}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Ingresos por mes"
          icon={<TrendingUp className="w-4 h-4" />}
          description={`$${totalRevenue.toLocaleString("es-CL")} cobrados en el período`}
        >
          <div className="flex items-end gap-2 h-28">
            {stats.revenueByMonth.map((m, i) => {
              const h = Math.max(m.amount > 0 ? Math.round((m.amount / maxRev) * 100) : 0, m.amount > 0 ? 4 : 0)
              const isCur = i === stats.revenueByMonth.length - 1
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {m.amount > 0 ? `$${Math.round(m.amount / 1000)}k` : ""}
                  </span>
                  <div className={`w-full rounded-t-sm ${isCur ? "bg-sky-400" : "bg-sky-400/50"}`} style={{ height: h }} />
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
              )
            })}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Altas por mes"
          icon={<Users className="w-4 h-4" />}
          description="Ritmo de incorporación de atletas al club"
        >
          <div className="flex items-end gap-2 h-28">
            {stats.newAthletesByMonth.map((m, i) => {
              const h = Math.max(m.count > 0 ? Math.round((m.count / maxNew) * 100) : 0, m.count > 0 ? 4 : 0)
              const isCur = i === stats.newAthletesByMonth.length - 1
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">{m.count > 0 ? m.count : ""}</span>
                  <div className={`w-full rounded-t-sm ${isCur ? "bg-violet-400" : "bg-violet-400/50"}`} style={{ height: h }} />
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
              )
            })}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard
          title="Lesiones por mes"
          icon={<Activity className="w-4 h-4" />}
          description="Evolución de incidencias médicas registradas por período"
        >
          {stats.injuriesByMonth.every((m) => m.count === 0) ? (
            <div className="flex items-center justify-center h-28 text-sm font-medium text-emerald-300">
              Sin lesiones registradas
            </div>
          ) : (
            <div className="flex items-end gap-2 h-28">
              {stats.injuriesByMonth.map((m, i) => {
                const h = Math.max(m.count > 0 ? Math.round((m.count / maxInj) * 100) : 0, m.count > 0 ? 4 : 0)
                const isCur = i === stats.injuriesByMonth.length - 1
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{m.count > 0 ? m.count : ""}</span>
                    <div className={`w-full rounded-t-sm ${isCur ? "bg-amber-400" : "bg-amber-400/50"}`} style={{ height: h }} />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </DashboardSectionCard>
      </div>

      {totalHealth > 0 ? (
        <DashboardSectionCard
          title="Estado de salud del plantel"
          icon={<Heart className="w-4 h-4" />}
          description="Distribución del estado físico y médico de los atletas activos"
        >
          <div className="space-y-3">
            {[
              { label: "Saludable", count: stats.healthDist.healthy, color: "bg-emerald-400", text: "text-emerald-300" },
              { label: "Observación", count: stats.healthDist.observation, color: "bg-amber-400", text: "text-amber-300" },
              { label: "Lesionado", count: stats.healthDist.injured, color: "bg-destructive", text: "text-destructive" },
            ].map((item) => {
              const pct = Math.round((item.count / totalHealth) * 100)
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-bold ${item.text}`}>{item.label}</span>
                    <span className="text-muted-foreground">{item.count} atletas ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </DashboardSectionCard>
      ) : null}

      {stats.topByAttendance.length > 0 ? (
        <DashboardSectionCard
          title="Top atletas por asistencia"
          icon={<TrendingUp className="w-4 h-4" />}
          description="Ranking acumulado de los últimos 6 meses"
        >
          <div className="space-y-2">
            {stats.topByAttendance.map((a, i) => {
              const maxCount = stats.topByAttendance[0]?.count ?? 1
              const pct = Math.round((a.count / maxCount) * 100)
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null
              return (
                <Link key={a.id} href={`/dashboard/athletes/${a.id}`}>
                  <div className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted/10 transition-colors cursor-pointer">
                    <span className="text-sm text-muted-foreground w-6 shrink-0 text-center">
                      {medal ?? `${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold truncate text-foreground">{a.name}</span>
                        <span className="text-sm font-black text-emerald-300 shrink-0">{a.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </DashboardSectionCard>
      ) : null}

      <DashboardEmptyState
        icon={<Users className="w-8 h-8" />}
        title="Explora el detalle por atleta"
        description="Para profundizar el rendimiento, la asistencia y el estado documental, entra a la ficha individual de cada atleta."
        action={
          <Link href="/dashboard/athletes">
            <Button variant="outline" className="rounded-xl font-bold uppercase tracking-widest text-xs">
              Ir a alumnos
            </Button>
          </Link>
        }
      />
    </DashboardPage>
  )
}
