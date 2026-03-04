export const dynamic = "force-dynamic"

import { getCompetitions } from "@/lib/actions/competitions"
import { getCategories } from "@/lib/actions/categories"
import { getSeasons, getActiveSeason } from "@/lib/actions/seasons"
import { Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Trophy, MapPin, Calendar } from "lucide-react"
import { NewCompetitionForm } from "@/components/competitions/NewCompetitionForm"
import { DeleteCompetitionButton } from "@/components/competitions/DeleteCompetitionButton"
import { ExportCompetitionsButton } from "@/components/competitions/ExportCompetitionsButton"

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
  searchParams: Promise<{ status?: string; page?: string; search?: string; type?: string; location?: string; sport?: string; sort?: string; categoryId?: string; seasonId?: string }>
}

export default async function CompetitionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page     = Number(params.page ?? 1)
  const search   = params.search   ?? ""
  const type     = params.type     ?? ""
  const location = params.location ?? ""
  const sport    = params.sport    ?? ""
  const sortBy    = params.sort     ?? ""
  const seasonId  = params.seasonId ?? ""
  const limit     = 20

  type Season = { id: string; name: string; type: string; year: number; is_active: boolean }
  type RosterEntry = { id: string; name: string | null; roster_athletes: { id: string; athletes: { id: string; name: string } | null }[] }
  let competitions: { id: string; name: string; type: string; status: string; sport: string | null; location: string | null; start_date: string; end_date: string | null; category_id?: string | null; rosters: RosterEntry[] }[] = []
  let categories: { id: string; name: string; color: string | null }[] = []
  let seasons: Season[] = []
  let activeSeason: Season | null = null
  let total = 0

  try {
    const [result, catsData, seasonsData, activeSeasonData] = await Promise.all([
      getCompetitions({ status: params.status, search: search || undefined, type: type || undefined, seasonId: seasonId || undefined, page, limit }),
      getCategories(true).catch(() => []),
      getSeasons(true).catch(() => []),
      getActiveSeason().catch(() => null),
    ])
    competitions = result.competitions as typeof competitions
    categories = catsData.map((c) => ({ id: c.id, name: c.name, color: c.color ?? null }))
    seasons = seasonsData as Season[]
    activeSeason = activeSeasonData as Season | null
    if (params.categoryId) competitions = competitions.filter((c) => c.category_id === params.categoryId)
    if (location) competitions = competitions.filter((c) => c.location?.toLowerCase().includes(location.toLowerCase()))
    if (sport)    competitions = competitions.filter((c) => c.sport?.toLowerCase() === sport.toLowerCase())
    if (sortBy === 'date_asc')  competitions = competitions.slice().sort((a, b) => a.start_date.localeCompare(b.start_date))
    if (sortBy === 'date_desc') competitions = competitions.slice().sort((a, b) => b.start_date.localeCompare(a.start_date))
    total = result.total
  } catch { /* empty */ }

  const active   = competitions.filter((c) => c.status === "active").length
  const upcoming = competitions.filter((c) => c.status === "upcoming").length
  const rosters  = competitions.reduce((sum, c) => sum + ((c.rosters as unknown[])?.length ?? 0), 0)
  const uniqueSports = [...new Set(competitions.map((c) => c.sport).filter(Boolean))] as string[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Competencias</h1>
          <p className="text-muted-foreground">
            Ligas, torneos y nóminas matchday
            {params.status && (() => {
              const s = STATUS_META[params.status]
              return s ? <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{s.label}</span> : null
            })()}
            {rosters > 0 && <span className="ml-2 font-medium text-primary">· {rosters} inscripcion{rosters !== 1 ? 'es' : ''} en nóminas</span>}
            {(() => {
              const allRosters = competitions.flatMap((c) => c.rosters as Array<{ athlete_id?: string }> ?? [])
              const unique = new Set(allRosters.map((r) => r.athlete_id).filter(Boolean)).size
              return unique > 0 ? <span className="ml-2 text-muted-foreground/70">· {unique} atleta{unique !== 1 ? 's' : ''} únicos</span> : null
            })()}
            {competitions.length > 0 && rosters > 0 && (
              <span className="ml-2 text-muted-foreground/70">· promedio {(rosters / competitions.length).toFixed(1)} por competencia</span>
            )}
            {uniqueSports.length > 0 && (
              <span className="ml-2 text-muted-foreground/70">
                · {uniqueSports.length <= 3 ? uniqueSports.join(', ') : `${uniqueSports.slice(0, 3).join(', ')} +${uniqueSports.length - 3}`}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {([{ value: '', label: 'Predeterminado' }, { value: 'date_asc', label: 'Más próxima' }, { value: 'date_desc', label: 'Más reciente' }]).map(({ value, label }) => (
            <Link key={value} href={`/dashboard/competitions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(search ? { search } : {}), ...(type ? { type } : {}), ...(value ? { sort: value } : {}) }).toString()}`}>
              <button className={`h-8 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                (value === '' && !sortBy) || sortBy === value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
              }`}>{label}</button>
            </Link>
          ))}
          <ExportCompetitionsButton competitions={competitions} />
          <NewCompetitionForm seasons={seasons} activeSeasonId={activeSeason?.id ?? null} />
        </div>
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

      {/* Active Season Banner */}
      {activeSeason && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-sm">
          <Layers className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-primary">Temporada activa:</span>
          <span>{activeSeason.name}</span>
          {seasonId && (
            <Link href="/dashboard/competitions" className="ml-auto text-xs text-muted-foreground hover:text-foreground">
              Ver todas las temporadas
            </Link>
          )}
          {!seasonId && (
            <Link href={`/dashboard/competitions?seasonId=${activeSeason.id}`} className="ml-auto text-xs text-primary hover:underline">
              Filtrar por esta temporada
            </Link>
          )}
        </div>
      )}

      {/* Season filter chips */}
      {seasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">Temporada:</span>
          <Link href={`/dashboard/competitions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(search ? { search } : {}), ...(type ? { type } : {}) }).toString()}`}>
            <button className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              !seasonId ? 'bg-foreground text-background border-foreground shadow-sm' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}>Todas</button>
          </Link>
          {seasons.map((s) => (
            <Link key={s.id} href={`/dashboard/competitions?seasonId=${s.id}${params.status ? `&status=${params.status}` : ''}${search ? `&search=${search}` : ''}${type ? `&type=${type}` : ''}`}>
              <button className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                seasonId === s.id ? 'bg-foreground text-background border-foreground shadow-sm' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
              }`}>
                {s.is_active && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                {s.name}
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { value: '', label: 'Todas' },
            { value: 'upcoming', label: 'Próximas' },
            { value: 'active', label: 'En curso' },
            { value: 'finished', label: 'Finalizadas' },
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
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground font-medium self-center">Categoría:</span>
            <Link href={`/dashboard/competitions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(search ? { search } : {}), ...(type ? { type } : {}) }).toString()}`}>
              <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${ !params.categoryId ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent' }`}>Todas</button>
            </Link>
            {categories.map((cat) => (
              <Link key={cat.id} href={`/dashboard/competitions?${new URLSearchParams({ ...(params.status ? { status: params.status } : {}), ...(search ? { search } : {}), ...(type ? { type } : {}), categoryId: cat.id }).toString()}`}>
                <button className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${ params.categoryId === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent' }`}>
                  {cat.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                  {cat.name}
                </button>
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {([['', 'Todos'], ['tournament', 'Torneo'], ['league', 'Liga'], ['friendly', 'Amistoso'], ['championship', 'Campeonato']] as const).map(([val, lbl]) => (
            <Link key={val} href={`/dashboard/competitions?${new URLSearchParams({
              ...(params.status ? { status: params.status } : {}),
              ...(search        ? { search }               : {}),
              ...(val           ? { type: val }            : {}),
            }).toString()}`}>
              <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
                (val === '' && !type) || type === val
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-input hover:bg-accent'
              }`}>{lbl}</button>
            </Link>
          ))}
        </div>
        {uniqueSports.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground font-medium self-center">Deporte:</span>
            {(['', ...uniqueSports]).map((sport) => (
              <Link key={sport || '_all'} href={`/dashboard/competitions?${new URLSearchParams({
                ...(params.status ? { status: params.status } : {}),
                ...(type          ? { type }                  : {}),
                ...(search        ? { search }               : {}),
                ...(sport         ? { sport }                : {}),
              }).toString()}`}>
                <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                  (sport === '' && !params.sport) || params.sport === sport
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-accent'
                }`}>{sport || 'Todos'}</button>
              </Link>
            ))}
          </div>
        )}
        <form method="get" action="/dashboard/competitions" className="flex items-center gap-2">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          {type && <input type="hidden" name="type" value={type} />}
          <input type="text" name="search" defaultValue={search}
            placeholder="Buscar competencia..."
            className="h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-36" />
          <input type="text" name="location" defaultValue={location}
            placeholder="Ubicación..."
            className="h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" />
          <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Buscar</button>
          {(search || location) && (
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
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
              Registra torneos, ligas y campeonatos. Crea nóminas Matchday Ready con
              citaciones validadas por el Semáforo de Disponibilidad.
            </p>
            <NewCompetitionForm />
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
                    {(() => {
                      const cat = categories.find((c) => c.id === comp.category_id)
                      if (!cat) return null
                      return (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border" style={cat.color ? { borderColor: cat.color, color: cat.color } : {}}>
                          {cat.color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                          {cat.name}
                        </span>
                      )
                    })()}
                    {(() => {
                      const uniqueAthletes = new Set(
                        (comp.rosters as Array<{ athlete_id?: string }> ?? [])
                          .map((r) => r.athlete_id).filter(Boolean)
                      ).size
                      return uniqueAthletes > 0 ? (
                        <Badge variant="secondary" className="text-xs">👤 {uniqueAthletes} atleta{uniqueAthletes !== 1 ? 's' : ''}</Badge>
                      ) : null
                    })()}
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
                    {comp.status === 'upcoming' && (() => {
                      const days = Math.ceil((new Date(comp.start_date + 'T12:00:00').getTime() - Date.now()) / 86400000)
                      return days > 0 ? <span className="ml-1 text-xs font-medium text-primary">({days}d)</span> : null
                    })()}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    {rosterCount > 0 ? (() => {
                      const athleteCount = (comp.rosters as Array<{ roster_athletes?: unknown[] }>)
                        .reduce((sum, r) => sum + (r.roster_athletes?.length ?? 0), 0)
                      return (
                        <p className="text-xs text-muted-foreground">
                          {rosterCount} nómina{rosterCount !== 1 ? "s" : ""}
                          {athleteCount > 0 && ` · ${athleteCount} atleta${athleteCount !== 1 ? "s" : ""}`}
                        </p>
                      )
                    })() : <span />}
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
