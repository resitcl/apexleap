'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { checkIn } from "@/lib/actions/attendance"
import { ClipboardCheck } from "lucide-react"

interface Props {
  athletes: { id: string; name: string }[]
}

export function ManualCheckInButton({ athletes }: Props) {
  const [open, setOpen] = useState(false)
  const [athleteId, setAthleteId] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!athleteId) { toast.error("Selecciona un alumno"); return }
    setLoading(true)
    try {
      await checkIn({ athleteId })
      toast.success("Asistencia registrada")
      setOpen(false)
      setAthleteId("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar asistencia")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <ClipboardCheck className="w-4 h-4" />
        Registro Manual
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Asistencia Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="athlete-select">Alumno</Label>
            <select
              id="athlete-select"
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleccionar alumno...</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !athleteId}>
              {loading ? "Registrando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
