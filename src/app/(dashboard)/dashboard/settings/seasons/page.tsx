export const dynamic = "force-dynamic"

import { getSeasons } from "@/lib/actions/seasons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Trophy } from "lucide-react"
import { SeasonsList } from "@/components/seasons/SeasonsList"
import { NewSeasonForm } from "@/components/seasons/NewSeasonForm"

export default async function SeasonsPage() {
  const seasons = await getSeasons(true)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Temporadas</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Gestiona las temporadas del club (Apertura / Clausura). La temporada activa
          se aplica como contexto en competencias, partidos y estadísticas.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Nueva Temporada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewSeasonForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Temporadas del Club
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SeasonsList seasons={seasons} />
        </CardContent>
      </Card>
    </div>
  )
}
