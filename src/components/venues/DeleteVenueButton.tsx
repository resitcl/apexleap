'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { deleteVenue } from '@/lib/actions/venues'
import { Trash2 } from 'lucide-react'

export function DeleteVenueButton({ venueId, venueName }: { venueId: string; venueName: string }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm(`¿Eliminar la sede "${venueName}"? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    try {
      await deleteVenue(venueId)
      toast.success('Sede eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={loading}
      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
