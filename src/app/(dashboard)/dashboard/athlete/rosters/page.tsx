export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMyRosters } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Calendar, MapPin, Trophy, Shirt, ExternalLink } from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  tournament: "Torneo", league: "Liga", friendly: "Amistoso", championship: "Campeonato",
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmado", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  pending:   { label: "Pendiente",  color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  declined:  { label: "Descartado", color: "bg-destructive/10 text-destructive border-destructive/20" },
}

export default async function AthleteRostersPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let rosters: Awaited<ReturnType<typeof getMyRosters>> = []
  try {
    rosters = await getMyRosters()
  } catch { /* silent */ }

  const today = new Date().toISOString().split("T")[0]
  const upcoming = rosters.filter((r) => r.rosters!.match_date >= today)
  const past = rosters.filter((r) => r.rosters!.match_date < today)

  return (
    <div className="space-y-8 pb-12 pt-1">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-3">
          <ClipboardList className="w-10 h-10 text-primary" /> Mis Citaciones
        </h1>
        <p className="text-sm md:text-base text-muted-foreground/80 mt-3 max-w-xl font-medium">
          Convocatorias oficiales, torneos y partidos en los que el cuerpo técnico te ha incluido.
        </p>
      </div>

      {rosters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors">
            <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
              <div className="text-4xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">{rosters.length}</div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">Total Citaciones</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5 shadow-sm">
            <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
              <div className="text-3xl font-black text-emerald-500">{upcoming.length}</div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">Próximas</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-sm">
            <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
              <div className="text-3xl font-black text-amber-500">
                {rosters.filter((r) => r.is_captain).length > 0 ? "©" : "—"}
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-2">
                {rosters.filter((r) => r.is_captain).length > 0 ? "Capitán" : "Jugador"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {rosters.length === 0 ? (
        <Card className="border-dashed border-white/[0.05] bg-muted/5 rounded-2xl">
          <CardContent className="py-20 text-center">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-xl font-black tracking-tight text-foreground mb-2 uppercase">Sin citaciones aún</h3>
            <p className="text-muted-foreground text-sm font-medium">Cuando el cuerpo técnico te incluya en una nómina, aparecerá aquí.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-1 gap-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-primary" /> Próximas Citaciones
              </h2>
              {upcoming.map((r) => {
                const roster = r.rosters!
                const isToday = roster.match_date === today
                const statusM = STATUS_META[r.status] ?? STATUS_META.pending
                const score = (() => { try { return JSON.parse(roster.notes ?? '') } catch { return null } })()

                return (
                  <Link key={r.id} href={`/dashboard/athlete/rosters/${roster.id}`} className="block group">
                    <Card className={`rounded-2xl border-white/[0.04] bg-card overflow-hidden transition-all shadow-sm group-hover:bg-muted/5 group-hover:border-primary/20 ${isToday ? "ring-1 ring-primary/50" : ""}`}>
                      {isToday && <div className="h-1 bg-gradient-to-r from-primary/80 to-primary/20" />}
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {/* Jersey number */}
                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${isToday ? 'bg-primary/10 border-primary/20' : 'bg-muted/40 border-white/[0.04]'}`}>
                              {r.number ? (
                                <>
                                  <Shirt className={`w-4 h-4 mb-0.5 ${isToday ? 'text-primary' : 'text-muted-foreground'}`} />
                                  <span className={`text-xl font-black leading-none ${isToday ? 'text-primary' : 'text-foreground'}`}>{r.number}</span>
                                </>
                              ) : (
                                <Shirt className="w-6 h-6 text-muted-foreground/40" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <p className="font-black text-xl tracking-tight leading-none text-foreground uppercase">{roster.name}</p>
                                {isToday && <Badge className="text-[9px] uppercase font-black tracking-widest bg-primary text-primary-foreground px-2">Hoy</Badge>}
                                {r.is_captain && <Badge className="text-[9px] uppercase font-black tracking-widest bg-amber-500 text-amber-950 px-2 pointer-events-none">© Capitán</Badge>}
                              </div>

                              <div className="flex items-center gap-4 mt-3 text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1.5 border border-white/[0.04] bg-background px-2 py-1 rounded">
                                  <Calendar className="w-3.5 h-3.5 text-primary" />
                                  {new Date(roster.match_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                                </span>
                                {roster.opponent && (
                                  <span className="flex items-center gap-1.5 text-foreground">
                                    <span className="text-muted-foreground/40">vs.</span> {roster.opponent}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3 mt-2 flex-wrap text-muted-foreground/80">
                                {r.position && (
                                  <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest border-white/[0.04] bg-muted/30">
                                    {r.position}
                                  </Badge>
                                )}
                                {roster.competitions && (
                                  <span className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                                    <Trophy className="w-3.5 h-3.5" />
                                    {TYPE_LABELS[roster.competitions.type] ?? roster.competitions.type} <span className="text-muted-foreground/30">•</span> {roster.competitions.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-3 self-end sm:self-center">
                            <Badge className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 ${statusM.color}`}>
                              {statusM.label}
                            </Badge>
                            <ExternalLink className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                          </div>
                        </div>

                        {/* Live Score */}
                        {score && score.status === "live" && (
                          <div className="mt-5 pt-5 border-t border-border/30 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-red-500">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[10px] uppercase font-black tracking-widest">En juego</span>
                            </div>
                            <span className="text-2xl font-black tracking-tighter bg-card px-4 py-1 rounded-sm border border-red-500/20 text-foreground shadow-sm">
                              {score.home} <span className="text-muted-foreground/40 font-medium">–</span> {score.away}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-3 mt-6">
              <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-muted-foreground" /> Citaciones Pasadas
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {past.slice(0, 20).map((r) => {
                  const roster = r.rosters!
                  const score = (() => { try { return JSON.parse(roster.notes ?? '') } catch { return null } })()

                  return (
                    <Link key={r.id} href={`/dashboard/athlete/rosters/${roster.id}`} className="block group">
                      <Card className="rounded-2xl border-white/[0.04] bg-muted/20 hover:bg-muted/40 transition-colors shadow-none hover:shadow-sm">
                        <CardContent className="py-4 px-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-black tracking-tight uppercase truncate">{roster.name}</p>
                                {r.is_captain && <span className="text-[10px] bg-amber-500 text-amber-950 px-1 py-0.5 rounded font-black tracking-widest">©</span>}
                              </div>
                              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70 mt-1 truncate">
                                {new Date(roster.match_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                                {roster.opponent && <><span className="mx-1 text-muted-foreground/30">•</span> vs. {roster.opponent}</>}
                                {r.position && <><span className="mx-1 text-muted-foreground/30">•</span> {r.position}</>}
                              </p>
                            </div>
                            {score && score.status === "finished" && (
                              <span className="text-sm font-black tracking-tighter text-foreground whitespace-nowrap bg-background border border-white/[0.04] px-2 py-0.5 rounded">
                                {score.home} – {score.away}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
