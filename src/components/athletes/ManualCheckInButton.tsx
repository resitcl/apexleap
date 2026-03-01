'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { ClipboardCheck } from "lucide-react"
import { checkIn } from "@/lib/actions/attendance"
import { getSchedules } from "@/lib/actions/schedules"

type Schedule = { id: string; name: string; start_time: string }

interface Props {
  athleteId: string
}

export function ManualCheckInButton({ athleteId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [scheduleId, setScheduleId] = useState('')

  useEffect(() => {
    if (!open) return
    getSchedules().then((data) => {
      const active = data.filter((s) => s.is_active)
      setSchedules(active as Schedule[])
    }).catch(() => {})
  }, [open])

  async function handleCheckIn() {
    setLoading(true)
    try {
      await checkIn({ athleteId, scheduleId: scheduleId || undefined })
      toast.success('Asistencia registrada')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar asistencia')
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
        <ClipboardCheck className="w-3.5 h-3.5" />
        Check-in manual
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar asistencia</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Marca asistencia manual para hoy. Si el atleta ya registró asistencia hoy, la operación fallará.
            </p>
            <div className="space-y-1">
              <Label>Sesión (opcional)</Label>
              <select
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sin sesión específica</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.start_time?.slice(0, 5)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleCheckIn} disabled={loading}>
              {loading ? 'Registrando...' : 'Confirmar asistencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
