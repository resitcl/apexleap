export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMyStats } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Trophy, CalendarDays, TrendingUp, BarChart3, Target } from "lucide-react"

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
    <div className="space-y-8 pb-12 pt-1">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-3">
          <Activity className="w-10 h-10 text-primary" /> Rendimiento
        </h1>
        <p className="text-sm md:text-base text-muted-foreground/80 mt-3 max-w-xl font-medium">
          Métricas de desempeño técnico y físico asignadas por el cuerpo técnico.
        </p>
      </div>

      {matchCount === 0 || statKeys.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-white/[0.05] bg-muted/5">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="font-semibold text-lg mb-1">Sin estadísticas registradas</h3>
            <p className="text-muted-foreground text-sm font-medium">
              Cuando el cuerpo técnico registre estadísticas en los partidos, aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors">
              <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
                <div className="text-4xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">{matchCount}</div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Partidos Computados</p>
              </CardContent>
            </Card>

            {topStat && (
              <Card className="rounded-2xl border border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors">
                <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full relative overflow-hidden">
                  <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary/10" />
                  <div className="text-4xl font-black text-foreground">{totals[topStat]}</div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 flex items-center gap-1">
                    {STAT_ICONS[topStat.toLowerCase()] ?? "🎯"} {statLabel(topStat)} Totales
                  </p>
                </CardContent>
              </Card>
            )}

            {topStat && matchCount > 0 && (
              <Card className="rounded-2xl border border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors">
                <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
                  <div className="text-4xl font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                    {(totals[topStat] / matchCount).toFixed(1)}
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 flex items-center gap-1">
                    {statLabel(topStat)} / Partido <TrendingUp className="w-3 h-3 text-amber-500" />
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* All-time totals */}
          <Card className="rounded-2xl border border-white/[0.04] shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/30 bg-muted/10 px-6 pt-6">
              <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" /> Totales Acumulados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {statKeys.map((key) => {
                  const icon = STAT_ICONS[key.toLowerCase()] ?? "📊"
                  const avg = matchCount > 0 ? (totals[key] / matchCount).toFixed(1) : "0"
                  const maxInMatch = Math.max(...byMatch.map((m) => m.stats[key] ?? 0))

                  return (
                    <div key={key} className="rounded-xl border border-white/[0.04] bg-muted/5 p-4 text-center hover:bg-muted/20 transition-colors hover:border-primary/20 group">
                      <span className="text-3xl drop-shadow-sm group-hover:scale-110 transition-transform inline-block">{icon}</span>
                      <p className="text-2xl font-black mt-2 tracking-tight text-foreground">{totals[key]}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{statLabel(key)}</p>
                      <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-muted-foreground/60 p-2 bg-background/50 rounded flex-wrap">
                        <span className="font-medium whitespace-nowrap">Prom: <span className="text-primary font-bold ml-1">{avg}</span></span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                        <span className="font-medium whitespace-nowrap">Máx: <span className="text-foreground font-bold ml-1">{maxInMatch}</span></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Per-match breakdown */}
          {byMatch.length > 0 && (
            <Card className="rounded-2xl border border-white/[0.04] shadow-sm overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/30 bg-muted/10 px-6 pt-6">
                <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" /> Detalle por Partido
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-muted/5 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 border-b border-border/30">
                    <tr>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Rival</th>
                      <th className="px-6 py-4">Competencia</th>
                      {statKeys.map((k) => (
                        <th key={k} className="px-4 py-4 text-center">
                          {STAT_ICONS[k.toLowerCase()] ?? ""} {statLabel(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {byMatch.map((m, i) => (
                      <tr key={i} className="hover:bg-muted/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground text-xs uppercase tracking-wider">
                          {m.match_date ? new Date(m.match_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : "—"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold tracking-tight text-foreground">{m.opponent}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-muted-foreground/80">{m.competition || "—"}</td>
                        {statKeys.map((k) => (
                          <td key={k} className="px-4 py-4 text-center">
                            {m.stats[k] ? (
                              <span className="font-mono font-bold text-primary text-sm bg-primary/10 px-2 py-0.5 rounded">{m.stats[k]}</span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
