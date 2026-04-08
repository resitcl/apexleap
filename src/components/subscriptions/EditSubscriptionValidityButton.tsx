'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CalendarRange } from 'lucide-react'
import { updateSubscriptionDates } from '@/lib/actions/subscriptions'

function dateOrEmpty(v: string | null | undefined): string {
  if (!v) return ''
  return v.slice(0, 10)
}

interface Props {
  subscriptionId: string
  endDate: string | null
  currentPeriodEnd: string | null
}

export function EditSubscriptionValidityButton({ subscriptionId, endDate, currentPeriodEnd }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    end_date: dateOrEmpty(endDate),
    current_period_end: dateOrEmpty(currentPeriodEnd ?? endDate),
  })

  useEffect(() => {
    if (!open) return
    setForm({
      end_date: dateOrEmpty(endDate),
      current_period_end: dateOrEmpty(currentPeriodEnd ?? endDate),
    })
  }, [open, endDate, currentPeriodEnd])

  async function handleSave() {
    setLoading(true)
    try {
      await updateSubscriptionDates(subscriptionId, {
        end_date: form.end_date || null,
        current_period_end: form.current_period_end || null,
      })
      toast.success('Vigencia actualizada')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <CalendarRange className="w-3.5 h-3.5" />
        Vigencia
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar vigencia</DialogTitle>
            <DialogDescription>
              Fecha de término de la suscripción y fin del periodo pagado actual. Úsalo para corregir cuotas atrasadas o
              acuerdos especiales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Término suscripción (end_date)</Label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label>Fin periodo actual (current_period_end)</Label>
              <input
                type="date"
                value={form.current_period_end}
                onChange={(e) => setForm((f) => ({ ...f, current_period_end: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground">
                Suele coincidir con el fin de la mensualidad pagada. Déjalo vacío solo si no aplica.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
