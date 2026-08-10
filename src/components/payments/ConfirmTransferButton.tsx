'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { CheckCircle, ExternalLink, ImageIcon, Pencil, RotateCcw } from "lucide-react"
import { confirmTransferPayment, getReceiptSignedUrl } from "@/lib/actions/payments"

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

function extractReceiptRef(notes: string | null): string | null {
  if (!notes) return null
  // Formato nuevo: "Comprobante: <ruta>". Legacy: una URL http suelta.
  const marked = notes.match(/Comprobante:\s*(\S+)/i)
  if (marked) return marked[1]
  const url = notes.match(/https?:\/\/[^\s]+/i)
  return url ? url[0] : null
}

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

export function ConfirmTransferButton({ payment, open: controlledOpen, onOpenChange, hideButton }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const expectedAmount = Math.round(Number(payment.amount) || 0)
  const [amountText, setAmountText] = useState(String(expectedAmount))
  const [editingAmount, setEditingAmount] = useState(false)

  const receiptRef = extractReceiptRef(payment.notes)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [receiptLoading, setReceiptLoading] = useState(false)

  // El comprobante vive en un bucket PRIVADO: pedimos una URL firmada temporal al abrir el diálogo.
  useEffect(() => {
    if (!open || !receiptRef) return
    let cancelled = false
    setReceiptLoading(true)
    setReceiptUrl(null)
    getReceiptSignedUrl(receiptRef)
      .then((url) => { if (!cancelled) setReceiptUrl(url) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReceiptLoading(false) })
    return () => { cancelled = true }
  }, [open, receiptRef])

  // Al reabrir el diálogo se vuelve al monto del plan (evita arrastrar un descuento anterior).
  useEffect(() => {
    if (open) {
      setAmountText(String(expectedAmount))
      setEditingAmount(false)
    }
  }, [open, expectedAmount])

  const athleteName = payment.athletes?.name ?? 'Atleta'
  const planName = payment.plans?.name ?? payment.concept

  const parsedAmount = Number(amountText.replace(/[^\d]/g, ''))
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount >= 0 && amountText.trim() !== ''
  const diff = amountValid ? parsedAmount - expectedAmount : 0
  const hasDiff = amountValid && Math.abs(diff) >= 1

  function handleOpenChange(value: boolean) {
    setInternalOpen(value)
    onOpenChange?.(value)
  }

  async function handleConfirm() {
    if (!amountValid) {
      toast.error('Ingresa un monto válido')
      return
    }
    setLoading(true)
    try {
      await confirmTransferPayment(payment.id, paidAt, parsedAmount)
      toast.success(
        hasDiff
          ? `Pago confirmado por ${clp(parsedAmount)} (plan ${clp(expectedAmount)})`
          : 'Pago confirmado y suscripción activada',
      )
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
          className="gap-1 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10 dark:text-emerald-400"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenChange(true) }}
        >
          <CheckCircle className="w-4 h-4" />
          Confirmar
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
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
                <span className="text-muted-foreground">Monto del plan</span>
                <span className="font-medium">{clp(expectedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vencimiento</span>
                <span className="font-medium">{new Date(`${payment.due_date}T12:00:00`).toLocaleDateString('es-CL')}</span>
              </div>
            </div>

            {/* Receipt image */}
            {receiptRef ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Comprobante de Transferencia
                </Label>
                <div className="relative rounded-lg overflow-hidden border bg-muted/30 min-h-[8rem] flex items-center justify-center">
                  {receiptLoading ? (
                    <span className="text-xs text-muted-foreground py-10">Cargando comprobante…</span>
                  ) : receiptUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receiptUrl}
                      alt="Comprobante de transferencia"
                      className="w-full max-h-64 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground py-10">No se pudo cargar el comprobante.</span>
                  )}
                </div>
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Abrir imagen en nueva pestaña
                  </a>
                )}
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

            {/* Monto realmente transferido — permite registrar descuentos/becas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="paidAmount">Monto transferido</Label>
                {!editingAmount ? (
                  <button
                    type="button"
                    onClick={() => setEditingAmount(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Pencil className="w-3 h-3" />
                    Aplicar descuento
                  </button>
                ) : hasDiff ? (
                  <button
                    type="button"
                    onClick={() => setAmountText(String(expectedAmount))}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Usar monto del plan
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                <input
                  id="paidAmount"
                  type="text"
                  inputMode="numeric"
                  value={amountText}
                  readOnly={!editingAmount}
                  onFocus={() => setEditingAmount(true)}
                  onChange={(e) => setAmountText(e.target.value.replace(/[^\d]/g, ''))}
                  className={`w-full h-11 rounded-md border bg-background pl-7 pr-3 py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-ring ${
                    !amountValid
                      ? 'border-destructive'
                      : hasDiff
                        ? 'border-amber-500'
                        : 'border-input'
                  } ${!editingAmount ? 'text-muted-foreground' : ''}`}
                />
              </div>
              {!amountValid ? (
                <p className="text-xs text-destructive">Ingresa un monto válido (solo números).</p>
              ) : hasDiff ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {diff < 0 ? 'Descuento' : 'Excedente'} de <strong>{clp(Math.abs(diff))}</strong> respecto al plan
                  ({clp(expectedAmount)}). Se registrará el monto real y quedará anotado en el pago.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Se registrará el monto del plan. Edítalo si el alumno transfirió otra cantidad.
                </p>
              )}
            </div>

            {/* Paid date */}
            <div className="space-y-1.5">
              <Label htmlFor="paidAt">Fecha de pago</Label>
              <input
                id="paidAt"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                La suscripción se activará desde esta fecha por el período del plan
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading || !amountValid} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Confirmando...' : `Confirmar ${clp(amountValid ? parsedAmount : expectedAmount)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
