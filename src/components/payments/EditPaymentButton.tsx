'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Pencil } from "lucide-react"
import { updatePayment } from "@/lib/actions/payments"

const METHOD_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'webpay', label: 'Webpay' },
  { value: 'flow', label: 'Flow' },
  { value: 'mercadopago', label: 'MercadoPago' },
]

interface Props {
  payment: {
    id: string
    concept: string
    amount: number
    due_date: string
    notes: string | null
    type?: string
    payment_method?: string | null
  }
}

export function EditPaymentButton({ payment }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    concept:        payment.concept,
    amount:         String(payment.amount),
    due_date:       payment.due_date,
    notes:          payment.notes ?? '',
    payment_method: payment.payment_method ?? '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.concept.trim()) { toast.error('El concepto es obligatorio'); return }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error('Monto inválido'); return }
    setLoading(true)
    try {
      await updatePayment(payment.id, {
        concept:        form.concept.trim(),
        amount:         Number(form.amount),
        due_date:       form.due_date,
        notes:          form.notes || null,
        payment_method: form.payment_method || null,
      })
      toast.success('Pago actualizado')
      setOpen(false)
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
        onClick={(e) => { e.preventDefault(); setOpen(true) }}
        title="Editar pago"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
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
                  type="number" min="0" step="1"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha vencimiento</Label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set('due_date', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Método de pago</Label>
              <select
                value={form.payment_method}
                onChange={(e) => set('payment_method', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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
