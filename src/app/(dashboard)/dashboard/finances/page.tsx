export const dynamic = "force-dynamic"

import Link from "next/link"
import { getFinanceSummary, getExpenses, getCoaches, getMonthlyFinanceChart } from "@/lib/actions/finances"
import { getSuppliers } from "@/lib/actions/suppliers"
import { SUPPLIER_CATEGORIES } from "@/lib/constants/suppliers"
import { NewSupplierButton } from "@/components/finances/NewSupplierButton"
import { DeleteSupplierButton } from "@/components/finances/DeleteSupplierButton"
import { ExportExpensesButton } from "@/components/finances/ExportExpensesButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Users, Building2,
  Wallet, PieChart, BarChart3, UserCog, Truck,
} from "lucide-react"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { NewExpenseForm } from "@/components/finances/NewExpenseForm"
import { NewCoachForm } from "@/components/finances/NewCoachForm"
import { EditCoachButton } from "@/components/finances/EditCoachButton"
import { DeleteExpenseButton } from "@/components/finances/DeleteExpenseButton"
import { EditExpenseButton } from "@/components/finances/EditExpenseButton"
import { MonthPicker } from "@/components/finances/MonthPicker"
import { ExportCoachesButton } from "@/components/finances/ExportCoachesButton"
import { FinancialProjection } from "@/components/finances/FinancialProjection"
import {
  DashboardPage,
  DashboardPageHeader,
  DashboardMetricCard,
} from "@/components/ui/dashboard-kit"

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Arriendo", salary: "Salarios", supplies: "Insumos",
  maintenance: "Mantención", marketing: "Marketing", other: "Otros",
}
const SALARY_TYPE_LABELS: Record<string, string> = {
  fixed: "Fijo mensual", per_session: "Por sesión", percentage: "% ingresos",
}

interface PageProps {
  searchParams: Promise<{ month?: string; tab?: string; category?: string; amountMin?: string; amountMax?: string; dateFrom?: string; dateTo?: string }>
}

