export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, MapPin, Calendar, Trophy, Users, Plus, ClipboardList } from "lucide-react"
import { DeleteCompetitionButton } from "@/components/competitions/DeleteCompetitionButton"
import { ExportRosterButton } from "@/components/competitions/ExportRosterButton"
import { EditCompetitionButton } from "@/components/competitions/EditCompetitionButton"
import { AddAthleteToRosterButton } from "@/components/competitions/AddAthleteToRosterButton"
import { NewRosterButton } from "@/components/competitions/NewRosterButton"
import { DeleteRosterButton } from "@/components/competitions/DeleteRosterButton"

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
  if (!userId) notFound()

  const supabase = await createClient()

  const { data: userClub } = await supabase
    .from("user_clubs").select("club_id").eq("user_id", userId).eq("is_active", true).single()
  if (!userClub) notFound()

  const { data: comp, error: compErr } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .eq("club_id", userClub.club_id)
    .single()
  if (compErr || !comp) notFound()

  const { data: rosters } = await supabase
    .from("rosters")
    .select("*, roster_athletes(id, athletes(id, name), number, position, is_captain, status)")
    .eq("competition_id", id)
    .order("match_date", { ascending: false })

  const statusMeta = STATUS_META[comp.status] ?? STATUS_META.upcoming
  const rosterList = rosters ?? []

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
          <NewRosterButton competitionId={id} />
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
                is_captain: boolean; status: string;
                athletes: { id: string; name: string } | null
              }> ?? [])
              const confirmed = athletes.filter((a) => a.status === "confirmed").length

              return (
                <Card key={roster.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-base">{roster.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Users className="w-3 h-3" />
                          {athletes.length} citados
                        </Badge>
                        {confirmed > 0 && (
                          <Badge variant="default" className="text-xs">{confirmed} confirmados</Badge>
                        )}
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
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {athletes.map((ra) => (
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
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
