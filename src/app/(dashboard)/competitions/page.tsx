export const dynamic = "force-dynamic"

import { getCompetitions } from "@/lib/actions/competitions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, MapPin, Calendar } from "lucide-react"
import { NewCompetitionForm } from "@/components/competitions/NewCompetitionForm"

const TYPE_LABELS: Record<string, string> = {
  tournament: "Torneo", league: "Liga", friendly: "Amistoso", championship: "Campeonato",
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  upcoming:  { label: "Próximo",    variant: "secondary" },
  active:    { label: "En curso",   variant: "default" },
  finished:  { label: "Finalizado", variant: "outline" },
  cancelled: { label: "Cancelado",  variant: "destructive" },
}

export default async function CompetitionsPage() {
  let competitions: Awaited<ReturnType<typeof getCompetitions>> = []

  try {
    competitions = await getCompetitions()
  } catch { /* empty */ }

  const active   = competitions.filter((c) => c.status === "active").length
  const upcoming = competitions.filter((c) => c.status === "upcoming").length
  const rosters  = competitions.reduce((sum, c) => sum + ((c.rosters as unknown[])?.length ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Competencias</h1>
          <p className="text-muted-foreground">Ligas, torneos y nóminas matchday</p>
        </div>
        <NewCompetitionForm />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "En curso",      icon: "🏆", count: active },
          { label: "Próximos",      icon: "�", count: upcoming },
          { label: "Nóminas",       icon: "�", count: rosters },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 text-center">
              <span className="text-4xl">{stat.icon}</span>
              <p className="font-semibold mt-2">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {competitions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin competencias registradas</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Registra torneos, ligas y campeonatos. Crea nóminas Matchday Ready con
              citaciones validadas por el Semáforo de Disponibilidad.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {competitions.map((comp) => {
            const statusMeta = STATUS_META[comp.status] ?? STATUS_META.upcoming
            const rosterCount = (comp.rosters as unknown[])?.length ?? 0
            return (
              <Card key={comp.id} className="hover:bg-accent/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{comp.name}</CardTitle>
                    <Badge variant={statusMeta.variant} className="text-xs shrink-0">
                      {statusMeta.label}
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-1">
                    <Badge variant="outline" className="text-xs">{TYPE_LABELS[comp.type] ?? comp.type}</Badge>
                    {comp.sport && <Badge variant="outline" className="text-xs">{comp.sport}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0">
                  {comp.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{comp.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {new Date(comp.start_date + "T12:00:00").toLocaleDateString("es-CL")}
                      {comp.end_date ? ` → ${new Date(comp.end_date + "T12:00:00").toLocaleDateString("es-CL")}` : ""}
                    </span>
                  </div>
                  {rosterCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {rosterCount} nómina{rosterCount !== 1 ? "s" : ""} creada{rosterCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
