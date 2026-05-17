export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, MapPin, Calendar, Trophy, Users, ClipboardList, Swords } from "lucide-react"
import { DeleteCompetitionButton } from "@/components/competitions/DeleteCompetitionButton"
import { ExportRosterButton } from "@/components/competitions/ExportRosterButton"
import { EditCompetitionButton } from "@/components/competitions/EditCompetitionButton"
import { AddAthleteToRosterButton } from "@/components/competitions/AddAthleteToRosterButton"
import { NewRosterButton } from "@/components/competitions/NewRosterButton"
import { DeleteRosterButton } from "@/components/competitions/DeleteRosterButton"
import { LiveScoreButton } from "@/components/competitions/LiveScoreButton"
import { NewMatchButton } from "@/components/competitions/NewMatchButton"
import { MatchStatsEditor } from "@/components/competitions/MatchStatsEditor"
import { getMatches, getMatchEvents, getPlayerStatsForCompetition } from "@/lib/actions/matches"
import { getClubSettings } from "@/lib/actions/settings"
import { partitionRosterByStarter } from "@/lib/roster-partition"

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
  params: Promise<{ id: string }>
}

export default async function CompetitionDetailPage({ params }: PageProps) {
  const { id } = await params
  const { userId } = await auth()
  
  if (!userId) {
    notFound()
  }

  // Use getClubId for consistent club resolution (cookie-first)
  let clubId: string
  try {
    clubId = await getClubId()
  } catch {
    notFound()
  }

  const admin = createAdminClient()

  const { data: comp, error: compErr } = await admin
    .from("competitions")
    .select("*")
    .eq("id", id)
    .eq("club_id", clubId)
    .single()
  
  if (compErr || !comp) {
    notFound()
  }

  const { data: clubData } = await admin
    .from("clubs")
    .select("name")
    .eq("id", clubId)
    .single()
  const clubName = clubData?.name ?? "Local"

  const { data: rosters } = await admin
    .from("rosters")
    .select("*, roster_athletes(id, athletes(id, name), number, position, is_captain, is_starter, status)")
    .eq("competition_id", id)
    .order("match_date", { ascending: false })

  // Fetch match data in parallel
  const [matchesRaw, playerStats, athletesRaw, settings] = await Promise.allSettled([
    getMatches(id),
    getPlayerStatsForCompetition(id),
    admin.from("athletes").select("id, name").eq("club_id", clubId).eq("status", "active").order("name"),
    getClubSettings(),
  ])

  const matches     = matchesRaw.status === "fulfilled" ? matchesRaw.value : []
  const stats       = playerStats.status === "fulfilled" ? playerStats.value : []
  const athletes    = athletesRaw.status === "fulfilled" ? (athletesRaw.value.data ?? []) : []
  const sportType   = settings.status === "fulfilled" ? (settings.value as { sport_type?: string | null })?.sport_type ?? null : null

  // Pre-fetch events for each match (batched)
  const matchEventsMap: Record<string, Awaited<ReturnType<typeof getMatchEvents>>> = {}
  await Promise.all(
    matches.map(async (m) => {
      try { matchEventsMap[m.id] = await getMatchEvents(m.id) } catch { matchEventsMap[m.id] = [] }
    })
  )

  const statusMeta = STATUS_META[comp.status] ?? STATUS_META.upcoming
  const rosterList = rosters ?? []

  // Match summary stats
  const finishedMatches = matches.filter(m => m.status === "finished")
  const wins  = finishedMatches.filter(m => (m.is_home ? m.home_score : m.away_score)! > (m.is_home ? m.away_score : m.home_score)!).length
  const draws = finishedMatches.filter(m => m.home_score !== null && m.home_score === m.away_score).length
  const losses = finishedMatches.length - wins - draws

  // All stat keys seen across all players
  const allStatKeys = Array.from(new Set(stats.flatMap(p => Object.keys(p.stats))))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/competitions">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Competencias
          </Button>
        </Link>
        <div className="flex-1" />
        <EditCompetitionButton competition={comp} />
        <DeleteCompetitionButton competitionId={id} />
      </div>

      {/* Main Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold">{comp.name}</h1>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                <Badge variant="outline">{TYPE_LABELS[comp.type] ?? comp.type}</Badge>
                {comp.sport && <Badge variant="outline">{comp.sport}</Badge>}
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {comp.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{comp.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>
                    {new Date(comp.start_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                    {comp.end_date ? ` → ${new Date(comp.end_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}` : ""}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Trophy className="w-12 h-12 text-primary/30 mx-auto" />
              <p className="text-xs text-muted-foreground mt-1">{rosterList.length} nómina{rosterList.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {comp.description && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">{comp.description}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rosters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Nóminas Matchday
          </h2>
          <NewRosterButton
            competitionId={id}
            matches={matches
              .filter((m) => !m.roster_id)
              .map((m) => ({
                id: m.id,
                opponent: m.opponent ?? null,
                match_date: m.match_date,
                match_time: (m as { match_time?: string | null }).match_time ?? null,
                location: m.location ?? null,
              }))}
          />
        </div>

        {rosterList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
              <h3 className="font-semibold mb-1">Sin nóminas creadas</h3>
              <p className="text-muted-foreground text-sm">
                Las nóminas Matchday Ready con citaciones inteligentes estarán disponibles próximamente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rosterList.map((roster) => {
              const athletes = (roster.roster_athletes as Array<{
                id: string; number: number | null; position: string | null;
                is_captain: boolean; is_starter?: boolean | null; status: string;
                athletes: { id: string; name: string } | null
              }> ?? [])
              const confirmed = athletes.filter((a) => a.status === "confirmed").length
              const { titulares, suplentes } = partitionRosterByStarter(athletes)

              return (
                <Card key={roster.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{roster.name}</CardTitle>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="w-3 h-3" />
                          {athletes.length} citados
                        </Badge>
                        {confirmed > 0 && (
                          <Badge variant="default" className="text-xs">{confirmed} confirmados</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <LiveScoreButton
                          rosterId={roster.id}
                          competitionId={id}
                          clubName={clubName}
                          opponent={roster.opponent ?? null}
                          initialScore={(() => {
                            try { return JSON.parse(roster.notes ?? '') } catch { return null }
                          })()}
                        />
                        <ExportRosterButton
                          roster={{ ...roster, roster_athletes: athletes }}
                          competitionName={comp.name}
                        />
                        <AddAthleteToRosterButton
                          rosterId={roster.id}
                          competitionId={id}
                          rosterAthletes={athletes}
                          rosterName={roster.name}
                        />
                        <DeleteRosterButton
                          rosterId={roster.id}
                          competitionId={id}
                          rosterName={roster.name}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(roster.match_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                      {roster.opponent && ` vs. ${roster.opponent}`}
                      {roster.venue && ` · ${roster.venue}`}
                    </div>
                  </CardHeader>
                  {athletes.length > 0 && (
                    <CardContent className="pt-0 space-y-4">
                      {titulares.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Titulares</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {titulares.map((ra) => (
                              <div key={ra.id} className="flex items-center gap-2 text-sm">
                                {ra.number && (
                                  <span className="w-6 h-6 rounded bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                    {ra.number}
                                  </span>
                                )}
                                <Link href={`/dashboard/athletes/${ra.athletes?.id}`}
                                  className="truncate hover:underline">
                                  {ra.athletes?.name ?? "—"}
                                  {ra.is_captain && " ©"}
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {suplentes.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground">Suplentes / reservas</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {suplentes.map((ra) => (
                              <div key={ra.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                                {ra.number && (
                                  <span className="w-6 h-6 rounded bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0">
                                    {ra.number}
                                  </span>
                                )}
                                <Link href={`/dashboard/athletes/${ra.athletes?.id}`}
                                  className="truncate hover:underline hover:text-foreground">
                                  {ra.athletes?.name ?? "—"}
                                  {ra.is_captain && " ©"}
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Partidos ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Partidos
            {matches.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                ({finishedMatches.length} jugados · {wins}V {draws}E {losses}D)
              </span>
            )}
          </h2>
          <NewMatchButton competitionId={id} />
        </div>

        {matches.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Swords className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" />
              <h3 className="font-semibold mb-1">Sin partidos cargados</h3>
              <p className="text-muted-foreground text-sm">
                Agrega partidos para registrar marcadores y estadísticas por jugador.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => {
              const ourScore   = m.is_home ? m.home_score : m.away_score
              const theirScore = m.is_home ? m.away_score : m.home_score
              const hasScore   = ourScore !== null && theirScore !== null
              const won  = hasScore && ourScore! > theirScore!
              const lost = hasScore && ourScore! < theirScore!
              const drew = hasScore && ourScore === theirScore
              const eventsCount = (matchEventsMap[m.id] ?? []).length

              return (
                <Card key={m.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Result badge */}
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        won  ? 'bg-green-100 text-green-700' :
                        lost ? 'bg-red-100 text-red-700' :
                        drew ? 'bg-yellow-100 text-yellow-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {won ? 'V' : lost ? 'D' : drew ? 'E' : m.status === 'in_progress' ? '▶' : '—'}
                      </span>

                      {/* Match info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">vs. {m.opponent ?? '—'}</span>
                          {hasScore && (
                            <span className={`text-sm font-bold ${won ? 'text-green-600' : lost ? 'text-red-600' : 'text-foreground'}`}>
                              {ourScore} – {theirScore}
                            </span>
                          )}
                          {m.status === 'in_progress' && (
                            <Badge variant="default" className="text-xs animate-pulse">En juego</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(m.match_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                          {m.is_home ? " · Local" : " · Visita"}
                          {m.location && ` · ${m.location}`}
                          {eventsCount > 0 && ` · ${eventsCount} registros de stats`}
                        </p>
                      </div>

                      {/* Stats editor button */}
                      <MatchStatsEditor
                        match={m}
                        competitionId={id}
                        sport={sportType}
                        athletes={athletes as { id: string; name: string }[]}
                        initialEvents={(matchEventsMap[m.id] ?? []) as unknown as { athlete_id: string | null; event_type: string; event_value: number; athletes: { id: string; name: string } | null }[]}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Estadísticas por jugador ── */}
      {stats.length > 0 && allStatKeys.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Estadísticas del campeonato
          </h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Jugador</th>
                    {allStatKeys.map(k => (
                      <th key={k} className="text-center px-3 py-3 font-medium text-muted-foreground text-xs uppercase">{k.replace(/_/g,' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((p, i) => (
                    <tr key={p.athlete_id} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-4 py-2.5 font-medium">{p.name}</td>
                      {allStatKeys.map(k => (
                        <td key={k} className="text-center px-3 py-2.5 text-sm">
                          {p.stats[k] ? <span className="font-semibold">{p.stats[k]}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
