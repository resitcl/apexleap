'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updateVenue } from '@/lib/actions/venues'
import { Power } from 'lucide-react'

interface Props {
  venueId: string
  isActive: boolean
}

export function VenueToggleButton({ venueId, isActive }: Props) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try {
      await updateVenue(venueId, { is_active: !isActive })
      toast.success(isActive ? 'Sede desactivada' : 'Sede activada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handle}
      disabled={loading}
      className={`h-7 px-2 text-xs ${isActive ? 'text-muted-foreground hover:text-destructive' : 'text-green-600 hover:text-green-700'}`}
    >
      <Power className="w-3.5 h-3.5 mr-1" />
      {isActive ? 'Desactivar' : 'Activar'}
    </Button>
  )
}
