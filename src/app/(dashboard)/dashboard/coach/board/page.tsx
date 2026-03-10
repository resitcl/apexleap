import { TacticalBoard } from "@/components/coach/TacticalBoard"
import { getClubSportType } from "@/lib/actions/club-context"

function mapSportType(sportType: string | null): 'basketball' | 'soccer' | 'futsal' | 'volleyball' | 'handball' | 'generic' {
  if (!sportType) return 'generic'
  const s = sportType.toLowerCase()
  if (s.includes('básquet') || s.includes('basket') || s.includes('baloncesto')) return 'basketball'
  if (s.includes('fútbol') || s.includes('futbol') || s.includes('soccer')) return 'soccer'
  if (s.includes('futsal') || s.includes('fútbol sala')) return 'futsal'
  if (s.includes('vóley') || s.includes('voley') || s.includes('volleyball')) return 'volleyball'
  if (s.includes('handball') || s.includes('balonmano')) return 'handball'
  return 'generic'
}

export default async function BoardPage() {
  const sportType = await getClubSportType()
  const sport = mapSportType(sportType)

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-3 gap-3">
      <div className="shrink-0">
        <h1 className="text-lg font-bold leading-none">Pizarra Táctica</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Diseña jugadas · Arrastra jugadores · Guarda estrategias</p>
      </div>
      <div className="flex-1 min-h-0">
        <TacticalBoard clubSport={sport} />
      </div>
    </div>
  )
}
