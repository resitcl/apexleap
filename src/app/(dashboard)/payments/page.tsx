export const dynamic = "force-dynamic"

import Link from "next/link"
import { Suspense } from "react"
import { getPayments, getPaymentSummary } from "@/lib/actions/payments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, DollarSign, Clock, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react"
import { PaymentsFilter } from "@/components/payments/PaymentsFilter"
import { MarkAsPaidButton } from "@/components/payments/MarkAsPaidButton"
import { ExportPaymentsButton } from "@/components/payments/ExportPaymentsButton"
import { BulkMarkAsPaidButton } from "@/components/payments/BulkMarkAsPaidButton"
import { DeletePaymentButton } from "@/components/payments/DeletePaymentButton"
import { EditPaymentButton } from "@/components/payments/EditPaymentButton"

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string; from?: string; to?: string; athleteId?: string; search?: string; athleteName?: string; amountMin?: string; amountMax?: string; paymentMethod?: string; paidFrom?: string; paidTo?: string; dueFrom?: string; dueTo?: string }>
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid:      { label: 'Pagado',    variant: 'default' },
  pending:   { label: 'Pendiente', variant: 'secondary' },
  overdue:   { label: 'Vencido',   variant: 'destructive' },
  failed:    { label: 'Fallido',   variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const from        = params.from        ?? ""
  const to          = params.to          ?? ""
  const athleteId   = params.athleteId   ?? ""
  const search      = params.search      ?? ""
  const athleteName = params.athleteName ?? ""
  const amountMin      = params.amountMin      ?? ""
  const amountMax      = params.amountMax      ?? ""
  const paymentMethod  = params.paymentMethod  ?? ""
  const paidFrom       = params.paidFrom       ?? ""
  const paidTo         = params.paidTo         ?? ""
  const dueFrom        = params.dueFrom        ?? ""
  const dueTo          = params.dueTo          ?? ""

  let payments: Awaited<ReturnType<typeof getPayments>>["payments"] = []
  let allPayments: Awaited<ReturnType<typeof getPayments>>["payments"] = []
  let total = 0
  let summary = { total_collected: 0, total_pending: 0, total_overdue: 0, count_overdue: 0 }
  let error: string | null = null

  try {
    const [result, allResult, summaryResult] = await Promise.all([
      getPayments({ status: params.status, page, limit: 25, from: from || undefined, to: to || undefined, athleteId: athleteId || undefined, search: search || undefined, athleteName: athleteName || undefined, amountMin: amountMin ? Number(amountMin) : undefined, amountMax: amountMax ? Number(amountMax) : undefined, paymentMethod: paymentMethod || undefined }),
      getPayments({ status: params.status, page: 1, limit: 1000, from: from || undefined, to: to || undefined, athleteId: athleteId || undefined, search: search || undefined, athleteName: athleteName || undefined, amountMin: amountMin ? Number(amountMin) : undefined, amountMax: amountMax ? Number(amountMax) : undefined, paymentMethod: paymentMethod || undefined }),
      getPaymentSummary(),
    ])
    let pList = result.payments
    let pAll  = allResult.payments
    if (paidFrom) {
      pList = pList.filter((p) => p.paid_at && p.paid_at >= paidFrom)
      pAll  = pAll.filter((p) => p.paid_at && p.paid_at >= paidFrom)
    }
    if (paidTo) {
      pList = pList.filter((p) => p.paid_at && p.paid_at.slice(0,10) <= paidTo)
      pAll  = pAll.filter((p) => p.paid_at && p.paid_at.slice(0,10) <= paidTo)
    }
    if (dueFrom) {
      pList = pList.filter((p) => p.due_date && p.due_date >= dueFrom)
      pAll  = pAll.filter((p) => p.due_date && p.due_date >= dueFrom)
    }
    if (dueTo) {
      pList = pList.filter((p) => p.due_date && p.due_date <= dueTo)
      pAll  = pAll.filter((p) => p.due_date && p.due_date <= dueTo)
    }
    payments = pList
    allPayments = pAll
    total = result.total
    summary = summaryResult
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error al cargar pagos'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pagos</h1>
          <p className="text-muted-foreground">
            {total} transacciones
            {allPayments.length > 0 && (() => {
              const paidTotal = allPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
              return paidTotal > 0 ? ` · $${paidTotal.toLocaleString('es-CL')} cobrado` : null
            })()}
            {allPayments.length > 0 && (() => {
              const curMonth = new Date().toISOString().slice(0, 7)
              const monthTotal = allPayments
                .filter((p) => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 7) === curMonth)
                .reduce((s, p) => s + Number(p.amount), 0)
              return monthTotal > 0 ? (
                <span className="ml-2 text-green-600 font-medium">· ${monthTotal.toLocaleString('es-CL')} este mes</span>
              ) : null
            })()}
            {allPayments.length > 0 && (() => {
              const paid = allPayments.filter((p) => p.status === 'paid')
              const uniqueAthletes = new Set(paid.map((p) => (p.athletes as { id?: string } | null)?.id ?? p.athlete_id).filter(Boolean)).size
              if (uniqueAthletes < 2) return null
              const avg = Math.round(paid.reduce((s, p) => s + Number(p.amount), 0) / uniqueAthletes)
              return <span className="ml-2 text-muted-foreground/70">· prom. ${avg.toLocaleString('es-CL')}/atleta</span>
            })()}
            {allPayments.length > 1 && (() => {
              const paid = allPayments.filter((p) => p.status === 'paid')
              if (paid.length < 2) return null
              const avgPerPayment = Math.round(paid.reduce((s, p) => s + Number(p.amount), 0) / paid.length)
              return <span className="ml-2 text-muted-foreground/70">· prom. ${avgPerPayment.toLocaleString('es-CL')}/pago</span>
            })()}
            {allPayments.length > 0 && (() => {
              const curMonth  = new Date().toISOString().slice(0, 7)
              const prevDate  = new Date(); prevDate.setMonth(prevDate.getMonth() - 1)
              const prevMonth = prevDate.toISOString().slice(0, 7)
              const cur  = allPayments.filter((p) => p.status === 'paid' && p.paid_at?.startsWith(curMonth)).reduce((s, p) => s + Number(p.amount), 0)
              const prev = allPayments.filter((p) => p.status === 'paid' && p.paid_at?.startsWith(prevMonth)).reduce((s, p) => s + Number(p.amount), 0)
              if (prev === 0 || cur >= prev) return null
              const drop = Math.round(((prev - cur) / prev) * 100)
              return <span className="ml-2 text-red-500 font-medium">· ▼{drop}% vs mes anterior</span>
            })()}
            {allPayments.length > 0 && (() => {
              const METHOD_LABELS: Record<string, string> = { cash: 'Efectivo', transfer: 'Transfer.', card: 'Tarjeta', webpay: 'Webpay', mercadopago: 'MP', flow: 'Flow' }
              const totals: Record<string, number> = {}
              for (const p of allPayments.filter((p) => p.status === 'paid' && p.payment_method)) {
                totals[p.payment_method!] = (totals[p.payment_method!] ?? 0) + Number(p.amount)
              }
              const sorted = Object.entries(totals).sort(([,a],[,b]) => b - a).slice(0, 2)
              if (sorted.length === 0) return null
              return (
                <span className="ml-2 text-muted-foreground/70">
                  · {sorted.map(([m, amt]) => `${METHOD_LABELS[m] ?? m}: $${amt.toLocaleString('es-CL')}`).join(' · ')}
                </span>
              )
            })()}
            {allPayments.length > 0 && (() => {
              type P = typeof allPayments[number]
              const key = (p: P) => {
                const id = (p.athletes as { id?: string } | null)?.id ?? p.athlete_id ?? ''
                const mo = p.due_date ? p.due_date.slice(0, 7) : p.created_at?.slice(0, 7) ?? ''
                return `${id}::${mo}`
              }
              const seen: Record<string, number> = {}
              for (const p of allPayments) {
                const k = key(p)
                seen[k] = (seen[k] ?? 0) + 1
              }
              const dupCount = Object.values(seen).filter((c) => c > 1).length
              return dupCount > 0 ? (
                <span className="ml-2 text-orange-600 font-medium">· ⚠ {dupCount} posible{dupCount !== 1 ? 's' : ''} duplicado{dupCount !== 1 ? 's' : ''}</span>
              ) : null
            })()}
            {allPayments.length > 0 && (() => {
              const curMonth = new Date().toISOString().slice(0, 7)
              const failedCount = allPayments.filter((p) =>
                p.status === 'failed' && (p.created_at ?? '').startsWith(curMonth)
              ).length
              if (failedCount === 0) return null
              return <span className="ml-2 text-red-600 font-medium">· {failedCount} fallido{failedCount !== 1 ? 's' : ''} este mes</span>
            })()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {payments.filter(p => p.status === 'pending' || p.status === 'overdue').length > 1 && (
            <BulkMarkAsPaidButton
              ids={payments.filter(p => p.status === 'pending' || p.status === 'overdue').map(p => p.id)}
            />
          )}
          <ExportPaymentsButton
            payments={allPayments.map((p) => ({
              ...p,
              athletes: p.athletes as { name: string } | null,
              plans: p.plans as { name: string } | null,
            }))}
            filename={`pagos${params.status ? `-${params.status}` : ''}${search ? `-${search}` : ''}`}
          />
          <Link href="/dashboard/payments/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Registrar Pago
            </Button>
          </Link>
        </div>
      </div>

      {/* Athlete filter banner */}
      {athleteId && (
        <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/20 text-sm">
          <span className="text-primary font-medium">Filtrando pagos por atleta</span>
          <Link href="/dashboard/payments" className="ml-auto text-xs text-muted-foreground hover:text-foreground underline">
            Ver todos
          </Link>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recaudado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.total_collected.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">Total pagos confirmados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${summary.total_pending.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${summary.total_overdue.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">{summary.count_overdue} cuotas morosas</p>
          </CardContent>
        </Card>
        {(summary.total_collected + summary.total_pending + summary.total_overdue) > 0 && (() => {
          const total = summary.total_collected + summary.total_pending + summary.total_overdue
          const pct = Math.round((summary.total_collected / total) * 100)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">% Cobrado</CardTitle>
                <TrendingUp className="h-4 w-4 text-teal-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">${summary.total_collected.toLocaleString('es-CL')} / ${total.toLocaleString('es-CL')}</p>
              </CardContent>
            </Card>
          )
        })()}
        {allPayments.length > 0 && (() => {
          const paidThisMonth = allPayments.filter((p) => p.status === 'paid' && p.paid_at && p.paid_at.startsWith(new Date().toISOString().slice(0, 7)))
          if (paidThisMonth.length === 0) return null
          const avg = Math.round(paidThisMonth.reduce((s, p) => s + Number(p.amount), 0) / paidThisMonth.length)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pago Promedio</CardTitle>
                <DollarSign className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">${avg.toLocaleString('es-CL')}</div>
                <p className="text-xs text-muted-foreground">{paidThisMonth.length} pagos cobrados este mes</p>
              </CardContent>
            </Card>
          )
        })()}
        {allPayments.length > 0 && (() => {
          const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
          const thirtyISO = thirtyAgo.toISOString().split('T')[0]
          const old = allPayments.filter((p) => p.status === 'overdue' && p.due_date && p.due_date < thirtyISO)
          if (old.length === 0) return null
          const oldAmt = old.reduce((s, p) => s + Number(p.amount), 0)
          return (
            <Card className="border-red-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos +30d</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{old.length}</div>
                <p className="text-xs text-muted-foreground">${oldAmt.toLocaleString('es-CL')} en mora crítica</p>
              </CardContent>
            </Card>
          )
        })()}
        {allPayments.length > 0 && (() => {
          const paid  = allPayments.filter((p) => p.status === 'paid').length
          const total = allPayments.filter((p) => ['paid','pending','overdue'].includes(p.status)).length
          if (total === 0) return null
          const rate = Math.round((paid / total) * 100)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Cobro</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{rate}%</div>
                <p className="text-xs text-muted-foreground">{paid} de {total} pagados</p>
              </CardContent>
            </Card>
          )
        })()}
        {allPayments.length > 0 && (() => {
          const todayStr = new Date().toISOString().split('T')[0]
          const todayPaid = allPayments.filter((p) => p.status === 'paid' && p.paid_at?.startsWith(todayStr))
          if (todayPaid.length === 0) return null
          const todayAmt = todayPaid.reduce((s, p) => s + Number(p.amount), 0)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado Hoy</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{todayPaid.length}</div>
                <p className="text-xs text-muted-foreground">${todayAmt.toLocaleString('es-CL')} en {todayPaid.length} pago{todayPaid.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Top morosos */}
      {allPayments.length > 0 && (() => {
        const debtMap: Record<string, { name: string; id: string; debt: number }> = {}
        for (const p of allPayments.filter((p) => p.status === 'overdue')) {
          const ath = p.athletes as { id: string; name: string } | null
          if (!ath) continue
          if (!debtMap[ath.id]) debtMap[ath.id] = { id: ath.id, name: ath.name, debt: 0 }
          debtMap[ath.id].debt += Number(p.amount)
        }
        const top = Object.values(debtMap).sort((a, b) => b.debt - a.debt).slice(0, 3)
        if (top.length === 0) return null
        return (
          <Card className="border-red-100 bg-red-50/40">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 mb-1">Top morosos</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {top.map((d) => (
                      <span key={d.id} className="text-xs text-red-700">
                        {d.name}: <span className="font-bold">${d.debt.toLocaleString('es-CL')}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Top pagadores */}
      {allPayments.length > 5 && (() => {
        const paidMap: Record<string, { name: string; id: string; total: number }> = {}
        for (const p of allPayments.filter((p) => p.status === 'paid')) {
          const ath = p.athletes as { id: string; name: string } | null
          if (!ath) continue
          if (!paidMap[ath.id]) paidMap[ath.id] = { id: ath.id, name: ath.name, total: 0 }
          paidMap[ath.id].total += Number(p.amount)
        }
        const top = Object.values(paidMap).sort((a, b) => b.total - a.total).slice(0, 3)
        if (top.length === 0) return null
        return (
          <Card className="border-green-100 bg-green-50/40">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800 mb-1">Top pagadores (acumulado)</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {top.map((d) => (
                      <span key={d.id} className="text-xs text-green-700">
                        {d.name}: <span className="font-bold">${d.total.toLocaleString('es-CL')}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* 60d overdue alert */}
      {allPayments.length > 0 && (() => {
        const sixtyAgo = new Date(); sixtyAgo.setDate(sixtyAgo.getDate() - 60)
        const sixtyISO = sixtyAgo.toISOString().split('T')[0]
        const critical = allPayments.filter((p) => p.status === 'overdue' && p.due_date && p.due_date < sixtyISO)
        if (critical.length === 0) return null
        const amt = critical.reduce((s, p) => s + Number(p.amount), 0)
        return (
          <Link href="/dashboard/payments?status=overdue">
            <Card className="border-red-300 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
              <CardContent className="py-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
                <p className="text-sm text-red-900 font-medium">
                  {critical.length} pago{critical.length !== 1 ? 's' : ''} con mora crítica (+60 días) · ${amt.toLocaleString('es-CL')}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {/* Pending by month */}
      {allPayments.length > 0 && (() => {
        const pending = allPayments.filter((p) => p.status === 'pending' || p.status === 'overdue')
        if (pending.length === 0) return null
        const byMonth = pending.reduce<Record<string, number>>((acc, p) => {
          const month = (p.due_date ?? p.created_at ?? '').slice(0, 7)
          if (!month) return acc
          acc[month] = (acc[month] ?? 0) + Number(p.amount)
          return acc
        }, {})
        const entries = Object.entries(byMonth).sort(([a],[b]) => a.localeCompare(b)).slice(0, 4)
        if (entries.length === 0) return null
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium">Pendiente por mes:</span>
            {entries.map(([month, amount]) => (
              <span key={month} className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                {new Date(month + '-02').toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })}: ${amount.toLocaleString('es-CL')}
              </span>
            ))}
          </div>
        )
      })()}

      {/* Method breakdown */}
      {allPayments.length > 0 && (() => {
        const METHOD_LABEL: Record<string, string> = {
          cash: 'Efectivo', transfer: 'Transfer.', webpay: 'Webpay',
          flow: 'Flow', mercadopago: 'MercadoPago', khipu: 'Khipu', other: 'Otro',
        }
        const METHOD_STYLE: Record<string, string> = {
          cash: 'bg-green-100 text-green-700', transfer: 'bg-blue-100 text-blue-700',
          webpay: 'bg-purple-100 text-purple-700', flow: 'bg-indigo-100 text-indigo-700',
          mercadopago: 'bg-sky-100 text-sky-700', khipu: 'bg-teal-100 text-teal-700', other: 'bg-gray-100 text-gray-600',
        }
        const byMethod = allPayments
          .filter(p => p.status === 'paid' && p.payment_method)
          .reduce<Record<string, number>>((acc, p) => {
            const m = p.payment_method!
            acc[m] = (acc[m] ?? 0) + Number(p.amount)
            return acc
          }, {})
        const entries = Object.entries(byMethod).sort(([,a],[,b]) => b - a)
        if (entries.length === 0) return null
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium">Cobrado por método:</span>
            {entries.map(([method, amount]) => (
              <span key={method} className={`px-2 py-0.5 rounded text-xs font-medium ${METHOD_STYLE[method] ?? 'bg-gray-100 text-gray-600'}`}>
                {METHOD_LABEL[method] ?? method}: ${amount.toLocaleString('es-CL')}
              </span>
            ))}
          </div>
        )
      })()}

      {/* Day-of-week heatmap */}
      {allPayments.length > 0 && (() => {
        const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const paid = allPayments.filter((p) => p.status === 'paid' && p.paid_at)
        if (paid.length === 0) return null
        const byDay = Array(7).fill(0) as number[]
        for (const p of paid) { byDay[new Date(p.paid_at!).getDay()]++ }
        const maxDay = Math.max(...byDay, 1)
        return (
          <div className="flex flex-wrap gap-3 items-end">
            <span className="text-xs text-muted-foreground font-medium self-center">Pagos por día:</span>
            {byDay.map((count, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{count > 0 ? count : ''}</span>
                <div
                  className="w-8 rounded-sm transition-all"
                  style={{
                    height: `${Math.max(4, Math.round((count / maxDay) * 40))}px`,
                    backgroundColor: count === 0 ? 'hsl(var(--muted))' :
                      count >= maxDay * 0.8 ? 'hsl(142 76% 36%)' :
                      count >= maxDay * 0.5 ? 'hsl(142 76% 50%)' : 'hsl(142 76% 70%)',
                  }}
                />
                <span className="text-xs text-muted-foreground">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Duplicate payments alert */}
      {allPayments.length > 0 && (() => {
        type P = typeof allPayments[number] & { athletes?: { name: string } | null }
        const key = (p: P) => {
          const athId = (p.athletes as { id?: string } | null)?.id ?? p.athlete_id ?? ''
          const month = p.due_date ? p.due_date.slice(0, 7) : p.created_at?.slice(0, 7) ?? ''
          return `${athId}::${month}`
        }
        const seen: Record<string, P[]> = {}
        for (const p of allPayments as P[]) {
          const k = key(p)
          if (!seen[k]) seen[k] = []
          seen[k].push(p)
        }
        const dupes = Object.values(seen).filter((arr) => arr.length > 1)
        if (dupes.length === 0) return null
        const athletes = [...new Set(dupes.map((arr) => (arr[0].athletes as { name?: string } | null)?.name ?? 'Atleta'))]
        return (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-orange-200 bg-orange-50">
            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">
              <span className="font-medium">Posibles pagos duplicados:</span>{' '}
              {dupes.length} combinación{dupes.length !== 1 ? 'es' : ''} con más de 1 pago en el mismo mes
              {athletes.length <= 3 && ` (${athletes.join(', ')})`}
            </p>
          </div>
        )
      })()}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Suspense fallback={null}>
          <PaymentsFilter currentStatus={params.status} currentMethod={paymentMethod || undefined} currentFrom={params.from} currentTo={params.to} currentDueFrom={dueFrom || undefined} currentDueTo={dueTo || undefined} />
        </Suspense>
        <form method="get" action="/dashboard/payments" className="flex flex-wrap items-end gap-2">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Buscar alumno</label>
            <input type="text" name="athleteName" defaultValue={athleteName}
              placeholder="Nombre de alumno..."
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-44" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Buscar concepto</label>
            <input type="text" name="search" defaultValue={search}
              placeholder="Ej: mensualidad..."
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-44" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Venc. desde</label>
            <input type="date" name="from" defaultValue={from}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Venc. hasta</label>
            <input type="date" name="to" defaultValue={to}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Monto mín.</label>
            <input type="number" name="amountMin" defaultValue={amountMin} min={0} placeholder="0"
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-28" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Monto máx.</label>
            <input type="number" name="amountMax" defaultValue={amountMax} min={0} placeholder="∞"
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-28" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Pagado desde</label>
            <input type="date" name="paidFrom" defaultValue={paidFrom}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Pagado hasta</label>
            <input type="date" name="paidTo" defaultValue={paidTo}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Método</label>
            <select name="paymentMethod" defaultValue={paymentMethod}
              className="h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Todos</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="webpay">Webpay</option>
              <option value="flow">Flow</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="khipu">Khipu</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <button type="submit"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Filtrar
          </button>
          {(from || to || search || athleteName || amountMin || amountMax || paymentMethod || paidFrom || paidTo) && (
            <Link href={`/dashboard/payments${params.status ? `?status=${params.status}` : ''}`}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors flex items-center">
              ✕ Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* Payments List */}
      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-lg mb-1">Sin pagos registrados</h3>
            <p className="text-muted-foreground mb-4">Registra el primer cobro del club</p>
            <Link href="/dashboard/payments/new">
              <Button>Registrar Pago</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(() => {
            const debtByAthlete: Record<string, number> = {}
            for (const p of allPayments) {
              if (p.status === 'pending' || p.status === 'overdue') {
                const id = (p.athletes as { id: string } | null)?.id ?? p.athlete_id ?? ''
                if (id) debtByAthlete[id] = (debtByAthlete[id] ?? 0) + Number(p.amount)
              }
            }
            const dupKeys = new Set<string>()
            const keyCounts: Record<string, number> = {}
            for (const p of allPayments) {
              const athleteId = (p.athletes as { id: string } | null)?.id ?? p.athlete_id ?? ''
              const month = p.due_date?.slice(0, 7) ?? ''
              const key = `${athleteId}|${month}`
              keyCounts[key] = (keyCounts[key] ?? 0) + 1
              if (keyCounts[key] > 1) dupKeys.add(key)
            }
            return payments.map((payment) => {
            const athlete = payment.athletes as { id: string; name: string; photo_url: string | null } | null
            const cfg = STATUS_CONFIG[payment.status] ?? { label: payment.status, variant: 'outline' as const }
            const athleteDebt = athlete ? (debtByAthlete[athlete.id] ?? 0) : 0
            const showDebt = athleteDebt > Number(payment.amount) && (payment.status === 'pending' || payment.status === 'overdue')
            const isDuplicate = dupKeys.has(`${athlete?.id ?? payment.athlete_id ?? ''}|${payment.due_date?.slice(0, 7) ?? ''}`)

            return (
              <Card key={payment.id}>
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
                        {(() => {
                          const plan = (payment as { plans?: { name: string } | null }).plans
                          return plan ? (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">{plan.name}</span>
                          ) : null
                        })()}
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
                        {payment.payment_method && (() => {
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
                          const style = METHOD_STYLE[payment.payment_method] ?? 'bg-gray-100 text-gray-600'
                          const label = METHOD_LABEL[payment.payment_method] ?? payment.payment_method
                          return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${style}`}>{label}</span>
                        })()}
                        {(payment as { notes?: string | null }).notes && (
                          <span className="italic truncate max-w-[200px]" title={(payment as { notes?: string | null }).notes ?? ''}>
                            📝 {(payment as { notes?: string | null }).notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-lg">
                        ${Number(payment.amount).toLocaleString('es-CL')}
                      </span>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <EditPaymentButton payment={payment} />
                      {payment.status === 'pending' || payment.status === 'overdue' ? (
                        <MarkAsPaidButton paymentId={payment.id} />
                      ) : null}
                      <DeletePaymentButton paymentId={payment.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
          })()}
        </div>
      )}

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} de {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/dashboard/payments?${new URLSearchParams({
                ...(params.status     ? { status:     params.status }     : {}),
                ...(search            ? { search }                        : {}),
                ...(athleteName       ? { athleteName }                   : {}),
                ...(from              ? { from }                          : {}),
                ...(to                ? { to }                            : {}),
                ...(amountMin         ? { amountMin }                     : {}),
                ...(amountMax         ? { amountMax }                     : {}),
                ...(paymentMethod     ? { paymentMethod }                 : {}),
                page: String(page - 1),
              }).toString()}`}>
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">← Anterior</button>
              </Link>
            )}
            {page * 25 < total && (
              <Link href={`/dashboard/payments?${new URLSearchParams({
                ...(params.status     ? { status:     params.status }     : {}),
                ...(search            ? { search }                        : {}),
                ...(athleteName       ? { athleteName }                   : {}),
                ...(from              ? { from }                          : {}),
                ...(to                ? { to }                            : {}),
                ...(amountMin         ? { amountMin }                     : {}),
                ...(amountMax         ? { amountMax }                     : {}),
                ...(paymentMethod     ? { paymentMethod }                 : {}),
                page: String(page + 1),
              }).toString()}`}>
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">Siguiente →</button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
