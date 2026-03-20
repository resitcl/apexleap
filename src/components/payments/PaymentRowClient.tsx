'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EditPaymentButton } from './EditPaymentButton'
import { MarkAsPaidButton } from './MarkAsPaidButton'
import { ConfirmTransferButton } from './ConfirmTransferButton'
import { DeletePaymentButton } from './DeletePaymentButton'

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid:      { label: 'Pagado',    variant: 'default' },
  pending:   { label: 'Pendiente', variant: 'secondary' },
  overdue:   { label: 'Vencido',   variant: 'destructive' },
  failed:    { label: 'Fallido',   variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
}

const METHOD_STYLE: Record<string, string> = {
  cash: 'bg-green-100 text-green-700',
  transfer: 'bg-blue-100 text-blue-700',
  webpay: 'bg-purple-100 text-purple-700',
  flow: 'bg-indigo-100 text-indigo-700',
  mercadopago: 'bg-sky-100 text-sky-700',
  khipu: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-600',
}

const METHOD_LABEL: Record<string, string> = {
  cash: '💵 Efectivo', transfer: '🏦 Transfer.', webpay: '💳 Webpay',
  flow: '⚡ Flow', mercadopago: '🛒 MP', khipu: '🔗 Khipu', other: '📋 Otro',
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
  athletes: { id: string; name: string; photo_url: string | null } | null
  plans: { name: string; billing_cycle?: string } | null
}

interface Props {
  payment: Payment
  athleteDebt: number
  isDuplicate: boolean
}

export function PaymentRowClient({ payment, athleteDebt, isDuplicate }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const athlete = payment.athletes
  const cfg = STATUS_CONFIG[payment.status] ?? { label: payment.status, variant: 'outline' as const }
  const showDebt = athleteDebt > Number(payment.amount) && (payment.status === 'pending' || payment.status === 'overdue')

  const notes = payment.notes
  const hasReceipt = notes && /https?:\/\/[^\s]+/i.test(notes)
  const isTransfer = payment.payment_method === 'transfer' || (notes && notes.toLowerCase().includes('comprobante'))
  const isPendingTransfer = (payment.status === 'pending' || payment.status === 'overdue') && (isTransfer || hasReceipt)

  function handleRowClick() {
    if (isPendingTransfer && !confirmOpen) {
      setConfirmOpen(true)
    }
  }

  return (
    <>
      <Card 
        className={isPendingTransfer ? 'cursor-pointer hover:border-green-300 hover:bg-green-50/30 dark:hover:bg-green-500/5 transition-colors' : ''}
        onClick={handleRowClick}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="text-sm font-semibold">
                {athlete?.name?.slice(0, 2).toUpperCase() ?? '??'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {athlete && (
                  <Link
                    href={`/dashboard/athletes/${athlete.id}`}
                    className="font-semibold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {athlete.name}
                  </Link>
                )}
                {showDebt && (
                  <span className="text-xs text-red-600 font-medium">
                    (total: ${athleteDebt.toLocaleString('es-CL')})
                  </span>
                )}
                {isDuplicate && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-300 px-1.5 py-0.5 rounded font-medium shrink-0" title="Posible pago duplicado este mes">⚠ Duplicado</span>
                )}
                {payment.status === 'paid' && payment.paid_at && payment.due_date && payment.paid_at < payment.due_date && (
                  <span className="text-xs bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded font-medium shrink-0" title="Pagado antes del vencimiento">✓ Anticipado</span>
                )}
                {payment.status === 'paid' && (!payment.payment_method || payment.payment_method === 'cash' || payment.payment_method === 'transfer' || payment.payment_method === 'other') && (
                  <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-medium shrink-0" title="Registrado manualmente sin pasarela de pago">Manual</span>
                )}
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-sm text-muted-foreground truncate">{payment.concept}</span>
                {payment.plans && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">{payment.plans.name}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>Vence: {new Date(payment.due_date).toLocaleDateString('es-CL')}</span>
                {payment.status === 'overdue' && (() => {
                  const days = Math.floor((Date.now() - new Date(payment.due_date).getTime()) / 86400000)
                  if (days <= 0) return null
                  return (
                    <span className={`font-medium ${days > 30 ? 'text-red-600' : 'text-orange-500'}`}>
                      {days}d mora
                    </span>
                  )
                })()}
                {payment.paid_at && (
                  <span>Pagado: {new Date(payment.paid_at).toLocaleDateString('es-CL')}</span>
                )}
                {payment.payment_method && (
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${METHOD_STYLE[payment.payment_method] ?? 'bg-gray-100 text-gray-600'}`}>
                    {METHOD_LABEL[payment.payment_method] ?? payment.payment_method}
                  </span>
                )}
                {hasReceipt && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                    📎 Comprobante
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">
                  ${Number(payment.amount).toLocaleString('es-CL')}
                </span>
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
              </div>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
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
          </div>
        </CardContent>
      </Card>

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
