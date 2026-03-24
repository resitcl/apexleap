'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle, 
  Users, Target, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react"

interface PaymentMetrics {
  actualIncome: number
  actualIncomeCount: number
  projectedIncome: number
  projectedIncomeCount: number
  expectedFromSubscriptions: number
  activeSubscriptionsCount: number
  totalOverdue: number
  overdueCount: number
  overdueOlderThan30Days: number
  overdueOlderThan60Days: number
  totalPending: number
  pendingCount: number
  collectionRate: number
  previousMonthActual: number
  monthOverMonthChange: number
}

interface Props {
  metrics: PaymentMetrics
  currentMonth?: string
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`
}

export function PaymentMetricsWidget({ metrics, currentMonth }: Props) {
  const monthLabel = currentMonth 
    ? new Date(currentMonth + '-01').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  const momChange = metrics.monthOverMonthChange
  const momIcon = momChange > 0 ? <ArrowUpRight className="w-4 h-4" /> 
    : momChange < 0 ? <ArrowDownRight className="w-4 h-4" />
    : <Minus className="w-4 h-4" />
  const momColor = momChange > 0 ? "text-green-600" : momChange < 0 ? "text-red-600" : "text-muted-foreground"

  return (
    <div className="space-y-4">
      {/* Header with month */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">Métricas de {monthLabel}</h3>
        <Badge variant="outline" className="gap-1">
          <Users className="w-3 h-3" />
          {metrics.activeSubscriptionsCount} suscripciones activas
        </Badge>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Actual Income */}
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Ingresos Reales</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(metrics.actualIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.actualIncomeCount} pagos confirmados
            </p>
            {metrics.previousMonthActual > 0 && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${momColor}`}>
                {momIcon}
                <span>{momChange >= 0 ? '+' : ''}{momChange}% vs mes anterior</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projected Income */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Proyectado</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(metrics.projectedIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.projectedIncomeCount} pagos esperados
            </p>
            <div className="flex items-center gap-1 text-xs mt-1 text-blue-600">
              <TrendingUp className="w-3 h-3" />
              <span>{metrics.collectionRate}% tasa de cobro</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{formatCurrency(metrics.totalPending)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.pendingCount} pagos por confirmar
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className={`${metrics.totalOverdue > 0 ? "border-red-200 bg-red-50/30" : "border-muted"}`}>
          <CardContent className="pt-4 pb-3">
            <div className={`flex items-center gap-2 mb-1 ${metrics.totalOverdue > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Vencidos</span>
            </div>
            <p className={`text-2xl font-bold ${metrics.totalOverdue > 0 ? "text-red-700" : "text-muted-foreground"}`}>
              {formatCurrency(metrics.totalOverdue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.overdueCount} pagos vencidos
            </p>
            {metrics.overdueOlderThan30Days > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {formatCurrency(metrics.overdueOlderThan30Days)} &gt;30 días
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expected from subscriptions */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Ingreso esperado si todos pagan:</span>
            </div>
            <span className="font-bold">{formatCurrency(metrics.expectedFromSubscriptions)}</span>
          </div>
          {metrics.projectedIncome > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progreso de cobro</span>
                <span>{metrics.collectionRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    metrics.collectionRate >= 80 ? 'bg-green-500' : 
                    metrics.collectionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, metrics.collectionRate)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
