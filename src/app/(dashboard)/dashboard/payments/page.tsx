export const dynamic = "force-dynamic"

import { requireClubStaffPage } from "@/lib/actions/club-context"
import Link from "next/link"
import { Suspense } from "react"
import { getPayments, getPaymentSummary, getNextBillingDateByAthleteIds } from "@/lib/actions/payments"
import { getExpectedMonthIncome } from "@/lib/actions/finances"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, DollarSign, Clock, AlertTriangle, TrendingUp, CheckCircle, CreditCard, FileText, ArrowUpRight, ChevronLeft, ChevronRight, CalendarClock } from "lucide-react"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { PaymentsFilter } from "@/components/payments/PaymentsFilter"
import { MarkAsPaidButton } from "@/components/payments/MarkAsPaidButton"
import { ConfirmTransferButton } from "@/components/payments/ConfirmTransferButton"
import { PaymentRowClient } from "@/components/payments/PaymentRowClient"
import { ExportPaymentsButton } from "@/components/payments/ExportPaymentsButton"
import { BulkMarkAsPaidButton } from "@/components/payments/BulkMarkAsPaidButton"
import { DeletePaymentButton } from "@/components/payments/DeletePaymentButton"
import { EditPaymentButton } from "@/components/payments/EditPaymentButton"
import { DismissibleAlert } from "@/components/ui/DismissibleAlert"
import { SyncOverdueButton } from "@/components/payments/SyncOverdueButton"

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string; from?: string; to?: string; athleteId?: string; search?: string; athleteName?: string; amountMin?: string; amountMax?: string; paymentMethod?: string; paidFrom?: string; paidTo?: string; dueFrom?: string; dueTo?: string }>
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; dot: string }> = {
  paid:      { label: 'Pagado',    variant: 'default',     dot: 'bg-emerald-400' },
  pending:   { label: 'Pendiente', variant: 'secondary',   dot: 'bg-amber-400' },
  overdue:   { label: 'Vencido',   variant: 'destructive', dot: 'bg-red-500' },
  failed:    { label: 'Fallido',   variant: 'destructive', dot: 'bg-red-500' },
  cancelled: { label: 'Cancelado', variant: 'outline',     dot: 'bg-muted-foreground/40' },
}

