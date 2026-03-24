export const dynamic = "force-dynamic"

import Link from "next/link"
import { getPaymentMetrics, getAthletesWithOverduePayments } from "@/lib/actions/billing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, TrendingUp, DollarSign, Clock, AlertTriangle, 
  Users, Target, ArrowUpRight, ArrowDownRight, Minus,
  Calendar, ChevronRight
} from "lucide-react"
import { PaymentMetricsWidget } from "@/components/payments/PaymentMetricsWidget"
import { OverdueAthletesTable } from "@/components/payments/OverdueAthletesTable"

export default async function PaymentsOverviewPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  
  const [metrics, overdueAthletes] = await Promise.all([
    getPaymentMetrics(currentMonth),
    getAthletesWithOverduePayments()
  ])

  const momChange = metrics.monthOverMonthChange
  const momIcon = momChange > 0 ? <ArrowUpRight className="w-4 h-4" /> 
    : momChange < 0 ? <ArrowDownRight className="w-4 h-4" />
    : <Minus className="w-4 h-4" />
  const momColor = momChange > 0 ? "text-green-600" : momChange < 0 ? "text-red-600" : "text-muted-foreground"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/payments">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Resumen Financiero</h1>
            <p className="text-sm text-muted-foreground">
              Métricas de ingresos y gestión de deudas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/payments/new">
            <Button>Registrar Pago</Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Ingresos Reales</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              ${metrics.actualIncome.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.actualIncomeCount} pagos confirmados
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Proyectado</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              ${metrics.projectedIncome.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.projectedIncomeCount} pagos esperados
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">
              ${metrics.totalPending.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.pendingCount} por confirmar
            </p>
          </CardContent>
        </Card>

        <Card className={`${metrics.totalOverdue > 0 ? "border-red-200 bg-red-50/30" : "border-muted"}`}>
          <CardContent className="pt-4 pb-3">
            <div className={`flex items-center gap-2 mb-1 ${metrics.totalOverdue > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium uppercase">Vencidos</span>
            </div>
            <p className={`text-2xl font-bold ${metrics.totalOverdue > 0 ? "text-red-700" : "text-muted-foreground"}`}>
              ${metrics.totalOverdue.toLocaleString('es-CL')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.overdueCount} pagos en mora
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Rate */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tasa de Cobro</span>
              <Badge variant="outline" className="gap-1">
                <Users className="w-3 h-3" />
                {metrics.activeSubscriptionsCount} suscripciones
              </Badge>
            </div>
            <span className="text-sm font-bold">{metrics.collectionRate}%</span>
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
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Ingreso esperado: ${metrics.expectedFromSubscriptions.toLocaleString('es-CL')}</span>
            {metrics.previousMonthActual > 0 && (
              <span className={momColor}>
                {momIcon} {momChange >= 0 ? '+' : ''}{momChange}% vs mes anterior
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overdue Athletes Table */}
      <OverdueAthletesTable athletes={overdueAthletes} />

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/dashboard/payments">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Ver Pagos</p>
                      <p className="text-xs text-muted-foreground">Listado completo</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/subscriptions">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Suscripciones</p>
                      <p className="text-xs text-muted-foreground">Gestión de planes</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/plans">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Planes</p>
                      <p className="text-xs text-muted-foreground">Configurar precios</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
