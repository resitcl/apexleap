'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { markAsPaid } from "@/lib/actions/payments"
import { CheckCircle } from "lucide-react"

const METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'webpay', label: 'Webpay' },
  { value: 'flow', label: 'Flow' },
  { value: 'mercadopago', label: 'MercadoPago' },
]

interface Props {
  paymentId: string
}

export function MarkAsPaidButton({ paymentId }: Props) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState('cash')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await markAsPaid(paymentId, method, paidAt)
      toast.success('Pago marcado como pagado')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
        onClick={(e) => { e.preventDefault(); setOpen(true) }}
      >
        <CheckCircle className="w-4 h-4" />
        Pagar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="method">Método de pago</Label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paidAt">Fecha de pago</Label>
              <input
                id="paidAt"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
