'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { UserRoundPlus, X } from "lucide-react"
import { assignDocumentAthlete } from "@/lib/actions/documents"
import { getAthletes } from "@/lib/actions/athletes"

interface Props {
  documentId: string
  documentName: string
  currentAthleteId: string | null
  currentAthleteName: string | null
}

export function AssignDocumentAthleteButton({
  documentId, documentName, currentAthleteId, currentAthleteName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState(currentAthleteId ?? '')

  useEffect(() => {
    if (!open) return
    getAthletes({ status: 'active', limit: 200 })
      .then((r) => setAthletes(r.athletes.map((a) => ({ id: a.id, name: a.name }))))
      .catch(() => {})
  }, [open])

  async function handleSave() {
    setLoading(true)
    try {
      await assignDocumentAthlete(documentId, selected || null)
      toast.success(selected ? 'Alumno asignado al documento' : 'Alumno desvinculado del documento')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        title="Asignar alumno"
      >
        <UserRoundPlus className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar alumno al documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground truncate">
              <strong>{documentName}</strong>
            </p>
            {currentAthleteName && (
              <div className="flex items-center justify-between text-sm bg-muted/50 rounded px-2.5 py-1.5">
                <span>Actual: <strong>{currentAthleteName}</strong></span>
                <Button
                  variant="ghost" size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    setLoading(true)
                    try {
                      await assignDocumentAthlete(documentId, null)
                      toast.success('Alumno desvinculado')
                      setSelected('')
                      setOpen(false)
                    } catch { toast.error('Error') } finally { setLoading(false) }
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <div className="space-y-1">
              <Label>Alumno</Label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sin alumno asignado</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
