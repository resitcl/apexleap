export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getClubStats } from "@/lib/actions/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Users, CheckCircle, TrendingUp, Activity, Heart } from "lucide-react"

export default async function StatsPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let stats: Awaited<ReturnType<typeof getClubStats>> | null = null
  try { stats = await getClubStats() } catch { /* silent */ }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Error al cargar estadísticas</p>
      </div>
    )
  }

  const maxAtt = Math.max(...stats.attendanceByMonth.map((m) => m.count), 1)
  const maxRev = Math.max(...stats.revenueByMonth.map((m) => m.amount), 1)
  const maxNew = Math.max(...stats.newAthletesByMonth.map((m) => m.count), 1)
  const maxInj = Math.max(...stats.injuriesByMonth.map((m) => m.count), 1)
  const totalHealth = stats.healthDist.healthy + stats.healthDist.observation + stats.healthDist.injured

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-8 h-8" />
          Analytics del Club
        </h1>
        <p className="text-muted-foreground">Últimos 6 meses</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.totalAthletes}</div>
            <p className="text-xs text-muted-foreground mt-1">Atletas activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.totalCheckInsLastMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Check-ins último mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.avgDailyCheckIns}</div>
            <p className="text-xs text-muted-foreground mt-1">Promedio diario (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className={`text-3xl font-bold ${stats.healthDist.injured > 0 ? "text-red-600" : "text-green-600"}`}>
              {stats.healthDist.injured}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Atletas lesionados</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos por mes */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Asistencia por mes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Check-ins por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-28">
              {stats.attendanceByMonth.map((m, i) => {
                const h = Math.max(m.count > 0 ? Math.round((m.count / maxAtt) * 100) : 0, m.count > 0 ? 4 : 0)
                const isCur = i === 5
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{m.count > 0 ? m.count : ""}</span>
                    <div className={`w-full rounded-t-sm ${isCur ? "bg-green-500" : "bg-green-400/60"}`} style={{ height: h }} />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Ingresos por mes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Ingresos por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-28">
              {stats.revenueByMonth.map((m, i) => {
                const h = Math.max(m.amount > 0 ? Math.round((m.amount / maxRev) * 100) : 0, m.amount > 0 ? 4 : 0)
                const isCur = i === 5
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {m.amount > 0 ? `$${Math.round(m.amount / 1000)}k` : ""}
                    </span>
                    <div className={`w-full rounded-t-sm ${isCur ? "bg-blue-500" : "bg-blue-400/60"}`} style={{ height: h }} />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Nuevos atletas por mes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              Altas por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-28">
              {stats.newAthletesByMonth.map((m, i) => {
                const h = Math.max(m.count > 0 ? Math.round((m.count / maxNew) * 100) : 0, m.count > 0 ? 4 : 0)
                const isCur = i === 5
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{m.count > 0 ? m.count : ""}</span>
                    <div className={`w-full rounded-t-sm ${isCur ? "bg-purple-500" : "bg-purple-400/60"}`} style={{ height: h }} />
                    <span className="text-[10px] text-muted-foreground">{m.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lesiones por mes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              Lesiones por Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.injuriesByMonth.every((m) => m.count === 0) ? (
              <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
                Sin lesiones registradas ✓
              </div>
            ) : (
              <div className="flex items-end gap-2 h-28">
                {stats.injuriesByMonth.map((m, i) => {
                  const h = Math.max(m.count > 0 ? Math.round((m.count / maxInj) * 100) : 0, m.count > 0 ? 4 : 0)
                  const isCur = i === 5
                  return (
                    <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-muted-foreground">{m.count > 0 ? m.count : ""}</span>
                      <div className={`w-full rounded-t-sm ${isCur ? "bg-orange-500" : "bg-orange-400/60"}`} style={{ height: h }} />
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estado de salud del plantel */}
      {totalHealth > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Estado de Salud del Plantel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Saludable",    count: stats.healthDist.healthy,     color: "bg-green-500",  text: "text-green-700" },
              { label: "Observación",  count: stats.healthDist.observation,  color: "bg-yellow-400", text: "text-yellow-700" },
              { label: "Lesionado",    count: stats.healthDist.injured,      color: "bg-red-500",    text: "text-red-700" },
            ].map((item) => {
              const pct = totalHealth > 0 ? Math.round((item.count / totalHealth) * 100) : 0
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${item.text}`}>{item.label}</span>
                    <span className="text-muted-foreground">{item.count} atletas ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Top atletas por asistencia */}
      {stats.topByAttendance.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Atletas por Asistencia (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topByAttendance.map((a, i) => {
              const maxCount = stats.topByAttendance[0]?.count ?? 1
              const pct = Math.round((a.count / maxCount) * 100)
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null
              return (
                <Link key={a.id} href={`/dashboard/athletes/${a.id}`}>
                  <div className="flex items-center gap-3 py-2 hover:bg-accent/30 rounded px-1 transition-colors cursor-pointer">
                    <span className="text-sm text-muted-foreground w-6 shrink-0 text-center">
                      {medal ?? `${i + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate">{a.name}</span>
                        <span className="text-sm font-bold text-green-600 shrink-0 ml-2">{a.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Link a estadísticas individuales */}
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Ver estadísticas detalladas por atleta desde su ficha individual
          </p>
          <Link href="/dashboard/athletes">
            <Badge variant="outline" className="cursor-pointer hover:bg-accent gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Ir a Alumnos
            </Badge>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
