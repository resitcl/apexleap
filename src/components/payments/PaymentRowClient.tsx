'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EditPaymentButton } from './EditPaymentButton'
import { MarkAsPaidButton } from './MarkAsPaidButton'
import { ConfirmTransferButton } from './ConfirmTransferButton'
import { DeletePaymentButton } from './DeletePaymentButton'

const STATUS_DOT: Record<string, string> = {
  paid: 'bg-emerald-400', pending: 'bg-amber-400', overdue: 'bg-red-500',
  failed: 'bg-red-500', cancelled: 'bg-muted-foreground/40',
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Pagado', pending: 'Pendiente', overdue: 'Vencido',
  failed: 'Fallido', cancelled: 'Cancelado',
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo', transfer: 'Transferencia', webpay: 'Webpay',
  flow: 'Flow', mercadopago: 'MercadoPago', khipu: 'Khipu', other: 'Otro',
}

const BILLING_LABEL: Record<string, string> = {
  monthly: 'mes', quarterly: 'trim', semiannual: 'sem', annual: 'año', single: 'único',
}

interface Payment {
  id: string
  concept: string
  amount: number
  due_date: string
  paid_at: string | null
  status: string
  payment_method: string | null
  notes: string | null
  athlete_id: string
  plan_id: string | null
  period_start?: string | null
  period_end?: string | null
  athletes: { id: string; name: string; photo_url: string | null } | null
  plans: { name: string; billing_cycle?: string } | null
}

interface Props {
  payment: Payment
  athleteDebt: number
  isDuplicate: boolean
  /** subscriptions.next_billing_date de la suscripción activa del atleta */
  nextBillingDate: string | null
}

export function PaymentRowClient({ payment, athleteDebt, isDuplicate, nextBillingDate }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const athlete = payment.athletes
  const notes = payment.notes
  const hasReceipt = notes && /https?:\/\/[^\s]+/i.test(notes)
  const isTransfer = payment.payment_method === 'transfer' || (notes && notes.toLowerCase().includes('comprobante'))
  const isPendingTransfer = (payment.status === 'pending' || payment.status === 'overdue') && (isTransfer || hasReceipt)
  const plan = payment.plans

  const dot = STATUS_DOT[payment.status] ?? 'bg-muted-foreground/40'
  const label = STATUS_LABEL[payment.status] ?? payment.status

  function handleRowClick() {
    if (isPendingTransfer && !confirmOpen) {
      setConfirmOpen(true)
    }
  }

  return (
    <>
      <div
        className={`grid grid-cols-1 md:grid-cols-[minmax(200px,2fr)_110px_minmax(140px,1.5fr)_120px_110px_130px_120px] gap-3 md:gap-4 items-center px-6 py-4 transition-colors ${
          isPendingTransfer
            ? 'cursor-pointer hover:bg-primary/5 border-l-2 border-l-primary/40'
            : 'hover:bg-muted/5'
        }`}
        onClick={handleRowClick}
      >
        {/* Athlete */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 shrink-0 border border-white/[0.06]">
            <AvatarFallback className="text-xs font-black bg-muted/40">
              {athlete?.name?.slice(0, 2).toUpperCase() ?? '??'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {athlete ? (
              <Link
                href={`/dashboard/athletes/${athlete.id}`}
                className="text-sm font-bold hover:text-primary transition-colors truncate block"
                onClick={(e) => e.stopPropagation()}
              >
                {athlete.name}
              </Link>
            ) : (
              <span className="text-sm font-bold text-muted-foreground">—</span>
            )}
            <p className="text-[10px] text-muted-foreground/60 truncate">
              {payment.concept}
              {hasReceipt && <span className="text-primary/80 ml-1.5">📎 Comprobante</span>}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div>
          <p className="text-sm font-black tracking-tight text-foreground">${Number(payment.amount).toLocaleString('es-CL')}</p>
          {payment.payment_method && (
            <p className="text-[10px] text-muted-foreground/50 font-medium mt-0.5">{METHOD_LABEL[payment.payment_method] ?? payment.payment_method}</p>
          )}
        </div>

        {/* Plan */}
        <div className="min-w-0">
          {plan ? (
            <>
              <p className="text-sm font-bold text-foreground/80 truncate">{plan.name}</p>
              <p className="text-[10px] text-muted-foreground/50 font-medium">
                ${Number(payment.amount).toLocaleString('es-CL')}/{BILLING_LABEL[plan.billing_cycle ?? ''] ?? ''}
              </p>
            </>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          )}
        </div>

        {/* Next subscription payment */}
        <div>
          <p className="md:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-0.5">Próximo pago</p>
          {nextBillingDate ? (
            <p className="text-sm text-muted-foreground font-medium">
              {new Date(nextBillingDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          ) : (
            <span className="text-sm text-muted-foreground/40">—</span>
          )}
        </div>

        {/* Paid at */}
        <div>
          <p className="md:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-0.5">Fecha pago</p>
          {payment.paid_at ? (
            <p className="text-sm text-muted-foreground font-medium">
              {new Date(payment.paid_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          ) : (
            <span className="text-sm text-muted-foreground/40">—</span>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <span className={`text-sm font-bold ${
              payment.status === 'paid' ? 'text-primary' :
              payment.status === 'overdue' ? 'text-destructive' :
              payment.status === 'pending' ? 'text-amber-400' :
              'text-muted-foreground'
            }`}>
              {label}
            </span>
            {isDuplicate && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">DUP</span>}
          </div>
          {payment.status === 'overdue' && (() => {
            const days = Math.floor((Date.now() - new Date(payment.due_date).getTime()) / 86400000)
            if (days <= 0) return null
            return <p className="text-[10px] text-destructive font-bold pl-4">{days}d mora</p>
          })()}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          <EditPaymentButton payment={payment} />
          {(payment.status === 'pending' || payment.status === 'overdue') && (
            isPendingTransfer ? (
              <ConfirmTransferButton payment={payment} />
            ) : (
              <MarkAsPaidButton paymentId={payment.id} />
            )
          )}
          <DeletePaymentButton paymentId={payment.id} />
        </div>
      </div>

      {/* Controlled dialog for row click */}
      {isPendingTransfer && (
        <ConfirmTransferButton
          payment={payment}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          hideButton
        />
      )}
    </>
  )
}
