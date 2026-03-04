export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getRostersHub } from "@/lib/actions/rosters"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Calendar, MapPin, Users, Trophy, ChevronRight } from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  tournament: "Torneo", league: "Liga", friendly: "Amistoso", championship: "Campeonato",
}

export default async function RostersPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let rosters: Awaited<ReturnType<typeof getRostersHub>> = []
  try {
    rosters = await getRostersHub()
  } catch { /* silent */ }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="w-8 h-8" />
            Nóminas Matchday
          </h1>
          <p className="text-muted-foreground">Citaciones próximas con validación automática de semáforo</p>
        </div>
        <Link href="/dashboard/competitions">
          <Badge variant="outline" className="gap-1.5 py-1.5 px-3 cursor-pointer hover:bg-accent text-sm">
            <Trophy className="w-3.5 h-3.5" />
            Ver competencias
          </Badge>
        </Link>
      </div>

      {/* Leyenda semáforo */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Apto</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Observación</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Bloqueado (lesión/deuda)</span>
      </div>

      {rosters.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin nóminas próximas</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Crea nóminas desde el detalle de cada competencia
            </p>
            <Link href="/dashboard/competitions">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">Ir a Competencias</Badge>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rosters.map((roster) => {
            const greenCount  = roster.athletes.filter((a) => a.semaforo === "green").length
            const yellowCount = roster.athletes.filter((a) => a.semaforo === "yellow").length
            const redCount    = roster.athletes.filter((a) => a.semaforo === "red").length
            const isToday = roster.match_date === today

            return (
              <Card key={roster.id} className={isToday ? "border-primary/50 shadow-sm" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{roster.name}</CardTitle>
                        {isToday && <Badge className="text-xs bg-primary/10 text-primary border-primary/30">Hoy</Badge>}
                        {roster.competition && (
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[roster.competition.type] ?? roster.competition.type} · {roster.competition.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(roster.match_date + "T12:00:00").toLocaleDateString("es-CL", {
                            weekday: "long", day: "numeric", month: "long",
                          })}
                        </span>
                        {roster.opponent && <span>vs. <strong>{roster.opponent}</strong></span>}
                        {roster.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {roster.venue}
                          </span>
                        )}
                      </div>
                    </div>
                    {roster.competition && (
                      <Link href={`/dashboard/competitions/${roster.competition.id}`}>
                        <Badge variant="ghost" className="gap-1 cursor-pointer hover:bg-accent text-xs">
                          Ver detalle <ChevronRight className="w-3 h-3" />
                        </Badge>
                      </Link>
                    )}
                  </div>
                </CardHeader>

                {roster.athletes.length > 0 ? (
                  <CardContent className="pt-0 space-y-3">
                    {/* Semáforo resumen */}
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {roster.athletes.length} citados
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        {greenCount > 0 && (
                          <span className="flex items-center gap-1 text-green-700">
                            <span className="w-2 h-2 rounded-full bg-green-500" />{greenCount} aptos
                          </span>
                        )}
                        {yellowCount > 0 && (
                          <span className="flex items-center gap-1 text-yellow-700">
                            <span className="w-2 h-2 rounded-full bg-yellow-400" />{yellowCount} observación
                          </span>
                        )}
                        {redCount > 0 && (
                          <span className="flex items-center gap-1 text-red-700">
                            <span className="w-2 h-2 rounded-full bg-red-500" />{redCount} bloqueados
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lista de atletas */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                      {roster.athletes
                        .sort((a, b) => {
                          const order = { red: 0, yellow: 1, green: 2 }
                          return order[a.semaforo] - order[b.semaforo]
                        })
                        .map((ra) => {
                          const dot = ra.semaforo === "red" ? "bg-red-500" : ra.semaforo === "yellow" ? "bg-yellow-400" : "bg-green-500"
                          const textColor = ra.semaforo === "red" ? "text-red-700" : ""
                          return (
                            <Link key={ra.id} href={`/dashboard/athletes/${ra.athletes?.id}`}>
                              <div className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-sm hover:bg-accent/50 transition-colors cursor-pointer ${ra.semaforo === "red" ? "border-red-200 bg-red-50/50" : ""}`}>
                                {ra.number && (
                                  <span className="w-5 h-5 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                    {ra.number}
                                  </span>
                                )}
                                <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                                <span className={`text-xs truncate ${textColor}`}>
                                  {ra.athletes?.name ?? "—"}
                                  {ra.is_captain && " ©"}
                                </span>
                                {ra.semaforo === "red" && <span className="ml-auto text-xs shrink-0">🔒</span>}
                              </div>
                            </Link>
                          )
                        })}
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">Sin atletas citados aún</p>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
