export const dynamic = "force-dynamic"

import { requireClubStaffPage } from "@/lib/actions/club-context"
import Link from "next/link"
import { getPaymentMetrics, getAthletesWithOverduePayments } from "@/lib/actions/billing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  ArrowLeft, Calendar, ChevronRight, DollarSign, Users, Target
} from "lucide-react"
import { PaymentMetricsWidget } from "@/components/payments/PaymentMetricsWidget"
import { OverdueAthletesTable } from "@/components/payments/OverdueAthletesTable"

export default async function PaymentsOverviewPage() {
  await requireClubStaffPage()
  const currentMonth = new Date().toISOString().slice(0, 7)
  
  const [metrics, overdueAthletes] = await Promise.all([
    getPaymentMetrics(currentMonth),
    getAthletesWithOverduePayments()
  ])

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

      <PaymentMetricsWidget metrics={metrics} currentMonth={currentMonth} />

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
