'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { deleteInventoryItem } from '@/lib/actions/inventory'
import { Trash2 } from 'lucide-react'

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm('¿Eliminar este ítem del inventario?')) return
    setLoading(true)
    try {
      await deleteInventoryItem(itemId)
      toast.success('Ítem eliminado')
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
