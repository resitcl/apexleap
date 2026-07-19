import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import type { AthleteMatchStatsResult } from "@/lib/actions/matches"

/** Labels legibles para cada event_type (básquet + otros deportes). */
const STAT_LABEL: Record<string, { label: string; abbr: string }> = {
  minutes:    { label: "Minutos",         abbr: "MIN" },
  pts2:       { label: "Puntos 2P",       abbr: "2P"  },
  pts3:       { label: "Puntos 3P",       abbr: "3P"  },
  ft:         { label: "Tiros libres",    abbr: "TL"  },
  fta:        { label: "TL intentados",   abbr: "TLA" },
  p2a:        { label: "2P intentados",   abbr: "2PA" },
  p3a:        { label: "3P intentados",   abbr: "3PA" },
  reb_off:    { label: "Reb. ofensivo",   abbr: "RO"  },
  reb_def:    { label: "Reb. defensivo",  abbr: "RD"  },
  ast:        { label: "Asistencias",     abbr: "AST" },
  stl:        { label: "Robos",           abbr: "STL" },
  blk:        { label: "Tapones",         abbr: "BLK" },
  to:         { label: "Pérdidas",        abbr: "PER" },
  foul:       { label: "Faltas",          abbr: "FLT" },
  val:        { label: "Valoración",      abbr: "VAL" },
  plus_minus: { label: "+/-",             abbr: "+/-" },
  goal:        { label: "Goles",       abbr: "G"  },
  assist:      { label: "Asistencias", abbr: "A"  },
  yellow_card: { label: "Amarillas",   abbr: "TA" },
  red_card:    { label: "Rojas",       abbr: "TR" },
  save:        { label: "Atajadas",    abbr: "AT" },
}

const abbr = (k: string) => STAT_LABEL[k]?.abbr ?? k.replace(/_/g, " ").toUpperCase()

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function AthleteMatchStats({
  data,
  sport,
}: {
  data: AthleteMatchStatsResult
  sport: string | null
}) {
  const { games, totals, gamesPlayed } = data
  if (gamesPlayed === 0) return null

  const isBasket =
    (sport?.toLowerCase().includes("basket") ?? false) ||
    "pts2" in totals || "pts3" in totals || "ft" in totals

  const pts = (s: Record<string, number>) => (s.ft ?? 0) + (s.pts2 ?? 0) + (s.pts3 ?? 0)
  const reb = (s: Record<string, number>) => (s.reb_off ?? 0) + (s.reb_def ?? 0)
  const perGame = (total: number) => (gamesPlayed ? total / gamesPlayed : 0)

  // Tarjetas de resumen: en básquet, métricas derivadas con promedio por partido.
  const summary: Array<{ label: string; total: number; avg: number }> = isBasket
    ? [
        { label: "Puntos",      total: pts(totals),   avg: perGame(pts(totals)) },
        { label: "Rebotes",     total: reb(totals),   avg: perGame(reb(totals)) },
        { label: "Asistencias", total: totals.ast ?? 0, avg: perGame(totals.ast ?? 0) },
        { label: "Robos",       total: totals.stl ?? 0, avg: perGame(totals.stl ?? 0) },
      ]
    : Object.keys(totals)
        .slice(0, 4)
        .map((k) => ({ label: STAT_LABEL[k]?.label ?? k, total: totals[k], avg: perGame(totals[k]) }))

  // Columnas de la tabla partido a partido.
  const cols: Array<{ key: string; get: (s: Record<string, number>) => number }> = isBasket
    ? [
        { key: "minutes", get: (s) => s.minutes ?? 0 },
        { key: "PTS",     get: (s) => pts(s) },
        { key: "REB",     get: (s) => reb(s) },
        { key: "ast",     get: (s) => s.ast ?? 0 },
        { key: "stl",     get: (s) => s.stl ?? 0 },
        { key: "blk",     get: (s) => s.blk ?? 0 },
        { key: "to",      get: (s) => s.to ?? 0 },
        { key: "foul",    get: (s) => s.foul ?? 0 },
      ]
    : Object.keys(totals).map((k) => ({ key: k, get: (s: Record<string, number>) => s[k] ?? 0 }))

  const colLabel = (key: string) => (key === "PTS" || key === "REB" ? key : abbr(key))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Estadísticas de partidos
          <span className="text-xs font-normal text-muted-foreground">
            · {gamesPlayed} partido{gamesPlayed !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Resumen: total grande + promedio por partido */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summary.map((m) => (
            <div key={m.label} className="rounded-lg border border-border bg-muted/20 p-3 text-center">
              <p className="text-2xl font-black leading-none">{fmt(m.total)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{m.label}</p>
              <p className="text-[11px] text-primary font-medium mt-0.5">{fmt(m.avg)} /partido</p>
            </div>
          ))}
        </div>

        {/* Tabla partido a partido */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-2 py-2 font-medium text-muted-foreground text-xs">Fecha</th>
                <th className="text-left px-2 py-2 font-medium text-muted-foreground text-xs">Rival</th>
                <th className="text-center px-2 py-2 font-medium text-muted-foreground text-xs">Marcador</th>
                {cols.map((c) => (
                  <th key={c.key} className="text-center px-2 py-2 font-medium text-muted-foreground text-xs uppercase">
                    {colLabel(c.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map((g, i) => {
                const win =
                  g.ourScore != null && g.theirScore != null
                    ? g.ourScore > g.theirScore
                    : null
                return (
                  <tr key={g.matchId} className={`border-b border-border/50 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="px-2 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(g.date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap font-medium">{g.opponent ?? "—"}</td>
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      {g.ourScore == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={win === true ? "text-green-600 font-semibold" : win === false ? "text-red-500 font-semibold" : ""}>
                          {g.ourScore}{g.theirScore != null ? `-${g.theirScore}` : ""}
                        </span>
                      )}
                    </td>
                    {cols.map((c) => {
                      const v = c.get(g.stats)
                      return (
                        <td key={c.key} className="px-2 py-2 text-center">
                          {v ? <span className="font-semibold">{fmt(v)}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
