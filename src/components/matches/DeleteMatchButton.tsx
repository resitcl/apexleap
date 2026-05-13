'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteMatch } from '@/lib/actions/matches'
import { Button } from '@/components/ui/button'

type Props = {
  matchId: string
  competitionId: string | null
  /** Si se indica, navega tras borrar (p. ej. volver al listado). Si no, solo refresca la vista actual. */
  redirectTo?: string | null
  size?: 'default' | 'sm'
}

export function DeleteMatchButton({ matchId, competitionId, redirectTo, size = 'sm' }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()

  function handleClick() {
    if (
      !confirm(
        '¿Eliminar este partido? También se eliminarán las estadísticas y datos vinculados a este encuentro.'
      )
    ) {
      return
    }
    start(async () => {
      await deleteMatch(matchId, competitionId)
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className="gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      Eliminar
    </Button>
  )
}
