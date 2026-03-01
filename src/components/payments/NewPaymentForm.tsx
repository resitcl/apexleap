'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createPayment } from '@/lib/actions/payments'

interface Props {
  athletes: { id: string; name: string }[]
  plans: { id: string; name: string; price: number }[]
}

export function NewPaymentForm({ athletes, plans }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    athlete_id: '',
    plan_id: '',
    concept: '',
    amount: '',
    status: 'pending',
    due_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
  })

  function handleChange(key: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Auto-fill amount from plan
      if (key === 'plan_id' && value) {
        const plan = plans.find((p) => p.id === value)
        if (plan) {
          next.amount = String(plan.price)
          next.concept = `Mensualidad - ${plan.name}`
        }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.athlete_id) { toast.error('Selecciona un alumno'); return }
    if (!form.concept) { toast.error('El concepto es requerido'); return }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Ingresa un monto válido'); return }
    if (!form.due_date) { toast.error('La fecha de vencimiento es requerida'); return }

    setLoading(true)
    try {
      await createPayment({
        athlete_id: form.athlete_id,
        plan_id: form.plan_id || null,
        concept: form.concept,
        amount: Number(form.amount),
        status: form.status as 'pending' | 'paid' | 'overdue' | 'failed' | 'cancelled',
        due_date: form.due_date,
        payment_method: form.payment_method || null,
        notes: form.notes || null,
        paid_at: form.status === 'paid' ? new Date().toISOString() : null,
        transaction_id: null,
      })
      toast.success('Pago registrado correctamente')
      router.push('/dashboard/payments')
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
          <CardTitle className="text-base">Detalle del Pago</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="athlete_id">Alumno *</Label>
            <select
              id="athlete_id"
              value={form.athlete_id}
              onChange={(e) => handleChange('athlete_id', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleccionar alumno...</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan_id">Plan (opcional)</Label>
            <select
              id="plan_id"
              value={form.plan_id}
              onChange={(e) => handleChange('plan_id', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sin plan asociado</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (${p.price.toLocaleString('es-CL')})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="concept">Concepto *</Label>
            <Input
              id="concept"
              value={form.concept}
              onChange={(e) => handleChange('concept', e.target.value)}
              placeholder="Ej: Mensualidad Marzo 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="amount"
                  type="number"
                  className="pl-7"
                  value={form.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  min="0"
                  step="100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">Vencimiento *</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado del Pago</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>

          {form.status === 'paid' && (
            <div className="space-y-1.5">
              <Label htmlFor="payment_method">Método de pago</Label>
              <select
                id="payment_method"
                value={form.payment_method}
                onChange={(e) => handleChange('payment_method', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccionar...</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="webpay">Webpay</option>
                <option value="flow">Flow</option>
                <option value="mercadopago">MercadoPago</option>
              </select>
            </div>
          )}

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Observaciones adicionales..."
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Registrar Pago'}
        </Button>
      </div>
    </form>
  )
}
