'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createSubscription } from '@/lib/actions/subscriptions'

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Mensual', quarterly: 'Trimestral',
  semiannual: 'Semestral', annual: 'Anual', single: 'Pago único',
}

interface Props {
  athletes: { id: string; name: string }[]
  plans: { id: string; name: string; price: number; billing_cycle: string }[]
}

export function NewSubscriptionForm({ athletes, plans }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    athlete_id: '',
    plan_id: '',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    payment_method: '',
    auto_renew: true,
    notes: '',
  })

  const selectedPlan = plans.find((p) => p.id === form.plan_id)

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.athlete_id) { toast.error('Selecciona un alumno'); return }
    if (!form.plan_id)    { toast.error('Selecciona un plan'); return }

    setLoading(true)
    try {
      await createSubscription({
        athlete_id: form.athlete_id,
        plan_id: form.plan_id,
        status: form.status as 'active' | 'paused' | 'cancelled' | 'expired',
        start_date: form.start_date,
        end_date: form.end_date || null,
        payment_method: form.payment_method || null,
        auto_renew: form.auto_renew,
        notes: form.notes || null,
      })
      toast.success('Suscripción creada correctamente')
      router.push('/dashboard/subscriptions')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alumno y Plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="athlete_id">Alumno *</Label>
            <select
              id="athlete_id"
              value={form.athlete_id}
              onChange={(e) => set('athlete_id', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleccionar alumno...</option>
              {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan_id">Plan *</Label>
            <select
              id="plan_id"
              value={form.plan_id}
              onChange={(e) => set('plan_id', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleccionar plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price.toLocaleString('es-CL')} {CYCLE_LABELS[p.billing_cycle] ?? ''}
                </option>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium">{selectedPlan.name}</p>
              <p className="text-muted-foreground">
                ${selectedPlan.price.toLocaleString('es-CL')} / {CYCLE_LABELS[selectedPlan.billing_cycle]?.toLowerCase()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vigencia</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Fecha de inicio *</Label>
            <Input id="start_date" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end_date">Fecha de fin (opcional)</Label>
            <Input id="end_date" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Estado inicial</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="active">Activa</option>
              <option value="paused">Pausada</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_method">Método de pago</Label>
            <select
              id="payment_method"
              value={form.payment_method}
              onChange={(e) => set('payment_method', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sin especificar</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="webpay">Webpay</option>
              <option value="flow">Flow</option>
              <option value="mercadopago">MercadoPago</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_renew"
              checked={form.auto_renew}
              onChange={(e) => set('auto_renew', e.target.checked)}
              className="w-4 h-4 rounded border-input"
            />
            <Label htmlFor="auto_renew" className="cursor-pointer">
              Auto-renovación al vencimiento
            </Label>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Observaciones adicionales..."
            />
          </div>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Crear Suscripción'}</Button>
      </div>
    </form>
  )
}