export default async function FinancesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab       = params.tab       ?? "overview"
  const month     = params.month     ?? new Date().toISOString().slice(0, 7)
  const category  = params.category  ?? ""
  const amountMin = params.amountMin ? Number(params.amountMin) : undefined
  const amountMax = params.amountMax ? Number(params.amountMax) : undefined
  const dateFrom  = params.dateFrom  ?? ''
  const dateTo    = params.dateTo    ?? ''

  let summary = { totalIncome: 0, totalExpenses: 0, pendingIncome: 0, netBalance: 0, byCategory: {} as Record<string, number>, month }
  let prevSummary = { totalIncome: 0, totalExpenses: 0, pendingIncome: 0, netBalance: 0, byCategory: {} as Record<string, number>, month: '' }
  let expenses: Awaited<ReturnType<typeof getExpenses>>["expenses"] = []
  let coaches: Awaited<ReturnType<typeof getCoaches>> = []
  let chartData: Awaited<ReturnType<typeof getMonthlyFinanceChart>> = []
  let suppliers: Awaited<ReturnType<typeof getSuppliers>> = []

  const prevMonth = (() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  try {
    const [s, prev, e, c, ch, sup] = await Promise.all([
      getFinanceSummary(month),
      getFinanceSummary(prevMonth),
      getExpenses({ month, category: category || undefined }),
      getCoaches(),
      getMonthlyFinanceChart(6),
      getSuppliers({ activeOnly: false }),
    ])
    summary = s
    prevSummary = prev
    expenses = e.expenses
      .filter((ex) => amountMin === undefined || Number(ex.amount) >= amountMin)
      .filter((ex) => amountMax === undefined || Number(ex.amount) <= amountMax)
      .filter((ex) => !dateFrom || ex.date >= dateFrom)
      .filter((ex) => !dateTo   || ex.date <= dateTo)
    coaches = c
    chartData = ch
    suppliers = sup
  } catch { /* show zeros */ }

  const monthLabel = new Date(month + "-02").toLocaleDateString("es-CL", { month: "long", year: "numeric" })
  const chartMax = Math.max(...chartData.flatMap((m) => [m.income, m.expenses]), 1)

  const TABS = [
    { key: "overview", label: "Resumen", icon: <PieChart className="w-4 h-4" /> },
    { key: "projection", label: "Proyección", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "expenses", label: "Egresos", icon: <TrendingDown className="w-4 h-4" /> },
    { key: "coaches", label: "Staff / Nómina", icon: <UserCog className="w-4 h-4" /> },
    { key: "suppliers", label: `Proveedores${suppliers.length > 0 ? ` (${suppliers.length})` : ''}`, icon: <Truck className="w-4 h-4" /> },
  ]

  return (
    <DashboardPage>
      {/* ── PREMIUM HEADER ── */}
      <DashboardPageHeader
        icon={<Wallet className="w-10 h-10" />}
        title="Finanzas"
        subtitle={`Administración financiera del club — ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`}
        actions={<MonthPicker month={month} tab={tab} />}
      />

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardMetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Ingresos"
          value={`$${summary.totalIncome.toLocaleString("es-CL")}`}
          description={prevSummary.totalIncome > 0 ? (() => {
            const pct = Math.round(((summary.totalIncome - prevSummary.totalIncome) / prevSummary.totalIncome) * 100)
            return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs mes anterior`
          })() : "pagos recibidos"}
          tone="success"
        />
        <DashboardMetricCard
          icon={<TrendingDown className="w-4 h-4" />}
          label="Egresos"
          value={`$${summary.totalExpenses.toLocaleString("es-CL")}`}
          description={prevSummary.totalExpenses > 0 ? (() => {
            const pct = Math.round(((summary.totalExpenses - prevSummary.totalExpenses) / prevSummary.totalExpenses) * 100)
            return `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs mes anterior`
          })() : "gastos del mes"}
          tone="danger"
        />
        <DashboardMetricCard
          icon={<DollarSign className="w-4 h-4" />}
          label="Balance Neto"
          value={`$${summary.netBalance.toLocaleString("es-CL")}`}
          description="ingresos − egresos"
          tone={summary.netBalance >= 0 ? "success" : "danger"}
        />
        <DashboardMetricCard
          icon={<AlertCircle className="w-4 h-4" />}
          label="Por Cobrar"
          value={`$${summary.pendingIncome.toLocaleString("es-CL")}`}
          description="pagos pendientes"
          tone="warning"
        />
        {expenses.length > 0 && (() => {
          const maxExp = expenses.slice().sort((a, b) => Number(b.amount) - Number(a.amount))[0]
          if (!maxExp) return null
          const CAT_LABEL: Record<string, string> = { rent: 'Arriendo', salary: 'Salarios', supplies: 'Insumos', maintenance: 'Mantención', marketing: 'Marketing', other: 'Otros' }
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Mayor Egreso</CardTitle>
                  <InfoTooltip text="El gasto individual más alto registrado en el período. Útil para detectar gastos extraordinarios." />
                </div>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">${Number(maxExp.amount).toLocaleString('es-CL')}</div>
                <p className="text-xs text-muted-foreground truncate">{maxExp.description ?? CAT_LABEL[maxExp.category] ?? maxExp.category}</p>
              </CardContent>
            </Card>
          )
        })()}
        {summary.totalIncome > 0 && summary.totalExpenses > 0 && (() => {
          const ratio = summary.totalIncome / summary.totalExpenses
          const pct = Math.round(ratio * 100)
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ratio I/E</CardTitle>
                  <InfoTooltip text="Ingresos dividido Egresos. Mayor a 1.5x es saludable. Por debajo de 1x significa déficit." />
                </div>
                <TrendingUp className="h-4 w-4 text-teal-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${ratio >= 1.5 ? 'text-green-600' : ratio >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {ratio.toFixed(2)}x
                </div>
                <p className="text-xs text-muted-foreground">
                  {pct >= 100 ? `+${pct - 100}% sobre egresos` : `${100 - pct}% bajo egresos`}
                </p>
              </CardContent>
            </Card>
          )
        })()}
        {coaches.length > 0 && (() => {
          const fixedTotal = coaches
            .filter((c) => c.salary_type === 'fixed' && c.salary_amount)
            .reduce((s, c) => s + Number(c.salary_amount), 0)
          const perSession = coaches
            .filter((c) => c.salary_type === 'per_session' && c.salary_amount)
            .reduce((s, c) => s + Number(c.salary_amount), 0)
          const total = fixedTotal + perSession
          if (total === 0) return null
          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Nómina Mensual</CardTitle>
                  <InfoTooltip text="Costo total de entrenadores: suma de salarios fijos más valor por sesión de los coaches activos." />
                </div>
                <Users className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-600">${total.toLocaleString('es-CL')}</div>
                <p className="text-xs text-muted-foreground">{coaches.length} coach{coaches.length !== 1 ? 'es' : ''} · fijo + sesiones</p>
              </CardContent>
            </Card>
          )
        })()}
      </div>

      {/* Alert if expenses exceed income */}
      {summary.totalExpenses > 0 && summary.totalIncome > 0 && summary.totalExpenses > summary.totalIncome && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-800 font-medium">
                ⚠ Los egresos (${summary.totalExpenses.toLocaleString('es-CL')}) superan los ingresos (${summary.totalIncome.toLocaleString('es-CL')}) este mes
                <span className="ml-1 font-normal">— déficit de ${(summary.totalExpenses - summary.totalIncome).toLocaleString('es-CL')}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avg monthly expense KPI */}
      {chartData.length >= 2 && (() => {
        const months = chartData.filter((m) => m.expenses > 0)
        if (months.length < 2) return null
        const avg = Math.round(months.reduce((s, m) => s + m.expenses, 0) / months.length)
        const cur = chartData[chartData.length - 1]?.expenses ?? 0
        const diff = cur - avg
        const color = diff <= 0 ? 'text-green-600' : 'text-red-600'
        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">Prom. Egreso Mensual</CardTitle>
                <InfoTooltip text="Promedio de gastos mensuales basado en los meses con datos. Compara con el mes actual para detectar anomalías." />
              </div>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avg.toLocaleString('es-CL')}</div>
              <p className={`text-xs font-medium mt-0.5 ${color}`}>
                Este mes: ${cur.toLocaleString('es-CL')} ({diff >= 0 ? '+' : ''}{Math.round((diff / avg) * 100)}%)
              </p>
            </CardContent>
          </Card>
        )
      })()}

      {/* Avg expense per category KPI */}
      {expenses.length > 0 && (() => {
        const byCat = expenses.reduce<Record<string, { sum: number; count: number }>>((acc, e) => {
          if (!acc[e.category]) acc[e.category] = { sum: 0, count: 0 }
          acc[e.category].sum += Number(e.amount)
          acc[e.category].count++
          return acc
        }, {})
        const cats = Object.entries(byCat)
        if (cats.length < 2) return null
        return (
          <div className="flex flex-wrap gap-3">
            {cats.map(([cat, { sum, count }]) => (
              <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40 text-sm">
                <span className="text-muted-foreground">{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="font-semibold">${Math.round(sum / count).toLocaleString('es-CL')}</span>
                <span className="text-xs text-muted-foreground">prom. ({count})</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Coaches Payroll KPI */}
      {coaches.length > 0 && (() => {
        type Coach = { is_active: boolean; salary_type: string; salary_amount: number | null }
        const activeFixed = (coaches as Coach[]).filter((c) => c.is_active && c.salary_type === 'fixed' && c.salary_amount)
        const totalPayroll = activeFixed.reduce((sum, c) => sum + (c.salary_amount ?? 0), 0)
        if (totalPayroll === 0) return null
        return (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/40">
            <Users className="w-5 h-5 text-purple-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Nómina mensual fija</p>
              <p className="text-xs text-muted-foreground">{activeFixed.length} coach{activeFixed.length !== 1 ? 'es' : ''} con salario fijo activos</p>
            </div>
            <span className="text-xl font-bold text-purple-700">${totalPayroll.toLocaleString('es-CL')}</span>
          </div>
        )
      })()}

      {/* Income vs Expenses Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Ingresos vs Egresos — Últimos 6 Meses</span>
              <div className="flex items-center gap-4 text-xs font-normal text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Ingresos</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Egresos</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-32">
              {chartData.map((m, i) => {
                const incomePct  = Math.max((m.income   / chartMax) * 100, m.income   > 0 ? 3 : 0)
                const expensesPct = Math.max((m.expenses / chartMax) * 100, m.expenses > 0 ? 3 : 0)
                const isCurrentMonth = i === chartData.length - 1
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                      <div
                        className={`w-5/12 rounded-t-sm ${isCurrentMonth ? 'bg-green-500' : 'bg-green-400/60'}`}
                        style={{ height: `${incomePct}%` }}
                        title={`Ingresos ${m.label}: $${m.income.toLocaleString('es-CL')}`}
                      />
                      <div
                        className={`w-5/12 rounded-t-sm ${isCurrentMonth ? 'bg-red-400' : 'bg-red-300/60'}`}
                        style={{ height: `${expensesPct}%` }}
                        title={`Egresos ${m.label}: $${m.expenses.toLocaleString('es-CL')}`}
                      />
                    </div>
                    <span className={`text-xs capitalize ${isCurrentMonth ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {m.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown by Category */}
      {summary.totalExpenses > 0 && Object.keys(summary.byCategory).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Egresos por Categoría — {monthLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {Object.entries(summary.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const pct = Math.round((amount / summary.totalExpenses) * 100)
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <span className="text-sm text-muted-foreground">
                          ${amount.toLocaleString('es-CL')} <span className="text-xs">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/finances?tab=${t.key}&month=${month}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (() => {
        const DONUT_COLORS = ['#6366f1','#f43f5e','#f59e0b','#10b981','#3b82f6','#8b5cf6']
        const catEntries = Object.entries(summary.byCategory).sort(([,a],[,b]) => b - a)
        let cumulative = 0
        const segments = catEntries.map(([cat, amount], i) => {
          const pct = summary.totalExpenses > 0 ? (amount / summary.totalExpenses) * 100 : 0
          const seg = { cat, amount, pct, start: cumulative, color: DONUT_COLORS[i % DONUT_COLORS.length] }
          cumulative += pct
          return seg
        })
        const gradient = segments.length > 0
          ? segments.map((s) => `${s.color} ${s.start.toFixed(1)}% ${(s.start + s.pct).toFixed(1)}%`).join(', ')
          : '#e5e7eb 0% 100%'

        return (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Egresos por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {catEntries.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin egresos este mes</p>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Donut */}
                  <div className="shrink-0 relative w-24 h-24">
                    <div
                      className="w-24 h-24 rounded-full"
                      style={{ background: `conic-gradient(${gradient})` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-card" />
                    </div>
                  </div>
                  {/* Legend + bars */}
                  <div className="flex-1 space-y-2">
                    {segments.map((s) => (
                      <div key={s.cat}>
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                            {CATEGORY_LABELS[s.cat] ?? s.cat}
                          </span>
                          <span className="font-medium text-right">
                            ${s.amount.toLocaleString('es-CL')}
                            <span className="text-muted-foreground font-normal ml-1">({Math.round(s.pct)}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Flujo del mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Ingresos cobrados", amount: summary.totalIncome, color: "text-green-600" },
                { label: "Ingresos pendientes", amount: summary.pendingIncome, color: "text-yellow-600" },
                { label: "Egresos totales", amount: -summary.totalExpenses, color: "text-red-600" },
                { label: "Balance neto", amount: summary.netBalance, color: summary.netBalance >= 0 ? "text-green-700 font-bold" : "text-red-700 font-bold" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={row.color}>${Math.abs(row.amount).toLocaleString("es-CL")}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        {expenses.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top 3 egresos del mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expenses
                  .slice()
                  .sort((a, b) => Number(b.amount) - Number(a.amount))
                  .slice(0, 3)
                  .map((exp, i) => (
                    <div key={exp.id} className="flex items-center justify-between gap-3 text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                        <span className="truncate">{exp.concept}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{exp.category}</span>
                      </div>
                      <span className="font-bold text-red-600 shrink-0">−${Number(exp.amount).toLocaleString('es-CL')}</span>
                      <EditExpenseButton expense={exp} />
                      <DeleteExpenseButton expenseId={exp.id} />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
        )
      })()}

      {/* Projection Tab */}
      {tab === "projection" && (
        <FinancialProjection
          historicalData={chartData}
          currentMonthIncome={summary.totalIncome}
          currentMonthExpenses={summary.totalExpenses}
          pendingIncome={summary.pendingIncome}
          fixedMonthlyExpenses={(() => {
            const fixedCoaches = coaches
              .filter((c) => c.salary_type === 'fixed' && c.salary_amount)
              .reduce((s, c) => s + Number(c.salary_amount), 0)
            const rentExpenses = expenses
              .filter((e) => e.category === 'rent')
              .reduce((s, e) => s + Number(e.amount), 0)
            return fixedCoaches + rentExpenses
          })()}
          activeSubscriptions={0}
          avgSubscriptionValue={0}
        />
      )}

      {/* Expenses Tab */}
      {tab === "expenses" && (
        <div className="space-y-4">
          {(() => {
            const CAT_LABEL: Record<string, string> = { rent: 'Arriendo', salary: 'Salarios', supplies: 'Insumos', maintenance: 'Mantención', marketing: 'Marketing', other: 'Otros' }
            const cats = Object.keys(CAT_LABEL)
            return (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground font-medium">Categoría:</span>
                {(['', ...cats]).map((cat) => (
                  <Link key={cat || '_all'} href={`/dashboard/finances?tab=expenses&month=${month}${cat ? `&category=${cat}` : ''}`}>
                    <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                      (cat === '' && !category) || category === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-accent'
                    }`}>{cat ? CAT_LABEL[cat] : 'Todas'}</button>
                  </Link>
                ))}
              </div>
            )
          })()}
          {expenses.length > 0 && (() => {
            const totalAmt = expenses.reduce((s, e) => s + Number(e.amount), 0)
            const byCat = expenses.reduce<Record<string, number>>((acc, e) => {
              acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
              return acc
            }, {})
            const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1])
            const maxAmt = sorted[0]?.[1] ?? 1
            const CAT_LABEL: Record<string, string> = { rent: 'Arriendo', salary: 'Salarios', supplies: 'Insumos', maintenance: 'Mantención', marketing: 'Marketing', other: 'Otros' }
            const CAT_COLOR: Record<string, string> = { rent: 'bg-blue-400', salary: 'bg-violet-400', supplies: 'bg-orange-400', maintenance: 'bg-yellow-400', marketing: 'bg-pink-400', other: 'bg-gray-400' }
            return (
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground font-medium mb-3">
                    Egresos por categoría · Total: <span className="text-foreground font-semibold">${totalAmt.toLocaleString('es-CL')}</span>
                    {' · '}{expenses.length} egreso{expenses.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2">
                    {sorted.map(([cat, amt]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-32 shrink-0">{CAT_LABEL[cat] ?? cat}</span>
                        <div className="flex-1 bg-muted rounded-full overflow-hidden h-3">
                          <div
                            className={`h-3 rounded-full ${CAT_COLOR[cat] ?? 'bg-primary'} transition-all`}
                            style={{ width: `${Math.max(2, Math.round((amt / maxAmt) * 100))}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-28 text-right shrink-0">
                          ${amt.toLocaleString('es-CL')} ({Math.round((amt / totalAmt) * 100)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })()}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              {([["", "Todas"], ["rent", "Arriendo"], ["salary", "Salarios"], ["supplies", "Insumos"], ["maintenance", "Mantención"], ["marketing", "Marketing"], ["other", "Otros"]] as const).map(([val, lbl]) => (
                <a key={val} href={`/dashboard/finances?tab=expenses&month=${month}${val ? `&category=${val}` : ''}${amountMin !== undefined ? `&amountMin=${amountMin}` : ''}${amountMax !== undefined ? `&amountMax=${amountMax}` : ''}`}>
                  <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
                    (val === '' && !category) || category === val
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}>{lbl}</button>
                </a>
              ))}
              {(amountMin !== undefined || amountMax !== undefined) && (
                <a href={`/dashboard/finances?tab=expenses&month=${month}${category ? `&category=${category}` : ''}`}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center">✕ Limpiar monto</a>
              )}
            </div>
            <form method="get" action="/dashboard/finances" className="flex items-center gap-2 flex-wrap">
              <input type="hidden" name="tab" value="expenses" />
              <input type="hidden" name="month" value={month} />
              {category && <input type="hidden" name="category" value={category} />}
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-muted-foreground">Desde</label>
                <input type="date" name="dateFrom" defaultValue={dateFrom}
                  className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-muted-foreground">Hasta</label>
                <input type="date" name="dateTo" defaultValue={dateTo}
                  className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-32" />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-muted-foreground">Monto mín.</label>
                <input type="number" name="amountMin" defaultValue={amountMin ?? ''} min={0} placeholder="0"
                  className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-24" />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-muted-foreground">Monto máx.</label>
                <input type="number" name="amountMax" defaultValue={amountMax ?? ''} min={0} placeholder="∞"
                  className="h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-24" />
              </div>
              <button type="submit" className="h-8 px-3 mt-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Filtrar</button>
            </form>
            <div className="flex gap-2">
              <NewExpenseForm />
            </div>
          </div>

          {expenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Sin egresos registrados este mes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <Card key={exp.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{exp.concept}</span>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[exp.category] ?? exp.category}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{new Date(exp.date).toLocaleDateString("es-CL")}</span>
                          {exp.paid_to && <span>→ {exp.paid_to}</span>}
                        </div>
                      </div>
                      <span className="font-bold text-red-600 shrink-0">
                        −${Number(exp.amount).toLocaleString("es-CL")}
                      </span>
                      <EditExpenseButton expense={exp} />
                      <DeleteExpenseButton expenseId={exp.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              {suppliers.filter((s) => s.is_active).length} proveedores activos
            </p>
            <NewSupplierButton />
          </div>

          {suppliers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border border-dashed rounded-xl">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">Sin proveedores registrados</p>
              <p className="text-xs mt-1">Agrega canchas, equipamiento, ligas y más</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const catMap = Object.fromEntries(SUPPLIER_CATEGORIES.map((c) => [c.value, c.label]))
                const grouped = suppliers.reduce<Record<string, typeof suppliers>>((acc, s) => {
                  const cat = s.category ?? 'other'
                  if (!acc[cat]) acc[cat] = []
                  acc[cat].push(s)
                  return acc
                }, {})
                return Object.entries(grouped).map(([cat, list]) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1.5">
                      {catMap[cat] ?? cat}
                    </p>
                    <div className="space-y-2">
                      {list.map((sup) => (
                        <div key={sup.id} className={`rounded-xl border bg-card p-4 flex items-start gap-4 ${
                          !sup.is_active ? 'opacity-50' : ''
                        }`}>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{sup.name.slice(0, 2).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{sup.name}</span>
                              {!sup.is_active && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Inactivo</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
                              {sup.rut && <span>RUT: {sup.rut}</span>}
                              {sup.phone && <span>{sup.phone}</span>}
                              {sup.email && <span>{sup.email}</span>}
                              {sup.bank_name && (
                                <span className="text-blue-600">
                                  🏦 {sup.bank_name}{sup.account_type ? ` · ${sup.account_type}` : ''}{sup.account_number ? ` · ${sup.account_number}` : ''}
                                </span>
                              )}
                            </div>
                            {sup.notes && <p className="text-xs text-muted-foreground mt-1 italic">{sup.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <NewSupplierButton supplier={sup} mode="edit" />
                            <DeleteSupplierButton supplierId={sup.id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      )}

      {/* Coaches/Staff Tab */}
      {tab === "coaches" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">{coaches.filter((c) => c.is_active).length} entrenadores activos</p>
            <div className="flex gap-2">
              <ExportCoachesButton coaches={coaches.map((c) => ({ ...c, salary: undefined, salary_type: c.salary_type ?? '', salary_amount: c.salary_amount ?? null }))} />
              <NewCoachForm />
            </div>
          </div>

          {coaches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Sin staff registrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {coaches.map((coach) => (
                <Card key={coach.id} className={coach.is_active ? "" : "opacity-60"}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">{coach.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{coach.name}</span>
                          {!coach.is_active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                          {coach.specialty && (
                            <Badge variant="outline" className="text-xs">{coach.specialty}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                          {coach.email && <span>{coach.email}</span>}
                          <span>{SALARY_TYPE_LABELS[coach.salary_type]}{coach.salary_amount ? `: $${Number(coach.salary_amount).toLocaleString("es-CL")}` : ""}</span>
                          {(() => {
                            const curMonth = new Date().toISOString().slice(0, 7)
                            const coachExpenses = expenses.filter((e) =>
                              e.paid_to && e.paid_to.toLowerCase().includes(coach.name.toLowerCase()) &&
                              e.date.startsWith(curMonth)
                            )
                            if (coachExpenses.length === 0) return null
                            const total = coachExpenses.reduce((s, e) => s + Number(e.amount), 0)
                            return <span className="text-violet-600 font-medium">· ${total.toLocaleString('es-CL')} egresos este mes</span>
                          })()}
                        </div>
                      </div>
                      <EditCoachButton coach={coach} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardPage>
  )
}
