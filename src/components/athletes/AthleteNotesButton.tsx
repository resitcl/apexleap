'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { StickyNote } from "lucide-react"
import { updateAthlete } from "@/lib/actions/athletes"

interface Props {
  athleteId: string
  currentNotes: string | null
}

export function AthleteNotesButton({ athleteId, currentNotes }: Props) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(currentNotes ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      await updateAthlete(athleteId, { notes: notes.trim() || undefined })
      toast.success('Notas actualizadas')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <StickyNote className="w-3.5 h-3.5" />
        {currentNotes ? 'Editar notas' : 'Agregar notas'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notas del atleta</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Observaciones, indicaciones técnicas, información relevante..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">{notes.length} caracteres</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
