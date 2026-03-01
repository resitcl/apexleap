export const dynamic = "force-dynamic"

import { getCompetitions } from "@/lib/actions/competitions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Trophy, MapPin, Calendar } from "lucide-react"
import { NewCompetitionForm } from "@/components/competitions/NewCompetitionForm"
import { DeleteCompetitionButton } from "@/components/competitions/DeleteCompetitionButton"

const TYPE_LABELS: Record<string, string> = {
  tournament: "Torneo", league: "Liga", friendly: "Amistoso", championship: "Campeonato",
}

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  upcoming:  { label: "Próximo",    variant: "secondary" },
  active:    { label: "En curso",   variant: "default" },
  finished:  { label: "Finalizado", variant: "outline" },
  cancelled: { label: "Cancelado",  variant: "destructive" },
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string; search?: string }>
}

export default async function CompetitionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page   = Number(params.page ?? 1)
  const search = params.search ?? ""
  const limit  = 20

  let competitions: { id: string; name: string; type: string; status: string; sport: string | null; location: string | null; start_date: string; end_date: string | null; rosters: unknown[] }[] = []
  let total = 0

  try {
    const result = await getCompetitions({ status: params.status, search: search || undefined, page, limit })
    competitions = result.competitions as typeof competitions
    total = result.total
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
          { label: "En curso",  icon: "", count: active },
          { label: "Próximos",  icon: "", count: upcoming },
          { label: "Nóminas",   icon: "", count: rosters },
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { value: '', label: 'Todas' },
            { value: 'upcoming', label: '📅 Próximas' },
            { value: 'active', label: '🏆 En curso' },
            { value: 'finished', label: '✅ Finalizadas' },
            { value: 'cancelled', label: 'Canceladas' },
          ]).map(({ value, label }) => (
            <Link key={value} href={`/dashboard/competitions?${new URLSearchParams({ ...(value ? { status: value } : {}), ...(search ? { search } : {}) }).toString()}`}>
              <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
                (value === '' && !params.status) || params.status === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-input hover:bg-accent'
              }`}>{label}</button>
            </Link>
          ))}
        </div>
        <form method="get" action="/dashboard/competitions" className="flex items-center gap-2">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <input type="text" name="search" defaultValue={search}
            placeholder="Buscar competencia..."
            className="h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-44" />
          <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Buscar</button>
          {search && (
            <Link href={`/dashboard/competitions${params.status ? `?status=${params.status}` : ''}`}
              className="text-xs text-muted-foreground hover:text-foreground">✕ Limpiar</Link>
          )}
        </form>
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
              <Link key={comp.id} href={`/dashboard/competitions/${comp.id}`}>
              <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
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
                  <div className="flex items-center justify-between pt-1">
                    {rosterCount > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {rosterCount} nómina{rosterCount !== 1 ? "s" : ""} creada{rosterCount !== 1 ? "s" : ""}
                      </p>
                    ) : <span />}
                    <DeleteCompetitionButton competitionId={comp.id} />
                  </div>
                </CardContent>
              </Card>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/dashboard/competitions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(search ? { search } : {}), page: String(page - 1) }).toString()}`}>
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">← Anterior</button>
              </Link>
            )}
            {page * limit < total && (
              <Link href={`/dashboard/competitions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(search ? { search } : {}), page: String(page + 1) }).toString()}`}>
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">Siguiente →</button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
