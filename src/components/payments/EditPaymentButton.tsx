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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'
import { updatePayment } from '@/lib/actions/payments'
import { ONLINE_GATEWAY_IDS } from '@/lib/payment-methods'

const METHOD_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'manual', label: 'Manual' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'webpay', label: 'Webpay' },
  { value: 'flow', label: 'Flow' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'khipu', label: 'Khipu' },
  { value: 'other', label: 'Otro' },
]

function dateInputFromIso(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function isGatewayMethod(m: string | null | undefined): boolean {
  if (!m) return false
  return (ONLINE_GATEWAY_IDS as readonly string[]).includes(m)
}

interface Props {
  payment: {
    id: string
    concept: string
    amount: number
    due_date: string
    status: string
    paid_at: string | null
    notes: string | null
    payment_method?: string | null
    plan_id?: string | null
    period_start?: string | null
    period_end?: string | null
  }
}

export function EditPaymentButton({ payment }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    concept: payment.concept,
    amount: String(payment.amount),
    due_date: payment.due_date,
    paid_at: dateInputFromIso(payment.paid_at),
    period_start: dateInputFromIso(payment.period_start ?? null),
    period_end: dateInputFromIso(payment.period_end ?? null),
    notes: payment.notes ?? '',
    payment_method: payment.payment_method ?? '',
  })

  useEffect(() => {
    if (!open) return
    setForm({
      concept: payment.concept,
      amount: String(payment.amount),
      due_date: payment.due_date,
      paid_at: dateInputFromIso(payment.paid_at),
      period_start: dateInputFromIso(payment.period_start ?? null),
      period_end: dateInputFromIso(payment.period_end ?? null),
      notes: payment.notes ?? '',
      payment_method: payment.payment_method ?? '',
    })
  }, [open, payment])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const gatewayLocked = isGatewayMethod(form.payment_method)

  async function handleSave() {
    if (!form.concept.trim()) {
      toast.error('El concepto es obligatorio')
      return
    }
    if (!gatewayLocked && (!form.amount || Number.isNaN(Number(form.amount)))) {
      toast.error('Monto inválido')
      return
    }
    if (!gatewayLocked && payment.status === 'paid' && !form.paid_at) {
      toast.error('Indica la fecha de pago')
      return
    }

    setLoading(true)
    try {
      const patch: Parameters<typeof updatePayment>[1] = {
        concept: form.concept.trim(),
        notes: form.notes || null,
        payment_method: form.payment_method || null,
      }
      if (!gatewayLocked) {
        patch.amount = Number(form.amount)
        patch.due_date = form.due_date
        patch.period_start = form.period_start || null
        patch.period_end = form.period_end || null
        if (payment.status === 'paid') {
          patch.paid_at = form.paid_at ? form.paid_at : null
        } else if (form.paid_at) {
          patch.paid_at = form.paid_at
        }
      }

      await updatePayment(payment.id, patch)
      toast.success('Pago actualizado')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
        title="Editar pago"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar pago</DialogTitle>
            <DialogDescription>
              Montos y fechas para transferencia, efectivo y registro manual. Los pagos de pasarelas online no se
              editan aquí.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {gatewayLocked && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                Este pago está asociado a una pasarela online. Solo se puede ajustar concepto y notas; para montos y
                fechas usa el detalle en la pasarela o crea un ajuste manual aparte.
              </p>
            )}
            <div className="space-y-1">
              <Label>Concepto</Label>
              <input
                value={form.concept}
                onChange={(e) => set('concept', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto</Label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  disabled={gatewayLocked}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <Label>Vencimiento</Label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set('due_date', e.target.value)}
                  disabled={gatewayLocked}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
              </div>
            </div>
            {!gatewayLocked && (
              <div className="space-y-1">
                <Label>Fecha de pago {payment.status !== 'paid' ? '(opcional)' : ''}</Label>
                <input
                  type="date"
                  value={form.paid_at}
                  onChange={(e) => set('paid_at', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {payment.status !== 'paid' && (
                  <p className="text-[10px] text-muted-foreground">Si el pago ya se acreditó, puedes registrar la fecha aquí.</p>
                )}
              </div>
            )}
            {!gatewayLocked && (payment.plan_id || form.period_start || form.period_end) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Inicio periodo</Label>
                  <input
                    type="date"
                    value={form.period_start}
                    onChange={(e) => set('period_start', e.target.value)}
                    disabled={gatewayLocked}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fin periodo</Label>
                  <input
                    type="date"
                    value={form.period_end}
                    onChange={(e) => set('period_end', e.target.value)}
                    disabled={gatewayLocked}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label>Método de pago</Label>
              <select
                value={form.payment_method}
                onChange={(e) => set('payment_method', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                placeholder="Opcional"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
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
