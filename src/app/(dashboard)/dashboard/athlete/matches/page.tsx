export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMyMatches } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Swords, Calendar, MapPin, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react"

export default async function AthleteMatchesPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let matches: Awaited<ReturnType<typeof getMyMatches>> = []
  try {
    matches = await getMyMatches()
  } catch { /* silent */ }

  type Match = {
    id: string; opponent: string | null; match_date: string; location: string | null
    is_home: boolean; home_score: number | null; away_score: number | null
    status: string; notes: string | null
    competitions: { id: string; name: string } | null
  }
  const typedMatches = matches as unknown as Match[]

  const finished = typedMatches.filter((m) => m.status === "finished")
  const wins = finished.filter((m) => {
    const our = m.is_home ? m.home_score : m.away_score
    const their = m.is_home ? m.away_score : m.home_score
    return our !== null && their !== null && our > their
  }).length
  const draws = finished.filter((m) => m.home_score !== null && m.home_score === m.away_score).length
  const losses = finished.length - wins - draws

  const today = new Date().toISOString().split("T")[0]
  const upcomingMatches = typedMatches.filter((m) => m.match_date >= today && m.status !== "finished")
  const pastMatches = typedMatches.filter((m) => m.match_date < today || m.status === "finished")

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Swords className="w-8 h-8" /> Mis Partidos
        </h1>
        <p className="text-muted-foreground">Historial de partidos en los que participaste</p>
      </div>

      {/* Record summary */}
      {finished.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-foreground">{finished.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Jugados</p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-green-600">{wins}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Victorias</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{draws}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Empates</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-red-600">{losses}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Derrotas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Win rate bar */}
      {finished.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Rendimiento</p>
              <p className="text-sm text-muted-foreground">
                {Math.round((wins / finished.length) * 100)}% victorias
              </p>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
              {wins > 0 && (
                <div className="bg-green-500 h-full transition-all" style={{ width: `${(wins / finished.length) * 100}%` }} />
              )}
              {draws > 0 && (
                <div className="bg-yellow-400 h-full transition-all" style={{ width: `${(draws / finished.length) * 100}%` }} />
              )}
              {losses > 0 && (
                <div className="bg-red-400 h-full transition-all" style={{ width: `${(losses / finished.length) * 100}%` }} />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{wins}V</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />{draws}E</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{losses}D</span>
            </div>
          </CardContent>
        </Card>
      )}

      {typedMatches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Swords className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin partidos registrados</h3>
            <p className="text-muted-foreground text-sm">
              Cuando participes en partidos oficiales, los resultados aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming */}
          {upcomingMatches.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">
                Próximos Partidos
              </h2>
              {upcomingMatches.map((m) => (
                <Card key={m.id} className="overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <Swords className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">vs. {m.opponent ?? "Por definir"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(m.match_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "long" })}
                          </span>
                          {m.is_home ? "Local" : "Visita"}
                          {m.location && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.location}</span>
                          )}
                        </p>
                      </div>
                      {m.status === "in_progress" && (
                        <Badge variant="default" className="text-xs animate-pulse">En juego</Badge>
                      )}
                      {m.competitions && (
                        <Badge variant="outline" className="text-xs shrink-0">{m.competitions.name}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Past */}
          {pastMatches.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">
                Resultados
              </h2>
              {pastMatches.map((m) => {
                const ourScore = m.is_home ? m.home_score : m.away_score
                const theirScore = m.is_home ? m.away_score : m.home_score
                const hasScore = ourScore !== null && theirScore !== null
                const won = hasScore && ourScore! > theirScore!
                const lost = hasScore && ourScore! < theirScore!
                const drew = hasScore && ourScore === theirScore

                return (
                  <Card key={m.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        {/* Result indicator */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          won ? "bg-green-100" : lost ? "bg-red-100" : drew ? "bg-yellow-100" : "bg-muted"
                        }`}>
                          {won ? <TrendingUp className="w-5 h-5 text-green-600" /> :
                           lost ? <TrendingDown className="w-5 h-5 text-red-600" /> :
                           drew ? <Minus className="w-5 h-5 text-yellow-600" /> :
                           <Swords className="w-5 h-5 text-muted-foreground" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">vs. {m.opponent ?? "—"}</p>
                            {hasScore && (
                              <span className={`text-sm font-bold ${won ? "text-green-600" : lost ? "text-red-600" : "text-foreground"}`}>
                                {ourScore} – {theirScore}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(m.match_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                            {m.is_home ? " · Local" : " · Visita"}
                            {m.competitions && ` · ${m.competitions.name}`}
                          </p>
                        </div>

                        <Badge className={`text-xs shrink-0 ${
                          won ? "bg-green-100 text-green-700 border-green-200" :
                          lost ? "bg-red-100 text-red-700 border-red-200" :
                          drew ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {won ? "Victoria" : lost ? "Derrota" : drew ? "Empate" : "—"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
