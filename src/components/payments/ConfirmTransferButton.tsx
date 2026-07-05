'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { CheckCircle, ExternalLink, ImageIcon } from "lucide-react"
import { confirmTransferPayment } from "@/lib/actions/payments"

interface Props {
  payment: {
    id: string
    concept: string
    amount: number
    due_date: string
    notes: string | null
    athlete_id: string
    plan_id: string | null
    athletes?: { id: string; name: string } | null
    plans?: { name: string; billing_cycle?: string } | null
  }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideButton?: boolean
}

function extractReceiptUrl(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/https?:\/\/[^\s]+/i)
  return match ? match[0] : null
}

export function ConfirmTransferButton({ payment, open: controlledOpen, onOpenChange, hideButton }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const receiptUrl = extractReceiptUrl(payment.notes)
  const athleteName = payment.athletes?.name ?? 'Atleta'
  const planName = payment.plans?.name ?? payment.concept

  function handleOpenChange(value: boolean) {
    setInternalOpen(value)
    onOpenChange?.(value)
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      await confirmTransferPayment(payment.id, paidAt)
      toast.success('Pago confirmado y suscripción activada')
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al confirmar pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!hideButton && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenChange(true) }}
        >
          <CheckCircle className="w-4 h-4" />
          Confirmar
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar Pago por Transferencia</DialogTitle>
            <DialogDescription>
              Revisa el comprobante y confirma el pago de <strong>{athleteName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Payment summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Atleta</span>
                <span className="font-medium">{athleteName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-bold text-lg">${Number(payment.amount).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vencimiento</span>
                <span className="font-medium">{new Date(`${payment.due_date}T12:00:00`).toLocaleDateString('es-CL')}</span>
              </div>
            </div>

            {/* Receipt image */}
            {receiptUrl ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Comprobante de Transferencia
                </Label>
                <div className="relative rounded-lg overflow-hidden border bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptUrl}
                    alt="Comprobante de transferencia"
                    className="w-full max-h-64 object-contain"
                  />
                </div>
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir imagen en nueva pestaña
                </a>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 text-center">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-60" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  No se encontró comprobante adjunto
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verifica con el atleta que haya subido el comprobante
                </p>
              </div>
            )}

            {/* Paid date */}
            <div className="space-y-1.5">
              <Label htmlFor="paidAt">Fecha de pago</Label>
              <input
                id="paidAt"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                La suscripción se activará desde esta fecha por el período del plan
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Confirmando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
