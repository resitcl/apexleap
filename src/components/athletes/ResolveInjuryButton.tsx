'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { resolveInjury } from '@/lib/actions/injuries'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  injuryId: string
  athleteId: string
}

export function ResolveInjuryButton({ injuryId, athleteId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm('¿Marcar esta lesión como recuperada?')) return
    setLoading(true)
    try {
      await resolveInjury(injuryId, athleteId)
      toast.success('Lesión marcada como recuperada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={loading}
      className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50">
      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
      Alta
    </Button>
  )
}
