import Link from 'next/link'
import { ClipboardList, UserCheck, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreateMatchRosterButton } from '@/components/matches/CreateMatchRosterButton'
import { AddAthleteToRosterButton } from '@/components/competitions/AddAthleteToRosterButton'
import { partitionRosterByStarter, isRosterTitular } from '@/lib/roster-partition'

export type RosterAthleteRow = {
  id: string
  athletes: { id: string; name: string } | null
  number: number | null
  position: string | null
  is_captain: boolean
  is_starter?: boolean | null
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
  matchTime?: string | null
  location: string | null
  competitionId: string | null
  competitionName: string | null
  roster: MatchRosterData | null
  isStaff: boolean
  viewerAthleteId: string | null
}

function RosterAthleteListItem({
  ra,
  viewerAthleteId,
}: {
  ra: RosterAthleteRow
  viewerAthleteId: string | null
}) {
  const isMe = viewerAthleteId != null && ra.athletes?.id === viewerAthleteId
  const titular = isRosterTitular(ra.is_starter)
  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm ${
        isMe ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
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
        <Badge variant={titular ? 'default' : 'secondary'} className="text-[10px] shrink-0 font-normal">
          {titular ? 'Titular' : 'Suplente'}
        </Badge>
        {ra.position && (
          <span className="text-xs text-muted-foreground truncate">· {ra.position}</span>
        )}
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">
        {RA_STATUS[ra.status] ?? ra.status}
      </Badge>
    </li>
  )
}

export function MatchRosterPanel({
  matchId,
  matchStatus,
  opponent,
  matchDate,
  matchTime,
  location,
  competitionId,
  competitionName,
  roster,
  isStaff,
  viewerAthleteId,
}: Props) {
  const athletes = roster?.roster_athletes ?? []
  const isNominated = viewerAthleteId != null && athletes.some((a) => a.athletes?.id === viewerAthleteId)
  const myRow = viewerAthleteId != null ? athletes.find((a) => a.athletes?.id === viewerAthleteId) : undefined
  const myTitular = myRow ? isRosterTitular(myRow.is_starter) : null

  const { titulares, suplentes } = partitionRosterByStarter(athletes)

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
              <span className="flex flex-col gap-0.5 font-medium">
                <span className="flex items-center gap-2">
                  <UserCheck className="size-4 shrink-0" />
                  Estás en la convocatoria de este partido.
                </span>
                {myTitular !== null && (
                  <span className="text-xs font-normal opacity-90 pl-6">
                    Rol asignado: <strong>{myTitular ? 'Titular' : 'Suplente / reserva'}</strong>
                  </span>
                )}
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
                matchTime={matchTime ?? null}
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
            <div className="space-y-3">
              {titulares.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mb-1 px-1">Titulares</p>
                  <ul className="divide-y rounded-lg border border-border/80">
                    {titulares.map((ra) => (
                      <RosterAthleteListItem key={ra.id} ra={ra} viewerAthleteId={viewerAthleteId} />
                    ))}
                  </ul>
                </div>
              )}
              {suplentes.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground mb-1 px-1">Suplentes / reservas</p>
                  <ul className="divide-y rounded-lg border border-border/80 border-dashed">
                    {suplentes.map((ra) => (
                      <RosterAthleteListItem key={ra.id} ra={ra} viewerAthleteId={viewerAthleteId} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
