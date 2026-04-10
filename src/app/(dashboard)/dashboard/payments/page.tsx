export const dynamic = "force-dynamic"

import { requireClubStaffPage } from "@/lib/actions/club-context"
import Link from "next/link"
import { Suspense } from "react"
import { getPayments, getNextBillingDateByAthleteIds } from "@/lib/actions/payments"
import { getPaymentMetrics } from "@/lib/actions/billing"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, DollarSign, Clock, AlertTriangle, TrendingUp, CreditCard, ArrowUpRight, ChevronLeft, ChevronRight, CalendarClock, Target, Wallet, BarChart3, ArrowDownRight, Activity, Users } from "lucide-react"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { PaymentsFilter } from "@/components/payments/PaymentsFilter"
import { MarkAsPaidButton } from "@/components/payments/MarkAsPaidButton"
import { PaymentRowClient } from "@/components/payments/PaymentRowClient"
import { ExportPaymentsButton } from "@/components/payments/ExportPaymentsButton"
import { BulkMarkAsPaidButton } from "@/components/payments/BulkMarkAsPaidButton"
import { DeletePaymentButton } from "@/components/payments/DeletePaymentButton"
import { EditPaymentButton } from "@/components/payments/EditPaymentButton"
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

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString('es-CL')}`
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

  let payments: Awaited<ReturnType<typeof getPayments>>["payments"] = []
  let allPayments: Awaited<ReturnType<typeof getPayments>>["payments"] = []
  let total = 0
  let metrics: Awaited<ReturnType<typeof getPaymentMetrics>> | null = null
  let error: string | null = null
  const currentMonthIso = new Date().toISOString().slice(0, 7)
  let nextBillingByAthlete: Record<string, string | null> = {}

  try {
    const [result, allResult, metricsResult] = await Promise.all([
      getPayments({ status: params.status, page, limit: 25, from: from || undefined, to: to || undefined, athleteId: athleteId || undefined, search: search || undefined, athleteName: athleteName || undefined, amountMin: amountMin ? Number(amountMin) : undefined, amountMax: amountMax ? Number(amountMax) : undefined, paymentMethod: paymentMethod || undefined, paidFrom: paidFrom || undefined, paidTo: paidTo || undefined }),
      getPayments({ status: params.status, from: from || undefined, to: to || undefined, athleteId: athleteId || undefined, search: search || undefined, athleteName: athleteName || undefined, amountMin: amountMin ? Number(amountMin) : undefined, amountMax: amountMax ? Number(amountMax) : undefined, paymentMethod: paymentMethod || undefined, paidFrom: paidFrom || undefined, paidTo: paidTo || undefined }),
      getPaymentMetrics(currentMonthIso),
    ])
    payments = result.payments
    allPayments = allResult.payments
    total = result.total
    metrics = metricsResult
    nextBillingByAthlete = await getNextBillingDateByAthleteIds(result.payments.map((p) => p.athlete_id))
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error al cargar pagos'
  }

  const dashboard = metrics ?? {
    actualIncome: 0,
    actualIncomeCount: 0,
    projectedIncome: 0,
    projectedIncomeCount: 0,
    expectedFromSubscriptions: 0,
    activeSubscriptionsCount: 0,
    totalOverdue: 0,
    overdueCount: 0,
    overdueOlderThan30Days: 0,
    overdueOlderThan60Days: 0,
    totalPending: 0,
    pendingCount: 0,
    collectionRate: 0,
    previousMonthActual: 0,
    monthOverMonthChange: 0,
    expectedMonthTotal: 0,
    expectedMonthFromScheduled: 0,
    expectedMonthFromSubscriptions: 0,
    collectionGap: 0,
    pendingTransfersCount: 0,
    overdueThisWeekCount: 0,
    overdueAthletesCount: 0,
    duplicateGroupsCount: 0,
    monthlyTrend: [] as Array<{ key: string; label: string; collected: number; emitted: number; overdue: number }>,
    methodMix: [] as Array<{ method: string; amount: number; count: number; pct: number }>,
    overdueAging: { upTo30Days: 0, from31To60Days: 0, over60Days: 0 },
  }
  const currentMonthLabel = new Date(`${currentMonthIso}-01T12:00:00`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const expectedProgress = dashboard.expectedMonthTotal > 0
    ? Math.min(100, Math.round((dashboard.actualIncome / dashboard.expectedMonthTotal) * 100))
    : 0
  const emittedProgress = dashboard.collectionRate
  const monthlyChart = dashboard.monthlyTrend
  const chartMax = Math.max(...monthlyChart.flatMap((m) => [m.collected, m.emitted, m.overdue]), 1)
  const tableHasFilters = !!(params.status || search || athleteName || from || to || paidFrom || paidTo || amountMin || amountMax || paymentMethod || athleteId)
  const tableSummary = [
    tableHasFilters ? `${allPayments.length} movimientos filtrados` : `${allPayments.length} movimientos en tabla/exportación`,
    search ? `concepto: ${search}` : null,
    athleteName ? `atleta: ${athleteName}` : null,
    params.status ? `estado: ${STATUS_CONFIG[params.status]?.label ?? params.status}` : null,
  ].filter(Boolean)

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
    if (paidFrom)        base.paidFrom = paidFrom
    if (paidTo)          base.paidTo = paidTo
    if (amountMin)       base.amountMin = amountMin
    if (amountMax)       base.amountMax = amountMax
    if (paymentMethod)   base.paymentMethod = paymentMethod
    if (athleteId)       base.athleteId = athleteId
    return new URLSearchParams({ ...base, ...overrides }).toString()
  }

  return (
    <div className="space-y-8 pb-12 pt-1">

      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CreditCard className="w-10 h-10 text-primary" />
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground">
                Pagos
              </h1>
              <p className="mt-2 text-sm md:text-base text-muted-foreground/80 font-medium">
                Tablero de cobranza para {currentMonthLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary">
              {formatCurrency(dashboard.actualIncome)} cobrados este mes
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {formatCurrency(dashboard.expectedMonthTotal)} esperados
            </Badge>
            {dashboard.totalOverdue > 0 && (
              <Badge variant="outline" className="rounded-full border-destructive/30 bg-destructive/5 text-destructive">
                {formatCurrency(dashboard.totalOverdue)} en mora
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SyncOverdueButton />
          {payments.filter((p) => p.status === 'pending' || p.status === 'overdue').length > 1 && (
            <BulkMarkAsPaidButton
              ids={payments.filter((p) => p.status === 'pending' || p.status === 'overdue').map((p) => p.id)}
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
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4 rounded-2xl border-primary/20 bg-card shadow-sm overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary/30" />
          <CardContent className="pt-7 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cobrado este mes</p>
                <p className="mt-3 text-4xl font-black tracking-tighter text-primary">{formatCurrency(dashboard.actualIncome)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground/70">{dashboard.actualIncomeCount} pagos confirmados</span>
              {dashboard.previousMonthActual > 0 && (
                <span className={`inline-flex items-center gap-1 font-bold ${dashboard.monthOverMonthChange >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {dashboard.monthOverMonthChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {dashboard.monthOverMonthChange >= 0 ? '+' : ''}{dashboard.monthOverMonthChange}% vs mes anterior
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Esperado del mes</p>
                <InfoTooltip text="Programado del mes más cobros esperados por suscripciones activas sin fila emitida." />
              </div>
              <Target className="h-4 w-4 text-sky-500" />
            </div>
            <p className="text-3xl font-black tracking-tighter text-sky-500">{formatCurrency(dashboard.expectedMonthTotal)}</p>
            <p className="mt-1.5 text-xs text-muted-foreground/60 font-medium">
              Programado {formatCurrency(dashboard.expectedMonthFromScheduled)} · suscripciones {formatCurrency(dashboard.expectedMonthFromSubscriptions)}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Brecha del mes</p>
              <Wallet className="h-4 w-4 text-amber-400" />
            </div>
            <p className={`text-3xl font-black tracking-tighter ${dashboard.collectionGap > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>
              {formatCurrency(dashboard.collectionGap)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/60 font-medium">
              {dashboard.collectionGap > 0 ? 'Falta por recaudar este mes' : 'Meta mensual cubierta'}
            </p>
          </CardContent>
        </Card>

        <Card className={`lg:col-span-3 rounded-2xl shadow-sm ${dashboard.totalOverdue > 0 ? 'border-destructive/20' : 'border-border'}`}>
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">En mora</p>
                <InfoTooltip text="Deuda vencida acumulada pendiente de regularización." />
              </div>
              <AlertTriangle className={`h-4 w-4 ${dashboard.totalOverdue > 0 ? 'text-destructive' : 'text-muted-foreground/40'}`} />
            </div>
            <p className={`text-3xl font-black tracking-tighter ${dashboard.totalOverdue > 0 ? 'text-destructive' : 'text-muted-foreground/40'}`}>
              {formatCurrency(dashboard.totalOverdue)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground/60 font-medium">
              {dashboard.overdueCount} pagos · {dashboard.overdueAthletesCount} atletas con mora
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Avance contra esperado</p>
                <InfoTooltip text="Cobrado este mes comparado contra lo esperado para el mismo mes." />
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-end justify-between gap-4">
              <p className={`text-3xl font-black tracking-tighter ${expectedProgress >= 80 ? 'text-primary' : expectedProgress >= 50 ? 'text-amber-400' : 'text-destructive'}`}>
                {expectedProgress}%
              </p>
              <p className="text-xs text-muted-foreground/70 text-right">
                {formatCurrency(dashboard.actualIncome)} / {formatCurrency(dashboard.expectedMonthTotal)}
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
              <div
                className={`h-full rounded-full ${expectedProgress >= 80 ? 'bg-primary' : expectedProgress >= 50 ? 'bg-amber-400' : 'bg-destructive'}`}
                style={{ width: `${expectedProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Tasa sobre emitido</p>
                <InfoTooltip text="Cobrado este mes versus pagos emitidos con vencimiento en el mismo mes." />
              </div>
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-end justify-between gap-4">
              <p className={`text-3xl font-black tracking-tighter ${emittedProgress >= 80 ? 'text-primary' : emittedProgress >= 50 ? 'text-amber-400' : 'text-destructive'}`}>
                {emittedProgress}%
              </p>
              <p className="text-xs text-muted-foreground/70 text-right">
                {formatCurrency(dashboard.actualIncome)} / {formatCurrency(dashboard.projectedIncome)}
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
              <div
                className={`h-full rounded-full ${emittedProgress >= 80 ? 'bg-primary' : emittedProgress >= 50 ? 'bg-amber-400' : 'bg-destructive'}`}
                style={{ width: `${emittedProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Base activa</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-black tracking-tighter text-foreground">{dashboard.activeSubscriptionsCount}</p>
            <p className="mt-1.5 text-xs text-muted-foreground/60 font-medium">
              Suscripciones activas · {dashboard.pendingCount} pagos pendientes abiertos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════ CHARTS ROW ═══════════ */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
          <CardHeader className="pb-0 pt-5 px-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">Cobrado vs Emitido</CardTitle>
            <p className="text-xs text-muted-foreground/70">Lectura mensual de los últimos 6 meses para saber si la cobranza acompaña la emisión de cuotas.</p>
          </CardHeader>
          <CardContent className="px-6 pt-5 pb-6">
            <div className="flex items-end gap-3 h-56">
              {monthlyChart.map((m, i) => {
                const collectedH = Math.max(m.collected > 0 ? Math.round((m.collected / chartMax) * 168) : 0, m.collected > 0 ? 10 : 0)
                const emittedH = Math.max(m.emitted > 0 ? Math.round((m.emitted / chartMax) * 168) : 0, m.emitted > 0 ? 10 : 0)
                const overdueH = Math.max(m.overdue > 0 ? Math.round((m.overdue / chartMax) * 168) : 0, m.overdue > 0 ? 6 : 0)
                const isCurrent = i === monthlyChart.length - 1
                return (
                  <div key={m.key} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                    <div className="flex items-end justify-center gap-1.5 h-44 w-full">
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div
                          className={`w-full max-w-6 rounded-t-md ${isCurrent ? 'bg-primary' : 'bg-primary/50'}`}
                          style={{ height: collectedH }}
                        />
                        <span className="text-[9px] text-muted-foreground/60">Cob.</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div
                          className={`w-full max-w-6 rounded-t-md ${isCurrent ? 'bg-sky-500/90' : 'bg-sky-500/50'}`}
                          style={{ height: emittedH }}
                        />
                        <span className="text-[9px] text-muted-foreground/60">Emi.</span>
                      </div>
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div
                          className="w-full max-w-6 rounded-t-md bg-destructive/60"
                          style={{ height: overdueH }}
                        />
                        <span className="text-[9px] text-muted-foreground/60">Mora</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className={`text-[10px] font-bold ${isCurrent ? 'text-foreground' : 'text-muted-foreground/70'}`}>{m.label}</p>
                      <p className="text-[9px] text-muted-foreground/50">{formatCurrency(m.collected)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" />Cobrado</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500/90 inline-block" />Emitido</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-destructive/60 inline-block" />En mora</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
            <CardHeader className="pb-0 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">Mix por Método</CardTitle>
              <p className="text-xs text-muted-foreground/70">Solo pagos cobrados durante el mes actual.</p>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-5">
              {dashboard.methodMix.length === 0 ? (
                <p className="text-sm text-muted-foreground/60">Aún no hay cobros del mes para comparar métodos.</p>
              ) : (
                <div className="space-y-3">
                  {dashboard.methodMix.map((row) => (
                    <div key={row.method} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-muted-foreground truncate">{METHOD_LABEL[row.method] ?? row.method}</span>
                        <div className="text-right">
                          <p className="text-xs font-black text-foreground">{formatCurrency(row.amount)}</p>
                          <p className="text-[10px] text-muted-foreground/60">{row.count} pagos · {row.pct}%</p>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(row.pct, 4)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
            <CardHeader className="pb-0 pt-5 px-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">Mora por Antigüedad</CardTitle>
              <p className="text-xs text-muted-foreground/70">Ayuda a separar mora reciente de deuda envejecida.</p>
            </CardHeader>
            <CardContent className="px-6 pt-4 pb-5">
              <div className="space-y-3">
                {[
                  { label: '1 a 30 días', value: dashboard.overdueAging.upTo30Days },
                  { label: '31 a 60 días', value: dashboard.overdueAging.from31To60Days },
                  { label: '+60 días', value: dashboard.overdueAging.over60Days },
                ].map((bucket) => {
                  const pct = dashboard.totalOverdue > 0 ? Math.round((bucket.value / dashboard.totalOverdue) * 100) : 0
                  return (
                    <div key={bucket.label} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-muted-foreground">{bucket.label}</span>
                        <span className="text-xs font-black text-foreground">{formatCurrency(bucket.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div className="h-full rounded-full bg-destructive/60" style={{ width: `${Math.max(pct, bucket.value > 0 ? 4 : 0)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════ ATTENTION TODAY ═══════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Atención Hoy</h2>
            <p className="text-sm text-muted-foreground/70">Accesos rápidos a focos operativos de cobranza y seguimiento.</p>
          </div>
          <Badge variant="outline" className="rounded-full">KPIs del mes no cambian con filtros</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/dashboard/payments?status=pending&paymentMethod=transfer">
            <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/10 transition-colors">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Transferencias</p>
                    <p className="mt-2 text-3xl font-black tracking-tighter text-foreground">{dashboard.pendingTransfersCount}</p>
                  </div>
                  <Clock className="h-5 w-5 text-amber-400" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground/60">Pagos con comprobante o transferencia por revisar.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/payments?status=overdue">
            <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/10 transition-colors">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Vencidos semana</p>
                    <p className="mt-2 text-3xl font-black tracking-tighter text-foreground">{dashboard.overdueThisWeekCount}</p>
                  </div>
                  <Activity className="h-5 w-5 text-destructive" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground/60">Pagos que entraron en mora durante los últimos 7 días.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/payments?status=overdue">
            <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/10 transition-colors">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Morosos</p>
                    <p className="mt-2 text-3xl font-black tracking-tighter text-foreground">{dashboard.overdueAthletesCount}</p>
                  </div>
                  <Users className="h-5 w-5 text-destructive" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground/60">Atletas con al menos un pago vencido en cartera.</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/payments">
            <Card className="rounded-2xl border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/10 transition-colors">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Duplicados</p>
                    <p className="mt-2 text-3xl font-black tracking-tighter text-foreground">{dashboard.duplicateGroupsCount}</p>
                  </div>
                  <CalendarClock className="h-5 w-5 text-amber-400" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground/60">Posibles cobros repetidos por atleta y mes de vencimiento.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ═══════════ OPERATIONS HEADER ═══════════ */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Movimientos y Cobranza</h2>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Usa filtros para trabajar el detalle; el resumen superior sigue mostrando la salud mensual del club.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tableSummary.map((item) => (
            <Badge key={item} variant="outline" className="rounded-full">
              {item}
            </Badge>
          ))}
        </div>
      </div>

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
