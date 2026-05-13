import Link from 'next/link'
import { ClipboardList, UserCheck, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreateMatchRosterButton } from '@/components/matches/CreateMatchRosterButton'
import { AddAthleteToRosterButton } from '@/components/competitions/AddAthleteToRosterButton'

export type RosterAthleteRow = {
  id: string
  athletes: { id: string; name: string } | null
  number: number | null
  position: string | null
  is_captain: boolean
  status: string
}

export type MatchRosterData = {
  id: string
  name: string
  match_date: string
  opponent: string | null
  venue: string | null
  roster_athletes: RosterAthleteRow[] | null
}

const RA_STATUS: Record<string, string> = {
  called: 'Citado',
  confirmed: 'Confirmado',
  absent: 'Ausente',
}

type Props = {
  matchId: string
  matchStatus: string
  opponent: string | null
  matchDate: string
  location: string | null
  competitionId: string | null
  competitionName: string | null
  roster: MatchRosterData | null
  isStaff: boolean
  viewerAthleteId: string | null
}

export function MatchRosterPanel({
  matchId,
  matchStatus,
  opponent,
  matchDate,
  location,
  competitionId,
  competitionName,
  roster,
  isStaff,
  viewerAthleteId,
}: Props) {
  const athletes = roster?.roster_athletes ?? []
  const isNominated = viewerAthleteId != null && athletes.some((a) => a.athletes?.id === viewerAthleteId)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Convocatoria / nómina
        </CardTitle>
        {isStaff && roster && competitionId && (
          <Button asChild variant="outline" size="sm" className="gap-1 shrink-0">
            <Link href={`/dashboard/competitions/${competitionId}`}>
              <ExternalLink className="size-3.5" />
              Gestionar en competencia
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isStaff && viewerAthleteId != null && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              isNominated
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : 'border-muted bg-muted/40 text-muted-foreground'
            }`}
          >
            {isNominated ? (
              <span className="flex items-center gap-2 font-medium">
                <UserCheck className="size-4 shrink-0" />
                Estás en la convocatoria de este partido.
              </span>
            ) : (
              <span>No figuras en la convocatoria publicada para este encuentro.</span>
            )}
          </div>
        )}

        {!roster && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aún no hay una nómina vinculada a este partido.
              {isStaff && matchStatus === 'scheduled' && ' Crea la convocatoria para citar jugadores.'}
            </p>
            {isStaff && matchStatus === 'scheduled' && (
              <CreateMatchRosterButton
                matchId={matchId}
                competitionId={competitionId}
                opponent={opponent}
                matchDate={matchDate}
                venue={location}
              />
            )}
            {isStaff && matchStatus !== 'scheduled' && (
              <p className="text-xs text-muted-foreground">
                El partido ya no está en estado &quot;Programado&quot;. Crea la nómina desde la competencia o contacta al administrador.
              </p>
            )}
          </div>
        )}

        {roster && athletes.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La convocatoria existe pero aún no hay jugadores citados.
            </p>
            {isStaff && (
              <AddAthleteToRosterButton
                rosterId={roster.id}
                competitionId={competitionId}
                rosterAthletes={[]}
                rosterName={roster.name}
              />
            )}
          </div>
        )}

        {roster && athletes.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Citados ({athletes.length})
              </p>
              {isStaff && (
                <AddAthleteToRosterButton
                  rosterId={roster.id}
                  competitionId={competitionId}
                  rosterAthletes={athletes}
                  rosterName={roster.name}
                />
              )}
            </div>
            <ul className="divide-y rounded-lg border border-border/80">
              {athletes.map((ra) => {
                const isMe = viewerAthleteId != null && ra.athletes?.id === viewerAthleteId
                return (
                  <li
                    key={ra.id}
                    className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm ${
                      isMe ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {ra.number != null && (
                        <span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">
                          #{ra.number}
                        </span>
                      )}
                      <span className={`font-medium truncate ${isMe ? 'text-primary' : ''}`}>
                        {ra.athletes?.name ?? '—'}
                        {isMe && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Tú
                          </Badge>
                        )}
                      </span>
                      {ra.is_captain && (
                        <span className="text-xs font-semibold text-amber-600 shrink-0">© Cap.</span>
                      )}
                      {ra.position && (
                        <span className="text-xs text-muted-foreground truncate">· {ra.position}</span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {RA_STATUS[ra.status] ?? ra.status}
                    </Badge>
                  </li>
                )
              })}
            </ul>
            {competitionName && (
              <p className="text-xs text-muted-foreground">
                Competencia: <span className="font-medium text-foreground">{competitionName}</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