const BILLING_LABEL: Record<string, string> = {
  monthly: 'mes', quarterly: 'trim', semiannual: 'sem', annual: 'año', single: 'único',
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Efectivo', transfer: 'Transferencia', webpay: 'Webpay',
  flow: 'Flow', mercadopago: 'MercadoPago', khipu: 'Khipu', other: 'Otro',
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  await requireClubStaffPage()
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
  const currentMonthIso = new Date().toISOString().slice(0, 7)
  let expectedMonth = { total: 0, fromScheduled: 0, fromSubscriptions: 0, month: currentMonthIso }
  let nextBillingByAthlete: Record<string, string | null> = {}

  try {
    const [result, allResult, summaryResult, expectedRes] = await Promise.all([
      getPayments({ status: params.status, page, limit: 25, from: from || undefined, to: to || undefined, athleteId: athleteId || undefined, search: search || undefined, athleteName: athleteName || undefined, amountMin: amountMin ? Number(amountMin) : undefined, amountMax: amountMax ? Number(amountMax) : undefined, paymentMethod: paymentMethod || undefined }),
      getPayments({ status: params.status, page: 1, limit: 1000, from: from || undefined, to: to || undefined, athleteId: athleteId || undefined, search: search || undefined, athleteName: athleteName || undefined, amountMin: amountMin ? Number(amountMin) : undefined, amountMax: amountMax ? Number(amountMax) : undefined, paymentMethod: paymentMethod || undefined }),
      getPaymentSummary(),
      getExpectedMonthIncome(currentMonthIso),
    ])
    expectedMonth = expectedRes
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
    nextBillingByAthlete = await getNextBillingDateByAthleteIds(pList.map((p) => p.athlete_id))
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error al cargar pagos'
  }

  // ── Derived data ──
  const totalEmitted = summary.total_collected + summary.total_pending + summary.total_overdue
  const collectionPct = totalEmitted > 0 ? Math.round((summary.total_collected / totalEmitted) * 100) : 0

  // Overdue alerts
  const overdueAthletes = (() => {
    const map: Record<string, { name: string; id: string; debt: number }> = {}
    for (const p of allPayments.filter((p) => p.status === 'overdue')) {
      const ath = p.athletes as { id: string; name: string } | null
      if (!ath) continue
      if (!map[ath.id]) map[ath.id] = { id: ath.id, name: ath.name, debt: 0 }
      map[ath.id].debt += Number(p.amount)
    }
    return Object.values(map).sort((a, b) => b.debt - a.debt)
  })()

  // Payment method distribution
  const methodDistribution = (() => {
    const result: Record<string, number> = {}
    for (const p of allPayments.filter((p) => p.status === 'paid' && p.payment_method)) {
      result[p.payment_method!] = (result[p.payment_method!] ?? 0) + Number(p.amount)
    }
    return Object.entries(result).sort(([, a], [, b]) => b - a)
  })()

  // Monthly chart data
  const monthlyChart = (() => {
    const now = new Date()
    const months: { key: string; label: string; paid: number; overdue: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-CL', { month: 'short' })
      const paid   = allPayments.filter((p) => p.status === 'paid' && p.paid_at?.startsWith(key)).reduce((s, p) => s + Number(p.amount), 0)
      const overdue = allPayments.filter((p) => p.status === 'overdue' && (p.due_date ?? '').startsWith(key)).reduce((s, p) => s + Number(p.amount), 0)
      months.push({ key, label, paid, overdue })
    }
    return months
  })()
  const chartMax = Math.max(...monthlyChart.map((m) => m.paid + m.overdue), 1)

  // Debt per athlete (for table)
  const debtByAthlete: Record<string, number> = {}
  for (const p of allPayments) {
    if (p.status === 'pending' || p.status === 'overdue') {
      const id = (p.athletes as { id: string } | null)?.id ?? p.athlete_id ?? ''
      if (id) debtByAthlete[id] = (debtByAthlete[id] ?? 0) + Number(p.amount)
    }
  }

  // Duplicate detection
  const keyCounts: Record<string, number> = {}
  const dupKeys = new Set<string>()
  for (const p of allPayments) {
    const aId = (p.athletes as { id: string } | null)?.id ?? p.athlete_id ?? ''
    const month = p.due_date?.slice(0, 7) ?? ''
    const key = `${aId}|${month}`
    keyCounts[key] = (keyCounts[key] ?? 0) + 1
    if (keyCounts[key] > 1) dupKeys.add(key)
  }

  // Build query string helper
  const makeQs = (overrides: Record<string, string>) => {
    const base: Record<string, string> = {}
    if (params.status)   base.status = params.status
    if (search)          base.search = search
    if (athleteName)     base.athleteName = athleteName
    if (from)            base.from = from
    if (to)              base.to = to
    if (amountMin)       base.amountMin = amountMin
    if (amountMax)       base.amountMax = amountMax
    if (paymentMethod)   base.paymentMethod = paymentMethod
    return new URLSearchParams({ ...base, ...overrides }).toString()
  }

  return (
    <div className="space-y-8 pb-12 pt-1">

      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-3">
            <CreditCard className="w-10 h-10 text-primary" /> Pagos
          </h1>
          <p className="text-sm md:text-base text-muted-foreground/80 mt-3 max-w-xl font-medium flex flex-wrap items-center gap-x-2">
            <span>{total} transacciones</span>
            {summary.total_collected > 0 && <span className="text-primary font-bold">· ${summary.total_collected.toLocaleString('es-CL')} cobrado</span>}
            {summary.total_overdue > 0 && <span className="text-destructive font-bold">· ${summary.total_overdue.toLocaleString('es-CL')} vencido</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SyncOverdueButton />
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
            <Button className="gap-2 h-11 px-5 rounded-xl font-black uppercase tracking-widest text-xs bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.25)] hover:bg-primary/90">
              <Plus className="w-4 h-4" /> Registrar Pago
            </Button>
          </Link>
        </div>
      </div>

      {/* Athlete filter banner */}
      {athleteId && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <span className="text-primary font-bold text-sm uppercase tracking-wide">Filtrando pagos por atleta</span>
          <Link href="/dashboard/payments" className="ml-auto text-xs font-bold text-muted-foreground hover:text-foreground underline">
            Ver todos
          </Link>
        </div>
      )}

      {/* ═══════════ KPI GRID ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Hero: Recaudado */}
        <Card className="col-span-2 lg:col-span-1 rounded-2xl border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 to-primary/20" />
          <CardContent className="pt-8 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Recaudado</p>
                <InfoTooltip text="Suma de todos los pagos con estado 'pagado'." />
              </div>
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-4xl font-black text-primary tracking-tighter drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">
              ${summary.total_collected.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2 font-medium">Total pagos confirmados</p>
          </CardContent>
        </Card>

        {/* Pendiente */}
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm hover:border-amber-500/20 transition-colors">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Pendiente</p>
                <InfoTooltip text="Pagos emitidos que aún no han vencido ni sido cobrados." />
              </div>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className={`text-3xl font-black tracking-tighter ${summary.total_pending > 0 ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 'text-muted-foreground/30'}`}>
              ${summary.total_pending.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5 font-medium">Por cobrar</p>
          </CardContent>
        </Card>

        {/* Vencido */}
        <Card className={`rounded-2xl shadow-sm transition-colors ${summary.total_overdue > 0 ? 'border-destructive/20 hover:border-destructive/40' : 'border-white/[0.04]'}`}>
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Vencido</p>
                <InfoTooltip text="Monto total con fecha de vencimiento superada y sin pagar." />
              </div>
              <AlertTriangle className={`w-4 h-4 ${summary.total_overdue > 0 ? 'text-destructive' : 'text-muted-foreground/40'}`} />
            </div>
            <p className={`text-3xl font-black tracking-tighter ${summary.total_overdue > 0 ? 'text-destructive drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'text-muted-foreground/30'}`}>
              ${summary.total_overdue.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5 font-medium">{summary.count_overdue} cuotas morosas</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5 text-sky-500" /> Ingresos esperados
                </p>
                <InfoTooltip text="Suma del mes: cuotas pendientes/vencidas con fecha de vencimiento en el mes calendario más montos de suscripciones activas cuya próxima facturación cae en el mes y aún no tienen fila de pago en ese período." />
              </div>
            </div>
            <p className={`text-3xl font-black tracking-tighter ${expectedMonth.total > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground/30'}`}>
              ${expectedMonth.total.toLocaleString('es-CL')}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/60 font-medium">
              Mes {currentMonthIso.slice(5, 7)}/{currentMonthIso.slice(0, 4)} · programado ${expectedMonth.fromScheduled.toLocaleString('es-CL')} · suscripciones ${expectedMonth.fromSubscriptions.toLocaleString('es-CL')}
            </p>
          </CardContent>
        </Card>

        {/* % Cobrado */}
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">% Cobrado</p>
                <InfoTooltip text="Porcentaje cobrado sobre el total emitido." />
              </div>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className={`text-3xl font-black tracking-tighter ${collectionPct >= 80 ? 'text-primary' : collectionPct >= 50 ? 'text-amber-400' : 'text-destructive'}`}>
              {collectionPct}%
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${collectionPct >= 80 ? 'bg-primary' : collectionPct >= 50 ? 'bg-amber-400' : 'bg-destructive'}`}
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground/60 mt-1.5 font-medium">
              ${summary.total_collected.toLocaleString('es-CL')} / ${totalEmitted.toLocaleString('es-CL')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════ ALERT BANNER ═══════════ */}
      {overdueAthletes.length > 0 && (() => {
        const totalDebt = overdueAthletes.reduce((s, a) => s + a.debt, 0)
        return (
          <div className="rounded-2xl border border-destructive/20 bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black tracking-tight text-foreground">
                Alertas de pagos
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {overdueAthletes.length} atleta{overdueAthletes.length !== 1 ? 's' : ''} con cuotas vencidas · ${totalDebt.toLocaleString('es-CL')} en mora.
                {overdueAthletes.length <= 3 && (
                  <span className="text-destructive font-bold ml-1">
                    {overdueAthletes.map(a => a.name).join(', ')}
                  </span>
                )}
              </p>
            </div>
            <Link href="/dashboard/payments?status=overdue">
              <button className="shrink-0 h-10 px-5 rounded-xl border border-destructive/30 text-destructive font-black uppercase tracking-widest text-[10px] hover:bg-destructive/10 transition-colors flex items-center gap-2">
                Ver Morosos <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        )
      })()}

      {/* ═══════════ CHARTS ROW ═══════════ */}
      {(methodDistribution.length > 0 || monthlyChart.some(m => m.paid > 0 || m.overdue > 0)) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Method Distribution */}
          {methodDistribution.length > 0 && (
            <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
              <CardHeader className="pb-0 pt-5 px-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">Distribución por Método</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-4 pb-5">
                <div className="space-y-3">
                  {methodDistribution.map(([method, amount]) => {
                    const pct = totalEmitted > 0 ? Math.round((amount / summary.total_collected) * 100) : 0
                    return (
                      <div key={method} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-28 truncate">{METHOD_LABEL[method] ?? method}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                        <span className="text-xs font-black text-foreground w-24 text-right">${amount.toLocaleString('es-CL')}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Chart */}
          {monthlyChart.some(m => m.paid > 0 || m.overdue > 0) && (
            <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
              <CardHeader className="pb-0 pt-5 px-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">Cobrado vs Vencido</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-4 pb-5">
                <div className="flex items-end gap-3 h-32">
                  {monthlyChart.map((m, i) => {
                    const paidH  = Math.max(m.paid > 0 ? Math.round((m.paid / chartMax) * 120) : 0, m.paid > 0 ? 6 : 0)
                    const overdH = Math.max(m.overdue > 0 ? Math.round((m.overdue / chartMax) * 120) : 0, m.overdue > 0 ? 6 : 0)
                    const isCurrent = i === monthlyChart.length - 1
                    return (
                      <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                        {m.paid > 0 && (
                          <span className="text-[9px] font-bold text-muted-foreground/50">${(m.paid / 1000).toFixed(0)}k</span>
                        )}
                        <div className="flex flex-col-reverse w-full gap-px items-center">
                          {paidH > 0 && <div className={`w-full rounded-t-md ${isCurrent ? 'bg-primary' : 'bg-primary/40'}`} style={{ height: paidH }} />}
                          {overdH > 0 && <div className="w-full bg-destructive/50 rounded-sm" style={{ height: overdH }} />}
                        </div>
                        <span className={`text-[10px] font-bold ${isCurrent ? 'text-foreground' : 'text-muted-foreground/60'}`}>{m.label}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-5 mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Cobrado</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-destructive/50 inline-block" />Vencido</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════ FILTERS ═══════════ */}
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

      {/* ═══════════ PAYMENTS TABLE ═══════════ */}
      {error ? (
        <Card className="rounded-2xl border-destructive/20">
          <CardContent className="py-12 text-center text-destructive font-bold">{error}</CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card className="rounded-2xl border-white/[0.04]">
          <CardContent className="py-20 text-center">
            <CreditCard className="w-14 h-14 mx-auto mb-5 text-muted-foreground/20" />
            <h3 className="font-black text-xl uppercase tracking-tight mb-2">Sin pagos registrados</h3>
            <p className="text-sm text-muted-foreground/70 font-medium mb-6">Registra el primer cobro del club</p>
            <Link href="/dashboard/payments/new">
              <Button className="rounded-xl font-black uppercase tracking-widest text-xs h-11 px-6">Registrar Pago</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[minmax(200px,2fr)_110px_minmax(140px,1.5fr)_120px_110px_130px_120px] gap-4 px-6 py-3.5 border-b border-white/[0.04] bg-muted/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Atleta</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Monto</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Plan</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Fecha pago</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 inline-flex items-center gap-1">
              Próximo pago
              <InfoTooltip text="Próxima fecha de cobro según la suscripción activa del atleta y el ciclo de su plan (a partir del inicio de período del pago)." />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Estado Pago</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-right">Acciones</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/[0.03]">
            {payments.map((payment) => {
              const athlete = payment.athletes as { id: string; name: string; photo_url: string | null } | null
              const athleteDebt = athlete ? (debtByAthlete[athlete.id] ?? 0) : 0
              const isDuplicate = dupKeys.has(`${athlete?.id ?? payment.athlete_id ?? ''}|${payment.due_date?.slice(0, 7) ?? ''}`)
              const notes = (payment as { notes?: string | null }).notes
              const hasReceipt = notes && /https?:\/\/[^\s]+/i.test(notes)
              const isTransfer = payment.payment_method === 'transfer' || (notes && notes.toLowerCase().includes('comprobante'))
              const isPendingTransfer = (payment.status === 'pending' || payment.status === 'overdue') && (isTransfer || hasReceipt)

              const cfg = STATUS_CONFIG[payment.status] ?? { label: payment.status, variant: 'outline' as const, dot: 'bg-muted-foreground/40' }
              const plan = (payment as { plans?: { name: string; billing_cycle?: string } | null }).plans
              const athleteIdKey = athlete?.id ?? payment.athlete_id ?? ''
              const nextPay = athleteIdKey ? nextBillingByAthlete[athleteIdKey] ?? null : null

              // For pending transfers, use the interactive client component
              if (isPendingTransfer) {
                return (
                  <PaymentRowClient
                    key={payment.id}
                    payment={{
                      ...payment,
                      notes: notes ?? null,
                      athletes: athlete,
                      plans: plan ?? null,
                    }}
                    athleteDebt={athleteDebt}
                    isDuplicate={isDuplicate}
                    nextBillingDate={nextPay}
                  />
                )
              }

              return (
                <div
                  key={payment.id}
                  className="grid grid-cols-1 md:grid-cols-[minmax(200px,2fr)_110px_minmax(140px,1.5fr)_120px_110px_130px_120px] gap-3 md:gap-4 items-center px-6 py-4 hover:bg-muted/5 transition-colors"
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
                        <Link href={`/dashboard/athletes/${athlete.id}`} className="text-sm font-bold hover:text-primary transition-colors truncate block">
                          {athlete.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">—</span>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 truncate">{payment.concept}</p>
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

                  {/* Next subscription payment */}
                  <div>
                    <p className="md:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-0.5">Próximo pago</p>
                    {nextPay ? (
                      <p className="text-sm text-muted-foreground font-medium">
                        {new Date(nextPay + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    ) : (
                      <span className="text-sm text-muted-foreground/40">—</span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className={`text-sm font-bold ${
                        payment.status === 'paid' ? 'text-primary' :
                        payment.status === 'overdue' ? 'text-destructive' :
                        payment.status === 'pending' ? 'text-amber-400' :
                        'text-muted-foreground'
                      }`}>
                        {cfg.label}
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
                  <div className="flex items-center gap-1.5 justify-end">
                    <EditPaymentButton payment={payment} />
                    {(payment.status === 'pending' || payment.status === 'overdue') && (
                      <MarkAsPaidButton paymentId={payment.id} />
                    )}
                    <DeletePaymentButton paymentId={payment.id} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ═══════════ PAGINATION ═══════════ */}
      {total > 25 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
            Mostrando {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} de {total}
          </p>
          <div className="flex items-center gap-1.5">
            {page > 1 && (
              <Link href={`/dashboard/payments?${makeQs({ page: String(page - 1) })}`}>
                <button className="w-9 h-9 rounded-xl border border-white/[0.06] bg-card flex items-center justify-center hover:bg-muted/20 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </Link>
            )}
            {/* Page numbers */}
            {Array.from({ length: Math.min(Math.ceil(total / 25), 5) }, (_, i) => {
              const p = i + 1
              const isCurrent = p === page
              return (
                <Link key={p} href={`/dashboard/payments?${makeQs({ page: String(p) })}`}>
                  <button className={`w-9 h-9 rounded-xl text-xs font-black flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.3)]'
                      : 'border border-white/[0.06] bg-card text-muted-foreground hover:bg-muted/20 hover:border-primary/30 hover:text-foreground'
                  }`}>
                    {p}
                  </button>
                </Link>
              )
            })}
            {page * 25 < total && (
              <Link href={`/dashboard/payments?${makeQs({ page: String(page + 1) })}`}>
                <button className="w-9 h-9 rounded-xl border border-white/[0.06] bg-card flex items-center justify-center hover:bg-muted/20 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
