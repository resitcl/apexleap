'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { CreditCard } from "lucide-react"
import { createSubscription } from "@/lib/actions/subscriptions"
import { getPlans } from "@/lib/actions/plans"

type Plan = { id: string; name: string; billing_cycle: string; price: number }

const CYCLE_DAYS: Record<string, number> = {
  monthly: 30, quarterly: 90, semiannual: 180, annual: 365, single: 0,
}

interface Props {
  athleteId: string
}

export function NewSubscriptionFromAthleteButton({ athleteId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [form, setForm] = useState({
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
    autoRenew: true,
  })

  useEffect(() => {
    if (!open) return
    getPlans().then((data) => {
      const active = data.filter((p) => p.is_active)
      setPlans(active as Plan[])
      if (active.length > 0 && !form.planId) {
        setForm((f) => ({ ...f, planId: active[0].id }))
      }
    }).catch(() => {})
  }, [open])

  function computeEndDate(planId: string, startDate: string): string | null {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return null
    const days = CYCLE_DAYS[plan.billing_cycle] ?? 30
    if (days === 0) return null
    const end = new Date(startDate + 'T12:00:00')
    end.setDate(end.getDate() + days)
    return end.toISOString().split('T')[0]
  }

  async function handleSave() {
    if (!form.planId) { toast.error('Selecciona un plan'); return }
    setLoading(true)
    try {
      const endDate = computeEndDate(form.planId, form.startDate)
      await createSubscription({
        athlete_id: athleteId,
        plan_id: form.planId,
        status: 'active',
        start_date: form.startDate,
        end_date: endDate,
        auto_renew: form.autoRenew,
      })
      toast.success('Suscripción creada')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear suscripción')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = plans.find((p) => p.id === form.planId)
  const endDate = form.planId ? computeEndDate(form.planId, form.startDate) : null

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <CreditCard className="w-3.5 h-3.5" />
        Asignar Plan
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar suscripción</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Plan</Label>
              <select
                value={form.planId}
                onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccionar plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${Number(p.price).toLocaleString('es-CL')}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Fecha inicio</Label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {selectedPlan && endDate && (
              <p className="text-xs text-muted-foreground">
                Vencimiento calculado: <strong>{new Date(endDate + 'T12:00:00').toLocaleDateString('es-CL')}</strong>
              </p>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.autoRenew}
                onChange={(e) => setForm((f) => ({ ...f, autoRenew: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              Auto-renovación
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading || !form.planId}>
              {loading ? 'Creando...' : 'Crear suscripción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
