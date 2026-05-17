'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createRoster } from '@/lib/actions/rosters'

type Props = {
  matchId: string
  competitionId: string | null
  opponent: string | null
  matchDate: string
  matchTime?: string | null
  venue: string | null
}

export function CreateMatchRosterButton({ matchId, competitionId, opponent, matchDate, matchTime, venue }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function onClick() {
    start(async () => {
      try {
        await createRoster({
          competitionId: competitionId ?? null,
          name: `Convocatoria vs ${opponent?.trim() || 'rival'}`,
          matchDate,
          matchTime: matchTime ?? null,
          opponent: opponent ?? null,
          venue: venue ?? null,
          matchId,
        })
        toast.success('Convocatoria creada. Ya puedes agregar jugadores.')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo crear la convocatoria')
      }
    })
  }

  return (
    <Button type="button" onClick={onClick} disabled={pending} size="sm" className="gap-1.5">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      Crear convocatoria / nómina
    </Button>
  )
}
