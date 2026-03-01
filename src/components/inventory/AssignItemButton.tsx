'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateInventoryItem } from '@/lib/actions/inventory'
import { UserPlus, UserMinus } from 'lucide-react'

interface Athlete {
  id: string
  name: string
}

interface Props {
  itemId: string
  currentAssignedId: string | null
  athletes: Athlete[]
}

export function AssignItemButton({ itemId, currentAssignedId, athletes }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function assign(athleteId: string | null) {
    setLoading(true)
    try {
      await updateInventoryItem(itemId, { assigned_to: athleteId })
      toast.success(athleteId ? 'Ítem asignado' : 'Asignación removida')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary shrink-0">
          {currentAssignedId ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Asignar Ítem</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-72 overflow-y-auto mt-2">
          {currentAssignedId && (
            <Button variant="outline" className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={() => assign(null)} disabled={loading}>
              <UserMinus className="w-4 h-4" />
              Remover asignación
            </Button>
          )}
          {athletes.map((a) => (
            <Button key={a.id} variant={currentAssignedId === a.id ? "default" : "ghost"}
              className="w-full justify-start" onClick={() => assign(a.id)} disabled={loading}>
              {a.name}
            </Button>
          ))}
          {athletes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin alumnos registrados</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
