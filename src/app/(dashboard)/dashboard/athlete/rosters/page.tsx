export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMyRosters } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Calendar, MapPin, Trophy, Shirt, Shield, ChevronRight } from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  tournament: "Torneo", league: "Liga", friendly: "Amistoso", championship: "Campeonato",
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmado", color: "bg-green-100 text-green-700 border-green-200" },
  pending:   { label: "Pendiente",  color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  declined:  { label: "Descartado", color: "bg-red-100 text-red-700 border-red-200" },
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="w-8 h-8" /> Mis Citaciones
        </h1>
        <p className="text-muted-foreground">Convocatorias en las que has sido incluido</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{rosters.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Total citaciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">{upcoming.length}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Próximas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {rosters.filter((r) => r.is_captain).length > 0 ? "©" : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {rosters.filter((r) => r.is_captain).length > 0 ? "Capitán" : "Jugador"}
            </p>
          </CardContent>
        </Card>
      </div>

      {rosters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin citaciones aún</h3>
            <p className="text-muted-foreground text-sm">
              Cuando el cuerpo técnico te incluya en una nómina, aparecerá aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">
                Próximas Citaciones
              </h2>
              {upcoming.map((r) => {
                const roster = r.rosters!
                const isToday = roster.match_date === today
                const statusM = STATUS_META[r.status] ?? STATUS_META.pending
                const score = (() => { try { return JSON.parse(roster.notes ?? '') } catch { return null } })()

                return (
                  <Link key={r.id} href={`/dashboard/athlete/rosters/${roster.id}`}>
                    <Card className={`overflow-hidden cursor-pointer hover:shadow-md transition-all ${isToday ? "ring-2 ring-primary/50" : ""}`}>
                      {isToday && <div className="h-1 bg-gradient-to-r from-primary to-blue-500" />}
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                        {/* Jersey number */}
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center shrink-0 border border-primary/20">
                          {r.number ? (
                            <>
                              <Shirt className="w-4 h-4 text-primary/60" />
                              <span className="text-lg font-bold text-primary leading-tight">{r.number}</span>
                            </>
                          ) : (
                            <Shirt className="w-6 h-6 text-primary/40" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-base">{roster.name}</p>
                            {isToday && <Badge variant="default" className="text-xs">Hoy</Badge>}
                            {r.is_captain && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">© Capitán</Badge>}
                            <Badge className={`text-xs ${statusM.color}`}>{statusM.label}</Badge>
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(roster.match_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "long" })}
                            </span>
                            {roster.opponent && (
                              <span className="font-medium text-foreground">vs. {roster.opponent}</span>
                            )}
                            {roster.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {roster.venue}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {r.position && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-md font-medium">{r.position}</span>
                            )}
                            {roster.competitions && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {TYPE_LABELS[roster.competitions.type] ?? roster.competitions.type} · {roster.competitions.name}
                              </span>
                            )}
                          </div>

                          {score && score.status === "live" && (
                            <div className="mt-2 inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-sm font-bold">{score.home} – {score.away}</span>
                              <span className="text-xs text-red-600">En vivo</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest px-1">
                Citaciones Pasadas
              </h2>
              {past.slice(0, 20).map((r) => {
                const roster = r.rosters!
                const score = (() => { try { return JSON.parse(roster.notes ?? '') } catch { return null } })()

                return (
                  <Link key={r.id} href={`/dashboard/athlete/rosters/${roster.id}`}>
                    <Card className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer hover:shadow-md">
                      <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        {r.number && (
                          <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                            {r.number}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{roster.name}</p>
                            {r.is_captain && <span className="text-xs text-yellow-600 font-bold">©</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(roster.match_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                            {roster.opponent && ` · vs. ${roster.opponent}`}
                            {r.position && ` · ${r.position}`}
                          </p>
                        </div>
                        {score && score.status === "finished" && (
                          <span className="text-sm font-bold text-muted-foreground">{score.home} – {score.away}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
