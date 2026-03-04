export const dynamic = "force-dynamic"

import { getAllMatches } from "@/lib/actions/matches"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Swords, Trophy, MapPin, Calendar } from "lucide-react"
import { StandaloneMatchButton } from "@/components/matches/StandaloneMatchButton"
import Link from "next/link"

const STATUS_LABEL: Record<string, string> = {
  scheduled:   "Programado",
  in_progress: "En juego",
  finished:    "Finalizado",
}
const STATUS_COLOR: Record<string, string> = {
  scheduled:   "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  finished:    "bg-muted text-muted-foreground",
}

export default async function MatchesPage() {
  let matches: Awaited<ReturnType<typeof getAllMatches>> = []
  let error: string | null = null

  try {
    matches = await getAllMatches()
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar partidos"
  }

  const standalone = matches.filter((m) => !m.competition_id)
  const withComp   = matches.filter((m) =>  m.competition_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Partidos</h1>
          <p className="text-muted-foreground">
            {matches.length} partido{matches.length !== 1 ? 's' : ''} en total
            {standalone.length > 0 && ` · ${standalone.length} amistoso${standalone.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <StandaloneMatchButton />
      </div>

      {error && (
        <Card>
          <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
        </Card>
      )}

      {!error && matches.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Swords className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin partidos registrados</h3>
            <p className="text-muted-foreground mb-4">Registra amistosos o consulta los partidos de tus campeonatos</p>
            <StandaloneMatchButton />
          </CardContent>
        </Card>
      )}

      {/* Standalone / friendly matches */}
      {standalone.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Swords className="w-5 h-5" />
            Amistosos y partidos libres ({standalone.length})
          </h2>
          <div className="space-y-2">
            {standalone.map((m) => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Matches linked to competitions */}
      {withComp.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Partidos de competencia ({withComp.length})
          </h2>
          <div className="space-y-2">
            {withComp.map((m) => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function MatchRow({ match }: { match: Awaited<ReturnType<typeof getAllMatches>>[number] }) {
  const comp = match.competitions as { id: string; name: string } | null
  const dateLabel = new Date(match.match_date + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  const ourScore   = match.is_home ? match.home_score : match.away_score
  const theirScore = match.is_home ? match.away_score : match.home_score
  const hasScore   = ourScore !== null && theirScore !== null
  const resultColor = hasScore
    ? ourScore! > theirScore! ? 'text-green-600' : ourScore! < theirScore! ? 'text-red-600' : 'text-yellow-600'
    : ''

  const href = comp ? `/dashboard/competitions/${comp.id}` : '#'

  return (
    <Link href={href}>
      <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">vs. {match.opponent ?? '—'}</span>
                {hasScore && (
                  <span className={`font-bold text-sm ${resultColor}`}>
                    {ourScore} – {theirScore}
                  </span>
                )}
                <Badge variant="outline" className={`text-xs ${STATUS_COLOR[match.status] ?? ''}`}>
                  {STATUS_LABEL[match.status] ?? match.status}
                </Badge>
                <Badge variant="outline" className={`text-xs ${match.is_home ? 'border-green-300 text-green-700' : 'border-orange-300 text-orange-700'}`}>
                  {match.is_home ? 'Local' : 'Visita'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateLabel}</span>
                {match.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{match.location}</span>}
                {comp && <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-primary" />{comp.name}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
