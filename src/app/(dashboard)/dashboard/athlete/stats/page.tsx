export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMyStats } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Trophy, Calendar, Zap, Target, TrendingUp } from "lucide-react"

const STAT_ICONS: Record<string, string> = {
  goles: "⚽", goals: "⚽", puntos: "🏀", points: "🏀",
  asistencias: "🅰️", assists: "🅰️", rebotes: "🏀", rebounds: "🏀",
  tarjetas_amarillas: "🟡", yellow_cards: "🟡",
  tarjetas_rojas: "🔴", red_cards: "🔴",
  faltas: "⚠️", fouls: "⚠️",
  bloqueos: "🛡️", blocks: "🛡️",
  robos: "🤏", steals: "🤏",
  aces: "🎯", kills: "💥", digs: "🏐",
  saves: "🧤", atajadas: "🧤",
}

function statLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function AthleteStatsPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let stats: Awaited<ReturnType<typeof getMyStats>> = { totals: {}, matchCount: 0, byMatch: [] }
  try {
    stats = await getMyStats()
  } catch { /* silent */ }

  const { totals, matchCount, byMatch } = stats
  const statKeys = Object.keys(totals).sort((a, b) => totals[b] - totals[a])
  const topStat = statKeys[0]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="w-8 h-8" /> Mis Estadísticas
        </h1>
        <p className="text-muted-foreground">Rendimiento personal acumulado en todas las competencias</p>
      </div>

      {matchCount === 0 || statKeys.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin estadísticas registradas</h3>
            <p className="text-muted-foreground text-sm">
              Cuando el cuerpo técnico registre estadísticas en los partidos, aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
              <CardContent className="py-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{matchCount}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Partidos con stats</p>
              </CardContent>
            </Card>

            {topStat && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400" />
                <CardContent className="py-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{totals[topStat]}</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {STAT_ICONS[topStat.toLowerCase()] ?? "📊"} {statLabel(topStat)} (total)
                  </p>
                </CardContent>
              </Card>
            )}

            {topStat && matchCount > 0 && (
              <Card className="overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardContent className="py-4 text-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600">
                    {(totals[topStat] / matchCount).toFixed(1)}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {statLabel(topStat)} por partido
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* All-time totals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Totales Acumulados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {statKeys.map((key) => {
                  const icon = STAT_ICONS[key.toLowerCase()] ?? "📊"
                  const avg = matchCount > 0 ? (totals[key] / matchCount).toFixed(1) : "0"
                  const maxInMatch = Math.max(...byMatch.map((m) => m.stats[key] ?? 0))

                  return (
                    <div key={key} className="rounded-xl border p-3 text-center hover:shadow-sm transition-shadow">
                      <span className="text-2xl">{icon}</span>
                      <p className="text-2xl font-bold mt-1">{totals[key]}</p>
                      <p className="text-xs font-medium text-muted-foreground">{statLabel(key)}</p>
                      <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>Prom: <strong>{avg}</strong></span>
                        <span>Máx: <strong>{maxInMatch}</strong></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Per-match breakdown */}
          {byMatch.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Detalle por Partido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Fecha</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Rival</th>
                        <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Competencia</th>
                        {statKeys.map((k) => (
                          <th key={k} className="text-center px-2 py-2.5 font-medium text-muted-foreground text-xs">
                            {STAT_ICONS[k.toLowerCase()] ?? ""} {statLabel(k)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {byMatch.map((m, i) => (
                        <tr key={i} className={`border-b border-border/50 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                          <td className="px-3 py-2 text-xs whitespace-nowrap">
                            {m.match_date ? new Date(m.match_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : "—"}
                          </td>
                          <td className="px-3 py-2 font-medium text-xs">{m.opponent}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{m.competition || "—"}</td>
                          {statKeys.map((k) => (
                            <td key={k} className="text-center px-2 py-2 text-sm">
                              {m.stats[k] ? (
                                <span className="font-semibold">{m.stats[k]}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
