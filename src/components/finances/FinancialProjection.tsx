'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Calendar, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'

interface ChartData {
  label: string
  income: number
  expenses: number
}

interface Props {
  historicalData: ChartData[]
  currentMonthIncome: number
  currentMonthExpenses: number
  pendingIncome: number
  fixedMonthlyExpenses: number // rent, salaries, etc.
  activeSubscriptions: number
  avgSubscriptionValue: number
}

export function FinancialProjection({
  historicalData,
  currentMonthIncome,
  currentMonthExpenses,
  pendingIncome,
  fixedMonthlyExpenses,
  activeSubscriptions,
  avgSubscriptionValue,
}: Props) {
  const [projectionMonths, setProjectionMonths] = useState(6)

  // Calculate averages from historical data
  const avgMonthlyIncome = useMemo(() => {
    const validMonths = historicalData.filter(m => m.income > 0)
    if (validMonths.length === 0) return currentMonthIncome || avgSubscriptionValue * activeSubscriptions
    return Math.round(validMonths.reduce((s, m) => s + m.income, 0) / validMonths.length)
  }, [historicalData, currentMonthIncome, avgSubscriptionValue, activeSubscriptions])

  const avgMonthlyExpenses = useMemo(() => {
    const validMonths = historicalData.filter(m => m.expenses > 0)
    if (validMonths.length === 0) return currentMonthExpenses || fixedMonthlyExpenses
    return Math.round(validMonths.reduce((s, m) => s + m.expenses, 0) / validMonths.length)
  }, [historicalData, currentMonthExpenses, fixedMonthlyExpenses])

  // Growth rate based on last 3 months trend
  const incomeGrowthRate = useMemo(() => {
    if (historicalData.length < 3) return 0
    const recent = historicalData.slice(-3)
    if (recent[0].income === 0) return 0
    const growth = (recent[2].income - recent[0].income) / recent[0].income
    return Math.min(Math.max(growth / 2, -0.1), 0.1) // Cap at ±10% monthly
  }, [historicalData])

  // Generate projection data
  const projectionData = useMemo(() => {
    const data: { month: string; label: string; income: number; expenses: number; balance: number; cumulative: number }[] = []
    let cumulative = 0
    const now = new Date()

    for (let i = 1; i <= projectionMonths; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthLabel = futureDate.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
      
      // Project income with growth rate
      const projectedIncome = Math.round(avgMonthlyIncome * Math.pow(1 + incomeGrowthRate, i))
      
      // Expenses tend to be more stable, slight increase for inflation (~0.5% monthly)
      const projectedExpenses = Math.round(avgMonthlyExpenses * Math.pow(1.005, i))
      
      const balance = projectedIncome - projectedExpenses
      cumulative += balance

      data.push({
        month: `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`,
        label: monthLabel,
        income: projectedIncome,
        expenses: projectedExpenses,
        balance,
        cumulative,
      })
    }

    return data
  }, [projectionMonths, avgMonthlyIncome, avgMonthlyExpenses, incomeGrowthRate])

  // Summary metrics
  const totalProjectedIncome = projectionData.reduce((s, m) => s + m.income, 0)
  const totalProjectedExpenses = projectionData.reduce((s, m) => s + m.expenses, 0)
  const totalProjectedBalance = totalProjectedIncome - totalProjectedExpenses
  const avgMonthlyBalance = Math.round(totalProjectedBalance / projectionMonths)

  // Risk assessment
  const riskLevel = useMemo(() => {
    const negativeMonths = projectionData.filter(m => m.balance < 0).length
    const ratio = avgMonthlyIncome / avgMonthlyExpenses
    
    if (ratio < 1 || negativeMonths > projectionMonths / 2) return 'high'
    if (ratio < 1.2 || negativeMonths > 2) return 'medium'
    return 'low'
  }, [projectionData, avgMonthlyIncome, avgMonthlyExpenses, projectionMonths])

  const chartMax = Math.max(...projectionData.flatMap(m => [m.income, m.expenses]), 1)

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Proyectar:</span>
        <div className="flex gap-1">
          {[3, 6, 12].map(months => (
            <button
              key={months}
              onClick={() => setProjectionMonths(months)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                projectionMonths === months
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              }`}
            >
              {months} meses
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Proyectados</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalProjectedIncome.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">
              ~${Math.round(totalProjectedIncome / projectionMonths).toLocaleString('es-CL')}/mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Egresos Proyectados</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${totalProjectedExpenses.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">
              ~${Math.round(totalProjectedExpenses / projectionMonths).toLocaleString('es-CL')}/mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance Proyectado</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProjectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalProjectedBalance.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">
              {avgMonthlyBalance >= 0 ? '+' : ''}{avgMonthlyBalance.toLocaleString('es-CL')}/mes promedio
            </p>
          </CardContent>
        </Card>

        <Card className={
          riskLevel === 'high' ? 'border-red-200 bg-red-50' :
          riskLevel === 'medium' ? 'border-yellow-200 bg-yellow-50' :
          'border-green-200 bg-green-50'
        }>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Nivel de Riesgo</CardTitle>
            {riskLevel === 'high' ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
             riskLevel === 'medium' ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
             <CheckCircle className="h-4 w-4 text-green-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              riskLevel === 'high' ? 'text-red-600' :
              riskLevel === 'medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {riskLevel === 'high' ? 'Alto' : riskLevel === 'medium' ? 'Medio' : 'Bajo'}
            </div>
            <p className="text-xs text-muted-foreground">
              {riskLevel === 'high' ? 'Revisar gastos urgente' :
               riskLevel === 'medium' ? 'Monitorear de cerca' :
               'Finanzas saludables'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Proyección {projectionMonths} Meses
            </span>
            <div className="flex items-center gap-4 text-xs font-normal text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-500/70 inline-block" />Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-400/70 inline-block" />Egresos
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {projectionData.map((m, i) => {
              const incomePct = Math.max((m.income / chartMax) * 100, 3)
              const expensesPct = Math.max((m.expenses / chartMax) * 100, 3)
              const isPositive = m.balance >= 0

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                    <div
                      className="w-5/12 rounded-t-sm bg-green-500/70 border border-green-600/30"
                      style={{ height: `${incomePct}%` }}
                      title={`Ingresos ${m.label}: $${m.income.toLocaleString('es-CL')}`}
                    />
                    <div
                      className="w-5/12 rounded-t-sm bg-red-400/70 border border-red-500/30"
                      style={{ height: `${expensesPct}%` }}
                      title={`Egresos ${m.label}: $${m.expenses.toLocaleString('es-CL')}`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{Math.round(m.balance / 1000)}k
                  </span>
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Breakdown Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle Mensual Proyectado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Mes</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Ingresos</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Egresos</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Balance</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {projectionData.map(m => (
                  <tr key={m.month} className="border-b last:border-0">
                    <td className="py-2 font-medium">{m.label}</td>
                    <td className="py-2 text-right text-green-600">${m.income.toLocaleString('es-CL')}</td>
                    <td className="py-2 text-right text-red-600">${m.expenses.toLocaleString('es-CL')}</td>
                    <td className={`py-2 text-right font-medium ${m.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.balance >= 0 ? '+' : ''}{m.balance.toLocaleString('es-CL')}
                    </td>
                    <td className={`py-2 text-right ${m.cumulative >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${m.cumulative.toLocaleString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right text-green-600">${totalProjectedIncome.toLocaleString('es-CL')}</td>
                  <td className="py-2 text-right text-red-600">${totalProjectedExpenses.toLocaleString('es-CL')}</td>
                  <td className={`py-2 text-right ${totalProjectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalProjectedBalance >= 0 ? '+' : ''}{totalProjectedBalance.toLocaleString('es-CL')}
                  </td>
                  <td className="py-2 text-right">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Assumptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-muted-foreground">Supuestos de la Proyección</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Ingreso mensual base</p>
              <p className="font-semibold">${avgMonthlyIncome.toLocaleString('es-CL')}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Egreso mensual base</p>
              <p className="font-semibold">${avgMonthlyExpenses.toLocaleString('es-CL')}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Tendencia de ingresos</p>
              <p className={`font-semibold ${incomeGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {incomeGrowthRate >= 0 ? '+' : ''}{(incomeGrowthRate * 100).toFixed(1)}% mensual
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-xs">Suscripciones activas</p>
              <p className="font-semibold">{activeSubscriptions} × ${avgSubscriptionValue.toLocaleString('es-CL')}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            * Proyección basada en datos históricos de los últimos 6 meses. Los valores reales pueden variar.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
