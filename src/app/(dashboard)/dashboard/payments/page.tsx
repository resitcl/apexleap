export const dynamic = "force-dynamic"

import Link from "next/link"
import { Suspense } from "react"
import { getPayments, getPaymentSummary } from "@/lib/actions/payments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, DollarSign, Clock, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react"
import { InfoTooltip } from "@/components/ui/info-tooltip"
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Pagos</h1>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2">
            <span>{total} transacciones</span>
            {summary.total_collected > 0 && <span className="text-green-600 font-medium">· ${summary.total_collected.toLocaleString('es-CL')} cobrado</span>}
            {summary.total_pending > 0 && <span className="text-yellow-600 font-medium">· ${summary.total_pending.toLocaleString('es-CL')} pendiente</span>}
            {summary.total_overdue > 0 && <span className="text-red-600 font-medium">· ${summary.total_overdue.toLocaleString('es-CL')} vencido</span>}
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
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recaudado</CardTitle>
              <InfoTooltip text="Total cobrado en el período seleccionado. Solo incluye pagos con estado 'pagado'." />
            </div>
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
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
              <InfoTooltip text="Pagos emitidos que aún no han vencido ni sido cobrados. Están dentro del plazo acordado." />
            </div>
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
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle>
              <InfoTooltip text="Monto total con fecha de vencimiento superada y sin pagar. Requiere gestión de cobro activa." />
            </div>
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
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">% Cobrado</CardTitle>
                  <InfoTooltip text="Porcentaje del total cobrado sobre el total emitido (cobrado + pendiente + vencido)." />
                </div>
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
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pago Promedio</CardTitle>
                  <InfoTooltip text="Monto promedio de los pagos cobrados en el período. Útil para detectar variaciones en precios de planes." />
                </div>
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
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Vencidos +30d</CardTitle>
                  <InfoTooltip text="Pagos vencidos hace más de 30 días. Casos de difícil recuperación que requieren atención urgente." />
                </div>
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
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Cobro</CardTitle>
                  <InfoTooltip text="Velocidad de cobro: promedio de días entre la emisión y el pago efectivo. Menor es mejor." />
                </div>
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
          const recovered = allPayments.filter((p) =>
            p.status === 'paid' && p.paid_at && p.due_date && p.paid_at.split('T')[0] > p.due_date
          ).length
          const totalDue = allPayments.filter((p) =>
            (p.status === 'paid' && p.due_date) || p.status === 'overdue'
          ).length
          if (totalDue < 3 || recovered === 0) return null
          const rate = Math.round((recovered / totalDue) * 100)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tasa Recuperación</CardTitle>
                  <InfoTooltip text="% de pagos que estaban vencidos y fueron cobrados eventualmente. Indica efectividad en cobranza de mora." />
                </div>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${rate >= 50 ? 'text-purple-600' : 'text-orange-600'}`}>{rate}%</div>
                <p className="text-xs text-muted-foreground">{recovered} mora{recovered !== 1 ? 's' : ''} recuperada{recovered !== 1 ? 's' : ''}</p>
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
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Cobrado Hoy</CardTitle>
                  <InfoTooltip text="Suma de pagos marcados como cobrados en el día de hoy." />
                </div>
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

      {/* ── Alertas de cobranza ── */}
      {allPayments.length > 0 && (() => {
        const todayISO = new Date().toISOString().split('T')[0]
        const sixtyAgo = new Date(); sixtyAgo.setDate(sixtyAgo.getDate() - 60)
        const sixtyISO = sixtyAgo.toISOString().split('T')[0]

        const debtMap: Record<string, { name: string; id: string; debt: number }> = {}
        for (const p of allPayments.filter((p) => p.status === 'overdue')) {
          const ath = p.athletes as { id: string; name: string } | null
          if (!ath) continue
          if (!debtMap[ath.id]) debtMap[ath.id] = { id: ath.id, name: ath.name, debt: 0 }
          debtMap[ath.id].debt += Number(p.amount)
        }
        const topDebtors = Object.values(debtMap).sort((a, b) => b.debt - a.debt).slice(0, 5)

        const critical    = allPayments.filter((p) => p.status === 'overdue' && p.due_date && p.due_date < sixtyISO)
        const criticalAmt = critical.reduce((s, p) => s + Number(p.amount), 0)

        const stale    = allPayments.filter((p) => p.status === 'pending' && p.due_date && p.due_date < todayISO)
        const staleAmt = stale.reduce((s, p) => s + Number(p.amount), 0)

        const overdueExceedsCollected = summary.total_overdue > summary.total_collected && summary.total_collected > 0
        const ovExcPct = overdueExceedsCollected ? Math.round((summary.total_overdue / summary.total_collected) * 100) : 0

        type P = typeof allPayments[number]
        const seenDupe: Record<string, P[]> = {}
        for (const p of allPayments) {
          const athId = (p.athletes as { id?: string } | null)?.id ?? p.athlete_id ?? ''
          const month = p.due_date ? p.due_date.slice(0, 7) : p.created_at?.slice(0, 7) ?? ''
          const k = `${athId}::${month}`
          if (!seenDupe[k]) seenDupe[k] = []
          seenDupe[k].push(p)
        }
        const dupes     = Object.values(seenDupe).filter((arr) => arr.length > 1)
        const dupeNames = [...new Set(dupes.map((arr) => (arr[0].athletes as { name?: string } | null)?.name ?? ''))].filter(Boolean)

        const rows = [
          topDebtors.length > 0,
          critical.length > 0,
          stale.length > 0,
          overdueExceedsCollected,
          dupes.length > 0,
        ]
        if (!rows.some(Boolean)) return null

        return (
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <CardTitle className="text-sm font-semibold">Alertas de cobranza</CardTitle>
                <span className="ml-auto text-xs text-muted-foreground">{rows.filter(Boolean).length} alerta{rows.filter(Boolean).length !== 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pt-1 pb-2">
              <div className="divide-y divide-border">

                {topDebtors.length > 0 && (
                  <div className="py-3 flex items-start gap-3">
                    <div className="w-0.5 self-stretch rounded-full bg-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top morosos</p>
                      <div className="flex flex-wrap gap-x-5 gap-y-1">
                        {topDebtors.map((d) => (
                          <Link
                            key={d.id}
                            href={`/dashboard/payments?status=overdue&athleteId=${d.id}&athleteName=${encodeURIComponent(d.name)}`}
                            className="text-sm hover:underline"
                          >
                            {d.name} <span className="font-semibold text-red-600">${d.debt.toLocaleString('es-CL')}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <Link href="/dashboard/payments?status=overdue" className="text-xs text-primary hover:underline shrink-0 pt-0.5">
                      Ver todos →
                    </Link>
                  </div>
                )}

                {critical.length > 0 && (
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-0.5 h-10 rounded-full bg-red-700 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {critical.length} pago{critical.length !== 1 ? 's' : ''} con mora crítica
                        <span className="text-muted-foreground font-normal"> · +60 días sin cobrar</span>
                      </p>
                      <p className="text-xs text-muted-foreground">${criticalAmt.toLocaleString('es-CL')} en riesgo de incobrabilidad</p>
                    </div>
                    <Link href="/dashboard/payments?status=overdue" className="text-xs text-primary hover:underline shrink-0">Ver →</Link>
                  </div>
                )}

                {stale.length > 0 && (
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-0.5 h-10 rounded-full bg-orange-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {stale.length} pago{stale.length !== 1 ? 's' : ''} pendiente{stale.length !== 1 ? 's' : ''} con fecha vencida
                      </p>
                      <p className="text-xs text-muted-foreground">${staleAmt.toLocaleString('es-CL')} · Considerar marcar como vencidos</p>
                    </div>
                    <Link href="/dashboard/payments?status=pending" className="text-xs text-primary hover:underline shrink-0">Ver →</Link>
                  </div>
                )}

                {overdueExceedsCollected && (
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-0.5 h-10 rounded-full bg-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">La deuda vencida supera lo cobrado este mes</p>
                      <p className="text-xs text-muted-foreground">
                        ${summary.total_overdue.toLocaleString('es-CL')} vencido vs ${summary.total_collected.toLocaleString('es-CL')} cobrado ({ovExcPct}%)
                      </p>
                    </div>
                  </div>
                )}

                {dupes.length > 0 && (
                  <div className="py-3 flex items-center gap-3">
                    <div className="w-0.5 h-10 rounded-full bg-slate-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {dupes.length} posible{dupes.length !== 1 ? 's' : ''} pago{dupes.length !== 1 ? 's' : ''} duplicado{dupes.length !== 1 ? 's' : ''}
                      </p>
                      {dupeNames.length > 0 && dupeNames.length <= 3 && (
                        <p className="text-xs text-muted-foreground">{dupeNames.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* ── Distribución ── */}
      {allPayments.length > 0 && (() => {
        const METHOD_LABEL: Record<string, string> = {
          cash: 'Efectivo', transfer: 'Transferencia', webpay: 'Webpay',
          flow: 'Flow', mercadopago: 'MercadoPago', khipu: 'Khipu', other: 'Otro',
        }
        const METHOD_STYLE: Record<string, string> = {
          cash: 'bg-green-100 text-green-700', transfer: 'bg-blue-100 text-blue-700',
          webpay: 'bg-purple-100 text-purple-700', flow: 'bg-indigo-100 text-indigo-700',
          mercadopago: 'bg-sky-100 text-sky-700', khipu: 'bg-teal-100 text-teal-700', other: 'bg-gray-100 text-gray-600',
        }
        const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

        const pending = allPayments.filter((p) => p.status === 'pending' || p.status === 'overdue')
        const byMonth = pending.reduce<Record<string, number>>((acc, p) => {
          const month = (p.due_date ?? p.created_at ?? '').slice(0, 7)
          if (!month) return acc
          acc[month] = (acc[month] ?? 0) + Number(p.amount)
          return acc
        }, {})
        const monthEntries = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(0, 4)

        const byMethod = allPayments
          .filter((p) => p.status === 'paid' && p.payment_method)
          .reduce<Record<string, number>>((acc, p) => {
            const m = p.payment_method!
            acc[m] = (acc[m] ?? 0) + Number(p.amount)
            return acc
          }, {})
        const methodEntries = Object.entries(byMethod).sort(([, a], [, b]) => b - a)

        const paidWithDate = allPayments.filter((p) => p.status === 'paid' && p.paid_at)
        const byDay = Array(7).fill(0) as number[]
        for (const p of paidWithDate) { byDay[new Date(p.paid_at!).getDay()]++ }
        const maxDay = Math.max(...byDay, 1)

        if (monthEntries.length === 0 && methodEntries.length === 0) return null

        return (
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Distribución</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pt-3 pb-4 space-y-4">
              {monthEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-32 shrink-0">Pendiente por mes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {monthEntries.map(([month, amount]) => (
                      <span key={month} className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        {new Date(month + '-02').toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })}: ${amount.toLocaleString('es-CL')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {methodEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-32 shrink-0">Cobrado por método</span>
                  <div className="flex flex-wrap gap-1.5">
                    {methodEntries.map(([method, amount]) => (
                      <span key={method} className={`px-2 py-0.5 rounded text-xs font-medium ${METHOD_STYLE[method] ?? 'bg-gray-100 text-gray-600'}`}>
                        {METHOD_LABEL[method] ?? method}: ${amount.toLocaleString('es-CL')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {paidWithDate.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-32 shrink-0 self-end mb-1">Pagos por día</span>
                  <div className="flex gap-2 items-end">
                    {byDay.map((count, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground leading-none">{count > 0 ? count : ''}</span>
                        <div
                          className="w-7 rounded-sm"
                          style={{
                            height: `${Math.max(4, Math.round((count / maxDay) * 36))}px`,
                            backgroundColor: count === 0 ? 'hsl(var(--muted))' :
                              count >= maxDay * 0.8 ? 'hsl(142 76% 36%)' :
                              count >= maxDay * 0.5 ? 'hsl(142 76% 50%)' : 'hsl(142 76% 70%)',
                          }}
                        />
                        <span className="text-xs text-muted-foreground">{DAYS[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })()}

      {/* Gráfico pagos por mes */}
      {allPayments.length > 0 && (() => {
        const now = new Date()
        const months: { key: string; label: string }[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          const label = d.toLocaleDateString('es-CL', { month: 'short' })
          months.push({ key, label })
        }
        const byMonth = months.map(({ key, label }) => {
          const paid   = allPayments.filter((p) => p.status === 'paid'    && p.paid_at?.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0)
          const overdue = allPayments.filter((p) => p.status === 'overdue' && (p.due_date ?? '').startsWith(key)).reduce((s, p) => s + Number(p.amount), 0)
          return { key, label, paid, overdue }
        })
        const maxVal = Math.max(...byMonth.map((m) => m.paid + m.overdue), 1)
        if (byMonth.every((m) => m.paid === 0 && m.overdue === 0)) return null
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cobrado vs Vencido por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-24">
                {byMonth.map((m, i) => {
                  const paidH  = Math.max(m.paid   > 0 ? Math.round((m.paid   / maxVal) * 88) : 0, m.paid   > 0 ? 4 : 0)
                  const overdH = Math.max(m.overdue > 0 ? Math.round((m.overdue / maxVal) * 88) : 0, m.overdue > 0 ? 4 : 0)
                  const isCur = i === 5
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex flex-col-reverse w-full gap-px items-center">
                        {paidH  > 0 && <div className={`w-full rounded-t-sm ${isCur ? 'bg-green-500' : 'bg-green-400/60'}`} style={{ height: paidH }} />}
                        {overdH > 0 && <div className="w-full bg-red-400/60 rounded-sm" style={{ height: overdH }} />}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />Cobrado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400/60 inline-block" />Vencido</span>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Filters */}
      <Suspense fallback={null}>
        <PaymentsFilter
          currentStatus={params.status}
          currentMethod={paymentMethod || undefined}
          currentFrom={from || undefined}
          currentTo={to || undefined}
          currentPaidFrom={paidFrom || undefined}
          currentPaidTo={paidTo || undefined}
          currentSearch={search || undefined}
          currentAthleteName={athleteName || undefined}
          currentAmountMin={amountMin || undefined}
          currentAmountMax={amountMax || undefined}
        />
      </Suspense>

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

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          ${Number(payment.amount).toLocaleString('es-CL')}
                        </span>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <EditPaymentButton payment={payment} />
                        {payment.status === 'pending' || payment.status === 'overdue' ? (
                          <MarkAsPaidButton paymentId={payment.id} />
                        ) : null}
                        <DeletePaymentButton paymentId={payment.id} />
                      </div>
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
