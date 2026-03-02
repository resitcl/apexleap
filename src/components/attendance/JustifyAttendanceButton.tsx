'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { CheckCircle2 } from "lucide-react"
import { justifyAttendance, markAttendanceInvalid } from "@/lib/actions/attendance"

interface Props {
  attendanceId: string
  isValid: boolean
  currentNotes?: string | null
}

export function JustifyAttendanceButton({ attendanceId, isValid, currentNotes }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(currentNotes ?? "")
  const [loading, setLoading] = useState(false)

  async function handleJustify() {
    if (!reason.trim()) { toast.error("Ingresa el motivo de justificación"); return }
    setLoading(true)
    try {
      await justifyAttendance({ attendanceId, reason: reason.trim() })
      toast.success("Asistencia justificada")
      setOpen(false)
    } catch {
      toast.error("Error al justificar")
    } finally {
      setLoading(false)
    }
  }

  async function handleInvalidate() {
    if (!confirm("¿Marcar esta asistencia como inválida?")) return
    setLoading(true)
    try {
      await markAttendanceInvalid({ attendanceId })
      toast.success("Asistencia marcada como inválida")
      setOpen(false)
    } catch {
      toast.error("Error al actualizar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
          currentNotes
            ? "text-blue-500 hover:bg-blue-50"
            : "text-muted-foreground hover:bg-accent"
        }`}
        title={currentNotes ? `Justificado: ${currentNotes}` : "Justificar asistencia"}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Justificar Asistencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Motivo de justificación *</Label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Viaje, enfermedad, permiso médico..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isValid && (
              <Button variant="ghost" size="sm" onClick={handleInvalidate} disabled={loading} className="text-destructive hover:text-destructive sm:mr-auto">
                Invalidar
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleJustify} disabled={loading || !reason.trim()}>
              {loading ? "Guardando..." : "Justificar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
