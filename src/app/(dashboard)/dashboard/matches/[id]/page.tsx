export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId, getClubMembershipRole, isClubStaffRole, resolveCurrentAthleteIdInClub } from "@/lib/actions/club-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Calendar, MapPin, Trophy, Swords, Users } from "lucide-react"
import { getMatchEvents } from "@/lib/actions/matches"
import { MatchStatsEditor } from "@/components/competitions/MatchStatsEditor"
import { getClubSettings } from "@/lib/actions/settings"
import { EditMatchDialog } from "@/components/matches/EditMatchDialog"
import { DeleteMatchButton } from "@/components/matches/DeleteMatchButton"
import { MatchRosterPanel, type MatchRosterData } from "@/components/matches/MatchRosterPanel"

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  finished: "Finalizado",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  // Use getClubId for consistent club resolution (cookie-first)
  let clubId: string
  try {
    clubId = await getClubId()
    const admin = createAdminClient()

    const { data: match, error: matchErr } = await admin
      .from("matches")
      .select("*, competitions(id, name, type, sport)")
      .eq("id", id)
      .eq("club_id", clubId)
      .single()
    if (matchErr || !match) notFound()

    const membershipRole = await getClubMembershipRole()
    const isStaff = isClubStaffRole(membershipRole)
    const viewerAthleteId = await resolveCurrentAthleteIdInClub()

    let rosterForPanel: MatchRosterData | null = null
    if (match.roster_id) {
      const { data: rData } = await admin
        .from("rosters")
        .select(
          "id, name, match_date, opponent, venue, roster_athletes(id, number, position, is_captain, is_starter, status, athletes(id, name))"
        )
        .eq("id", match.roster_id as string)
        .single()
      rosterForPanel = (rData as MatchRosterData | null) ?? null
    }

    const [eventsResult, athletesResult, settingsResult] = await Promise.allSettled([
      getMatchEvents(id),
      admin.from("athletes").select("id, name").eq("club_id", clubId).eq("status", "active").order("name"),
      getClubSettings(),
    ])

    const events = eventsResult.status === "fulfilled" ? eventsResult.value : []
    const athletes = athletesResult.status === "fulfilled" ? (athletesResult.value.data ?? []) : []
    const sportType = settingsResult.status === "fulfilled" 
      ? (settingsResult.value as { sport_type?: string | null })?.sport_type ?? null 
      : null

    const comp = match.competitions as { id: string; name: string; type: string; sport: string | null } | null

    const ourScore = match.is_home ? match.home_score : match.away_score
    const theirScore = match.is_home ? match.away_score : match.home_score
    const hasScore = ourScore !== null && theirScore !== null
    const won = hasScore && ourScore! > theirScore!
    const lost = hasScore && ourScore! < theirScore!
    const drew = hasScore && ourScore === theirScore

    const resultColor = won ? "text-green-600" : lost ? "text-red-600" : drew ? "text-yellow-600" : ""
    const resultBg = won ? "bg-green-100" : lost ? "bg-red-100" : drew ? "bg-yellow-100" : "bg-muted"
    const resultLabel = won ? "Victoria" : lost ? "Derrota" : drew ? "Empate" : "—"

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap w-full">
          <Link href={comp ? `/dashboard/competitions/${comp.id}` : "/dashboard/matches"}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              {comp ? comp.name : "Partidos"}
            </Button>
          </Link>
          {isStaff && (
            <div className="flex flex-wrap gap-2">
              <EditMatchDialog
                match={{
                  id: match.id,
                  competition_id: match.competition_id ?? null,
                  opponent: match.opponent,
                  match_date: match.match_date,
                  location: match.location,
                  is_home: match.is_home,
                  home_score: match.home_score,
                  away_score: match.away_score,
                  status: match.status,
                  notes: match.notes ?? null,
                }}
              />
              <DeleteMatchButton
                matchId={match.id}
                competitionId={match.competition_id ?? null}
                redirectTo="/dashboard/matches"
              />
            </div>
          )}
        </div>

        {/* Main Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Result badge */}
              <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 ${resultBg}`}>
                {hasScore ? (
                  <>
                    <span className={`text-2xl font-bold ${resultColor}`}>{ourScore}</span>
                    <span className="text-xs text-muted-foreground">– {theirScore}</span>
                  </>
                ) : (
                  <Swords className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <h1 className="text-2xl font-bold">vs. {match.opponent ?? "Por definir"}</h1>
                  <Badge variant={match.status === "in_progress" ? "default" : "outline"} className={match.status === "in_progress" ? "animate-pulse" : ""}>
                    {STATUS_LABEL[match.status] ?? match.status}
                  </Badge>
                  {hasScore && (
                    <Badge className={`${resultBg} ${resultColor} border-0`}>
                      {resultLabel}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>
                      {new Date(match.match_date + "T12:00:00").toLocaleDateString("es-CL", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={match.is_home ? "border-green-300 text-green-700" : "border-orange-300 text-orange-700"}>
                      {match.is_home ? "Local" : "Visita"}
                    </Badge>
                    {match.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {match.location}
                      </span>
                    )}
                  </div>
                  {comp && (
                    <div className="flex items-center gap-2 pt-1">
                      <Trophy className="w-4 h-4 text-primary" />
                      <Link href={`/dashboard/competitions/${comp.id}`} className="text-primary hover:underline">
                        {comp.name}
                      </Link>
                      {comp.sport && <Badge variant="secondary" className="text-xs">{comp.sport}</Badge>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {match.notes && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground">{match.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <MatchRosterPanel
          matchId={match.id}
          matchStatus={match.status as string}
          opponent={match.opponent as string | null}
          matchDate={match.match_date as string}
          location={match.location as string | null}
          competitionId={match.competition_id as string | null}
          competitionName={comp?.name ?? null}
          roster={rosterForPanel}
          isStaff={isStaff}
          viewerAthleteId={viewerAthleteId}
        />

        {/* Stats Editor (solo staff) */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Estadísticas del partido
              </h2>
              {isStaff && (
                <MatchStatsEditor
                  match={match}
                  competitionId={match.competition_id ?? null}
                  sport={sportType}
                  athletes={athletes as { id: string; name: string }[]}
                  initialEvents={events as unknown as { athlete_id: string | null; event_type: string; event_value: number; athletes: { id: string; name: string } | null }[]}
                />
              )}
            </div>

            {!isStaff && (
              <p className="text-sm text-muted-foreground mb-4">
                Las estadísticas las registra el cuerpo técnico. Aquí solo puedes consultar el detalle público del encuentro.
              </p>
            )}

            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No hay estadísticas registradas para este partido.
              </p>
            ) : (
              <div className="space-y-2">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {(ev as { athletes?: { name: string } | null }).athletes?.name ?? "Equipo"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {(ev as { event_type: string }).event_type.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-bold text-sm">{(ev as { event_value: number }).event_value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  } catch {
    notFound()
  }
}
