'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { deleteCompetition } from '@/lib/actions/competitions'
import { Trash2 } from 'lucide-react'

export function DeleteCompetitionButton({ competitionId }: { competitionId: string }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm('¿Eliminar esta competencia? Se eliminarán todas sus nóminas asociadas.')) return
    setLoading(true)
    try {
      await deleteCompetition(competitionId)
      toast.success('Competencia eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={loading}
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0">
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  )
}
