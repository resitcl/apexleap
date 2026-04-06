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
    <div className="space-y-8 pb-12 pt-1">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-3">
          <Swords className="w-10 h-10 text-primary" /> Mis Partidos
        </h1>
        <p className="text-sm md:text-base text-muted-foreground/80 mt-3 max-w-xl font-medium">
          Historial oficial de encuentros, torneos y resultados en los que has participado.
        </p>
      </div>

      {/* Record summary */}
      {finished.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors">
            <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
              <div className="text-4xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">{finished.length}</div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">Jugados</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5 shadow-sm">
            <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
              <div className="text-3xl font-black text-emerald-500">{wins}</div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">V</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-sm">
            <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
              <div className="text-3xl font-black text-amber-500">{draws}</div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">E</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-destructive/30 bg-destructive/5 shadow-sm">
            <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
              <div className="text-3xl font-black text-destructive">{losses}</div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">D</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Win rate bar */}
      {finished.length > 0 && (
        <Card className="rounded-2xl border border-white/[0.04] bg-card shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-black tracking-tight uppercase text-foreground">Rendimiento Global</p>
            <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-xs font-black">
              {Math.round((wins / finished.length) * 100)}% victorias
            </Badge>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex shadow-inner">
            {wins > 0 && <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(wins / finished.length) * 100}%` }} />}
            {draws > 0 && <div className="bg-amber-500 h-full transition-all" style={{ width: `${(draws / finished.length) * 100}%` }} />}
            {losses > 0 && <div className="bg-destructive h-full transition-all" style={{ width: `${(losses / finished.length) * 100}%` }} />}
          </div>
          <div className="flex items-center gap-6 mt-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/80 justify-center">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-sm" />{wins} Victorias</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-sm" />{draws} Empates</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-destructive shadow-sm" />{losses} Derrotas</span>
          </div>
        </Card>
      )}

      {typedMatches.length === 0 ? (
        <Card className="border-dashed border-white/[0.05] bg-muted/5 rounded-2xl">
          <CardContent className="py-20 text-center">
            <Swords className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-black tracking-tight text-foreground mb-2 uppercase">Sin partidos registrados</h3>
            <p className="text-muted-foreground text-sm font-medium">
              Cuando participes en encuentros oficiales de tu club o equipo, los marcadores aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary" /> Próximos Encuentros
            </h2>
            {upcomingMatches.length === 0 ? (
              <p className="text-sm font-medium text-muted-foreground/50 py-4">No hay partidos próximos programados.</p>
            ) : (
              upcomingMatches.map((m) => (
                <Card key={m.id} className="rounded-2xl border-white/[0.04] bg-card hover:bg-muted/5 transition-colors overflow-hidden group shadow-sm">
                  <div className="h-1 bg-gradient-to-r from-primary to-primary/30" />
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <Swords className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-base uppercase tracking-tight text-foreground flex items-center gap-2">
                        vs. {m.opponent ?? "Por definir"}
                        {m.status === "in_progress" && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">
                        <span className="flex items-center gap-1 text-primary">
                          <Calendar className="w-3 h-3" />
                          {new Date(m.match_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        <span className="flex items-center gap-1 border border-white/[0.04] bg-background px-1.5 py-0.5 rounded">
                          {m.is_home ? "Local" : "Visita"}
                        </span>
                        {m.location && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.location}</span>
                        )}
                      </div>
                      {m.competitions && (
                        <Badge variant="outline" className="mt-3 text-[9px] uppercase font-black tracking-widest border-white/[0.04] bg-muted/30">
                          {m.competitions.name}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-muted-foreground" /> Resultados Pasados
            </h2>
            {pastMatches.length === 0 ? (
               <p className="text-sm font-medium text-muted-foreground/50 py-4">Aún no hay resultados de partidos anteriores.</p>
            ) : (
              pastMatches.map((m) => {
                const ourScore = m.is_home ? m.home_score : m.away_score
                const theirScore = m.is_home ? m.away_score : m.home_score
                const hasScore = ourScore !== null && theirScore !== null
                const won = hasScore && ourScore! > theirScore!
                const lost = hasScore && ourScore! < theirScore!
                const drew = hasScore && ourScore === theirScore

                return (
                  <Card key={m.id} className="rounded-2xl border-white/[0.04] bg-card overflow-hidden hover:border-white/[0.1] transition-colors shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Result indicator */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                        won ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : 
                        lost ? "bg-destructive/10 border-destructive/20 text-destructive" : 
                        drew ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : 
                        "bg-muted border-white/[0.04] text-muted-foreground"
                      }`}>
                        {won ? <TrendingUp className="w-5 h-5" /> :
                         lost ? <TrendingDown className="w-5 h-5" /> :
                         drew ? <Minus className="w-5 h-5" /> :
                         <Swords className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black tracking-tight uppercase">vs. {m.opponent ?? "—"}</p>
                          {hasScore && (
                            <span className={`text-base font-black px-2 py-0.5 rounded-sm bg-background border border-white/[0.04] shadow-inner tracking-tighter ${
                              won ? "text-emerald-500" : lost ? "text-destructive" : "text-amber-500"
                            }`}>
                              {ourScore} – {theirScore}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1.5 flex flex-wrap gap-2 items-center">
                          {new Date(m.match_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                          <span className="text-muted-foreground/30">•</span>
                          {m.is_home ? "Local" : "Visita"}
                          {m.competitions && <>
                            <span className="text-muted-foreground/30">•</span>
                            <span className="truncate max-w-[120px]">{m.competitions.name}</span>
                          </>}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
