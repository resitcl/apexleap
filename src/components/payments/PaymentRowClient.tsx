'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EditPaymentButton } from './EditPaymentButton'
import { MarkAsPaidButton } from './MarkAsPaidButton'
import { ConfirmTransferButton } from './ConfirmTransferButton'
import { DeletePaymentButton } from './DeletePaymentButton'
import { ONLINE_GATEWAY_IDS, paymentMethodLabel } from '@/lib/payment-methods'
import { paymentRowTone } from '@/lib/payment-status'

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
  isDuplicate: boolean
  /** subscriptions.next_billing_date de la suscripción activa del atleta */
  nextBillingDate: string | null
  /** Días de mora ya calculados en el servidor (no usar Date.now() en render). */
  overdueDays: number
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

export function PaymentRowClient({ payment, isDuplicate, nextBillingDate, overdueDays }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const athlete = payment.athletes
  const notes = payment.notes
  const hasReceipt = notes && /https?:\/\/[^\s]+/i.test(notes)
  const isOnlineGateway = !!payment.payment_method && (ONLINE_GATEWAY_IDS as readonly string[]).includes(payment.payment_method)
  // Las pasarelas (Flow/MercadoPago) se confirman solas; nunca son confirmación manual de transferencia.
  const isTransfer = !isOnlineGateway && (payment.payment_method === 'transfer' || (notes && notes.toLowerCase().includes('comprobante')))
  const isPendingTransfer = (payment.status === 'pending' || payment.status === 'overdue') && (isTransfer || hasReceipt)
  const plan = payment.plans

  const tone = paymentRowTone(payment.status)

  function handleRowClick() {
    if (isPendingTransfer && !confirmOpen) {
      setConfirmOpen(true)
    }
  }

  const actions = (
    <>
      <EditPaymentButton payment={payment} />
      {(payment.status === 'pending' || payment.status === 'overdue') && !isOnlineGateway && (
        isPendingTransfer ? (
          <ConfirmTransferButton payment={payment} />
        ) : (
          <MarkAsPaidButton paymentId={payment.id} />
        )
      )}
      <DeletePaymentButton paymentId={payment.id} />
    </>
  )

  const statusChip = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${tone.bg} ${tone.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {tone.label}
      {overdueDays > 0 ? <span className="opacity-80">· {overdueDays}d</span> : null}
    </span>
  )

  return (
    <>
      {/* ══ MOBILE CARD ══ */}
      <div
        className={`md:hidden p-4 space-y-3 transition-colors ${
          isPendingTransfer ? 'cursor-pointer border-l-2 border-l-amber-500 bg-amber-500/[0.04]' : ''
        }`}
        onClick={handleRowClick}
      >
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 shrink-0 border border-border">
            <AvatarFallback className="text-xs font-black bg-muted/60">
              {athlete?.name?.slice(0, 2).toUpperCase() ?? '??'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {athlete ? (
              <Link
                href={`/dashboard/athletes/${athlete.id}`}
                className="block truncate text-[15px] font-bold hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                {athlete.name}
              </Link>
            ) : (
              <span className="text-[15px] font-bold text-muted-foreground">—</span>
            )}
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground/70">
              {payment.concept}
              {hasReceipt && <span className="ml-1.5 text-primary/80">📎</span>}
            </p>
          </div>
          <p className="shrink-0 text-[17px] font-black tracking-tight text-foreground">
            ${Number(payment.amount).toLocaleString('es-CL')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {statusChip}
          {payment.payment_method && (
            <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              {paymentMethodLabel(payment.payment_method)}
            </span>
          )}
          {isDuplicate && (
            <span className="rounded-full bg-amber-500/20 px-2 py-1 text-[11px] font-black text-amber-600 dark:text-amber-400">DUP</span>
          )}
          {plan && (
            <span className="max-w-[10rem] truncate rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              {plan.name}{plan.billing_cycle ? `/${BILLING_LABEL[plan.billing_cycle] ?? ''}` : ''}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground/70">
          <span>{payment.paid_at ? `Pagado ${fmtDate(payment.paid_at)}` : `Vence ${fmtDate(`${payment.due_date}T12:00:00`)}`}</span>
          {nextBillingDate ? <span>Próx. {fmtDate(`${nextBillingDate}T12:00:00`)}</span> : null}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </div>

      {/* ══ DESKTOP GRID ══ */}
      <div
        className={`hidden md:grid grid-cols-[minmax(200px,2fr)_110px_minmax(140px,1.5fr)_120px_110px_130px_120px] gap-4 items-center px-6 py-4 transition-colors ${
          isPendingTransfer
            ? 'cursor-pointer hover:bg-amber-500/5 border-l-2 border-l-amber-500/60'
            : 'hover:bg-muted/5'
        }`}
        onClick={handleRowClick}
      >
        {/* Athlete */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 shrink-0 border border-border">
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
            <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">{paymentMethodLabel(payment.payment_method)}</p>
          )}
        </div>

        {/* Plan */}
        <div className="min-w-0">
          {plan ? (
            <>
              <p className="text-sm font-bold text-foreground/80 truncate">{plan.name}</p>
              <p className="text-[10px] text-muted-foreground/60 font-medium">
                ${Number(payment.amount).toLocaleString('es-CL')}/{BILLING_LABEL[plan.billing_cycle ?? ''] ?? ''}
              </p>
            </>
          ) : (
            <span className="text-xs text-muted-foreground/40">—</span>
          )}
        </div>

        {/* Paid at */}
        <div>
          {payment.paid_at ? (
            <p className="text-sm text-muted-foreground font-medium">{fmtDate(payment.paid_at)}</p>
          ) : (
            <span className="text-sm text-muted-foreground/40">—</span>
          )}
        </div>

        {/* Next subscription payment */}
        <div>
          {nextBillingDate ? (
            <p className="text-sm text-muted-foreground font-medium">{fmtDate(`${nextBillingDate}T12:00:00`)}</p>
          ) : (
            <span className="text-sm text-muted-foreground/40">—</span>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
            <span className={`text-sm font-bold ${tone.text}`}>{tone.label}</span>
            {isDuplicate && <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">DUP</span>}
          </div>
          {overdueDays > 0 && (
            <p className="text-[10px] text-red-600 dark:text-red-400 font-bold pl-4">{overdueDays}d mora</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          {actions}
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
