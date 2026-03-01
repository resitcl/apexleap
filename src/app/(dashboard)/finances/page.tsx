export const dynamic = "force-dynamic"

import Link from "next/link"
import { getFinanceSummary, getExpenses, getCoaches, getMonthlyFinanceChart } from "@/lib/actions/finances"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Users
} from "lucide-react"
import { NewExpenseForm } from "@/components/finances/NewExpenseForm"
import { NewCoachForm } from "@/components/finances/NewCoachForm"
import { DeleteExpenseButton } from "@/components/finances/DeleteExpenseButton"
import { MonthPicker } from "@/components/finances/MonthPicker"

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Arriendo", salary: "Salarios", supplies: "Insumos",
  maintenance: "Mantención", marketing: "Marketing", other: "Otros",
}
const SALARY_TYPE_LABELS: Record<string, string> = {
  fixed: "Fijo mensual", per_session: "Por sesión", percentage: "% ingresos",
}

interface PageProps {
  searchParams: Promise<{ month?: string; tab?: string }>
}

export default async function FinancesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab = params.tab ?? "overview"
  const month = params.month ?? new Date().toISOString().slice(0, 7)

  let summary = { totalIncome: 0, totalExpenses: 0, pendingIncome: 0, netBalance: 0, byCategory: {} as Record<string, number>, month }
  let expenses: Awaited<ReturnType<typeof getExpenses>>["expenses"] = []
  let coaches: Awaited<ReturnType<typeof getCoaches>> = []
  let chartData: Awaited<ReturnType<typeof getMonthlyFinanceChart>> = []

  try {
    const [s, e, c, ch] = await Promise.all([
      getFinanceSummary(month),
      getExpenses({ month }),
      getCoaches(),
      getMonthlyFinanceChart(6),
    ])
    summary = s
    expenses = e.expenses
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
          <p className="text-muted-foreground capitalize">{monthLabel}</p>
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
            <p className="text-xs text-muted-foreground">pagos recibidos</p>
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
            <p className="text-xs text-muted-foreground">gastos del mes</p>
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
      {tab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Egresos por categoría</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(summary.byCategory).length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin egresos este mes</p>
              ) : (
                Object.entries(summary.byCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => {
                    const pct = summary.totalExpenses > 0 ? Math.round((amount / summary.totalExpenses) * 100) : 0
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                          <span className="font-medium">${amount.toLocaleString("es-CL")} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })
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
      )}

      {/* Expenses Tab */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <NewExpenseForm />
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
            <NewCoachForm />
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
