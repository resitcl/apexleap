'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle2, Clock, AlertCircle, Users, ChevronRight } from 'lucide-react'
import type { MonthlyAthleteCollectionStatus } from '@/lib/actions/billing'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  overdue: 'Vencido',
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  webpay: 'Webpay',
  flow: 'Flow',
  mercadopago: 'MercadoPago',
  khipu: 'Khipu',
  other: 'Otro',
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`
}

function formatShortDate(value: string | null) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

type Tab = 'paid' | 'pending' | 'notBilled'

interface Props {
  data: MonthlyAthleteCollectionStatus
}

export function MonthlyCollectionPanel({ data }: Props) {
  const [tab, setTab] = useState<Tab>('pending')
  const progress = data.counts.expected > 0
    ? Math.round((data.counts.paid / data.counts.expected) * 100)
    : 0

  const tabs: { id: Tab; label: string; count: number; icon: typeof CheckCircle2; tone: string }[] = [
    { id: 'paid', label: 'Pagaron', count: data.counts.paid, icon: CheckCircle2, tone: 'text-emerald-500' },
    { id: 'pending', label: 'Pendientes', count: data.counts.pending, icon: Clock, tone: 'text-amber-500' },
    { id: 'notBilled', label: 'Sin cuota', count: data.counts.notBilled, icon: AlertCircle, tone: 'text-sky-500' },
  ]

  const rows = tab === 'paid' ? data.paid : tab === 'pending' ? data.pending : data.notBilled

  return (
    <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">
              Cobranza del mes — {data.monthLabel}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Vista por atleta: quién pagó la cuota de este mes, quién está pendiente y quién aún no tiene fila emitida.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-emerald-500/30 bg-emerald-500/5 text-emerald-600">
              {data.counts.paid}/{data.counts.expected || data.counts.activeSubscriptions} pagaron
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {progress}% del esperado
            </Badge>
            <Badge variant="outline" className="rounded-full">
              <Users className="w-3 h-3 mr-1 inline" />
              {data.counts.activeSubscriptions} suscripciones activas
            </Badge>
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`h-9 px-4 rounded-xl border text-sm font-bold transition-colors inline-flex items-center gap-2 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? '' : t.tone}`} />
                {t.label}
                <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-black ${
                  active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground/70">
            {tab === 'paid' && 'Nadie ha pagado la cuota de este mes todavía.'}
            {tab === 'pending' && 'No hay atletas con cuota pendiente o vencida este mes.'}
            {tab === 'notBilled' && 'Todos los atletas con cobro este mes ya tienen una fila emitida.'}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.04] overflow-hidden">
            {rows.map((row) => (
              <Link
                key={`${tab}-${row.athleteId}-${row.paymentId ?? row.nextBillingDate ?? ''}`}
                href={
                  row.paymentId
                    ? `/dashboard/payments?athleteId=${row.athleteId}`
                    : `/dashboard/athletes/${row.athleteId}`
                }
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {row.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{row.name}</p>
                  <p className="text-xs text-muted-foreground/70 truncate">
                    {row.planName ?? 'Sin plan'}
                    {tab === 'paid' && row.paidAt ? ` · Pagó ${formatShortDate(row.paidAt)}` : ''}
                    {tab === 'pending' && row.dueDate ? ` · Vence ${formatShortDate(row.dueDate)}` : ''}
                    {tab === 'notBilled' && row.nextBillingDate ? ` · Cobro esperado ${formatShortDate(row.nextBillingDate)}` : ''}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-foreground">{formatCurrency(row.amount)}</p>
                  {tab === 'paid' && row.paymentMethod && (
                    <p className="text-[10px] text-muted-foreground/60">{METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod}</p>
                  )}
                  {tab === 'pending' && row.status && (
                    <Badge
                      variant={row.status === 'overdue' ? 'destructive' : 'secondary'}
                      className="text-[10px] h-5"
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                  )}
                  {tab === 'notBilled' && (
                    <p className="text-[10px] text-sky-600 font-medium">Sin fila emitida</p>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
