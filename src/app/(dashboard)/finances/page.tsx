export const dynamic = "force-dynamic"

import Link from "next/link"
import { getFinanceSummary, getExpenses, getCoaches, getMonthlyFinanceChart } from "@/lib/actions/finances"
import { ExportExpensesButton } from "@/components/finances/ExportExpensesButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Users
} from "lucide-react"
import { NewExpenseForm } from "@/components/finances/NewExpenseForm"
import { NewCoachForm } from "@/components/finances/NewCoachForm"
import { EditCoachButton } from "@/components/finances/EditCoachButton"
import { DeleteExpenseButton } from "@/components/finances/DeleteExpenseButton"
import { EditExpenseButton } from "@/components/finances/EditExpenseButton"
import { MonthPicker } from "@/components/finances/MonthPicker"
import { ExportCoachesButton } from "@/components/finances/ExportCoachesButton"

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

  const prevMonth = (() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  try {
    const [s, prev, e, c, ch] = await Promise.all([
      getFinanceSummary(month),
      getFinanceSummary(prevMonth),
      getExpenses({ month, category: category || undefined }),
      getCoaches(),
      getMonthlyFinanceChart(6),
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
  } catch { /* show zeros */ }

  const monthLabel = new Date(month + "-02").toLocaleDateString("es-CL", { month: "long", year: "numeric" })
  const chartMax = Math.max(...chartData.flatMap((m) => [m.income, m.expenses]), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Administración Financiera</h1>
          <p className="text-muted-foreground capitalize">
            {monthLabel}
            {summary.totalIncome > 0 && summary.totalExpenses > 0 && (() => {
              const ratio = (summary.totalIncome / summary.totalExpenses).toFixed(2)
              const expPct = Math.round((summary.totalExpenses / summary.totalIncome) * 100)
              const color = Number(ratio) >= 1 ? 'text-green-600' : 'text-red-600'
              return (
                <span className={`ml-2 text-sm font-semibold not-italic ${color}`}>
                  · {expPct}% egresos/ingresos (ratio {ratio}x)
                </span>
              )
            })()}
            {(() => {
              const top3 = Object.entries(summary.byCategory)
                .sort(([,a],[,b]) => b - a)
                .slice(0, 3)
              if (top3.length === 0) return null
              return (
                <span className="ml-2 text-sm not-italic">
                  · {top3.map(([cat, amt]) => (
                    <span key={cat} className="ml-1.5">
                      <span className="text-muted-foreground/70">{CATEGORY_LABELS[cat] ?? cat}:</span>{' '}
                      <span className="font-medium">${amt.toLocaleString('es-CL')}</span>
                    </span>
                  ))}
                </span>
              )
            })()}
            {chartData.length >= 2 && (() => {
              const peakMonth = chartData.slice().sort((a, b) => b.expenses - a.expenses)[0]
              if (!peakMonth || peakMonth.expenses === 0) return null
              return (
                <span className="ml-2 text-sm not-italic text-muted-foreground/70">
                  · Pico egreso: <span className="font-medium text-foreground">{peakMonth.label} ${peakMonth.expenses.toLocaleString('es-CL')}</span>
                </span>
              )
            })()}
            {coaches.length > 0 && (() => {
              type CoachRow = typeof coaches[number]
              const topCoach = coaches.slice().sort((a: CoachRow, b: CoachRow) => Number(b.salary) - Number(a.salary))[0]
              return topCoach ? (
                <span className="ml-2 text-sm not-italic text-muted-foreground/70">· Coach: <span className="font-medium text-foreground">{topCoach.name} ${Number(topCoach.salary).toLocaleString('es-CL')}</span></span>
              ) : null
            })()}
          </p>
        </div>
        <MonthPicker month={month} tab={tab} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.totalIncome.toLocaleString("es-CL")}
            </div>
            {prevSummary.totalIncome > 0 && (() => {
              const pct = Math.round(((summary.totalIncome - prevSummary.totalIncome) / prevSummary.totalIncome) * 100)
              return <p className={`text-xs font-medium mt-0.5 ${pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs mes anterior</p>
            })()}
            {!prevSummary.totalIncome && <p className="text-xs text-muted-foreground">pagos recibidos</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Egresos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${summary.totalExpenses.toLocaleString("es-CL")}
            </div>
            {prevSummary.totalExpenses > 0 && (() => {
              const pct = Math.round(((summary.totalExpenses - prevSummary.totalExpenses) / prevSummary.totalExpenses) * 100)
              return <p className={`text-xs font-medium mt-0.5 ${pct <= 0 ? 'text-green-600' : 'text-red-600'}`}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs mes anterior</p>
            })()}
            {!prevSummary.totalExpenses && <p className="text-xs text-muted-foreground">gastos del mes</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${summary.netBalance.toLocaleString("es-CL")}
            </div>
            <p className="text-xs text-muted-foreground">ingresos − egresos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por cobrar</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${summary.pendingIncome.toLocaleString("es-CL")}
            </div>
            <p className="text-xs text-muted-foreground">pagos pendientes</p>
          </CardContent>
        </Card>
      </div>

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
        const CAT_LABEL: Record<string, string> = { rent: '🏠', salary: '👔', supplies: '📦', maintenance: '🔧', marketing: '📣', other: '📁' }
        return (
          <div className="flex flex-wrap gap-3">
            {cats.map(([cat, { sum, count }]) => (
              <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40 text-sm">
                <span>{CAT_LABEL[cat] ?? '📁'}</span>
                <span className="text-muted-foreground">{CATEGORY_LABELS[cat] ?? cat}:</span>
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "overview", label: "Resumen" },
          { key: "expenses", label: "Egresos" },
          { key: "coaches", label: "Staff / Nómina" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/finances?tab=${t.key}&month=${month}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
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
        </div>
        )
      })()}

      {/* Expenses Tab */}
      {tab === "expenses" && (
        <div className="space-y-4">
          {expenses.length > 0 && (() => {
            const totalAmt = expenses.reduce((s, e) => s + Number(e.amount), 0)
            const byCat = expenses.reduce<Record<string, number>>((acc, e) => {
              acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
              return acc
            }, {})
            const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1])
            const maxAmt = sorted[0]?.[1] ?? 1
            const CAT_LABEL: Record<string, string> = { rent: '🏠 Arriendo', salary: '👔 Salarios', supplies: '📦 Insumos', maintenance: '🔧 Mantención', marketing: '📣 Marketing', other: '📁 Otros' }
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
              <ExportExpensesButton expenses={expenses} month={month} />
              {([["", "Todas"], ["rent", "🏠 Arriendo"], ["salary", "👔 Salarios"], ["supplies", "📦 Insumos"], ["maintenance", "🔧 Mantención"], ["marketing", "📣 Marketing"], ["other", "📁 Otros"]] as const).map(([val, lbl]) => (
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
              <ExportExpensesButton expenses={expenses} month={month} />
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

      {/* Coaches/Staff Tab */}
      {tab === "coaches" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
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
                        <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                          {coach.email && <span>{coach.email}</span>}
                          <span>{SALARY_TYPE_LABELS[coach.salary_type]}{coach.salary_amount ? `: $${Number(coach.salary_amount).toLocaleString("es-CL")}` : ""}</span>
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
    </div>
  )
}
