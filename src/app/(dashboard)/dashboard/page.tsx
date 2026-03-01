import Link from "next/link"
import { getDashboardSummary } from "@/lib/actions/dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, ClipboardCheck, AlertCircle, UserPlus } from "lucide-react"

export default async function DashboardPage() {
  let summary = {
    totalAthletes: 0,
    mrr: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    todayCheckIns: 0,
    semaforoCount: { green: 0, yellow: 0, red: 0 },
  }

  try {
    summary = await getDashboardSummary()
  } catch {
    // No club set up yet — show zeros
  }

  const total = summary.semaforoCount.green + summary.semaforoCount.yellow + summary.semaforoCount.red
  const greenPct  = total ? Math.round((summary.semaforoCount.green  / total) * 100) : 0
  const yellowPct = total ? Math.round((summary.semaforoCount.yellow / total) * 100) : 0
  const redPct    = total ? Math.round((summary.semaforoCount.red    / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/dashboard/athletes/new">
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" />
            Nuevo Alumno
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalAthletes}</div>
            <p className="text-xs text-muted-foreground">registrados en el club</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recaudado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.mrr.toLocaleString("es-CL")}
            </div>
            <p className="text-xs text-muted-foreground">pagos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins Hoy</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todayCheckIns}</div>
            <p className="text-xs text-muted-foreground">asistencias válidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cuentas por Cobrar</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${summary.overdueAmount.toLocaleString("es-CL")}
            </div>
            <p className="text-xs text-muted-foreground">deudas vencidas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Semáforo de Disponibilidad */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Semáforo de Disponibilidad</CardTitle>
            <CardDescription>Elegibilidad para entrenar y competir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {total === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin atletas registrados aún</p>
                <Link href="/dashboard/athletes/new" className="mt-2 inline-block">
                  <Button size="sm" variant="outline" className="mt-2">Agregar Alumno</Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Bar */}
                <div className="flex rounded-full overflow-hidden h-4">
                  {greenPct  > 0 && <div className="bg-green-500  transition-all" style={{ width: `${greenPct}%`  }} />}
                  {yellowPct > 0 && <div className="bg-yellow-500 transition-all" style={{ width: `${yellowPct}%` }} />}
                  {redPct    > 0 && <div className="bg-red-500    transition-all" style={{ width: `${redPct}%`    }} />}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-2xl font-bold text-green-700">{summary.semaforoCount.green}</span>
                    <span className="text-xs text-green-600 font-medium">🟢 Aptos</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <span className="text-2xl font-bold text-yellow-700">{summary.semaforoCount.yellow}</span>
                    <span className="text-xs text-yellow-600 font-medium">🟡 Observación</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="text-2xl font-bold text-red-700">{summary.semaforoCount.red}</span>
                    <span className="text-xs text-red-600 font-medium">🔴 Bloqueados</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Atajos frecuentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: "/dashboard/athletes/new",  label: "Nuevo Alumno",   icon: "👤" },
              { href: "/dashboard/payments/new",  label: "Registrar Pago", icon: "💳" },
              { href: "/dashboard/attendance",    label: "Ver Asistencia", icon: "📋" },
              { href: "/dashboard/plans/new",     label: "Crear Plan",     icon: "📦" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pending payments alert */}
      {summary.pendingAmount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                <p className="text-sm font-medium text-yellow-800">
                  Tienes <strong>${summary.pendingAmount.toLocaleString("es-CL")}</strong> en pagos pendientes de cobrar
                </p>
              </div>
              <Link href="/dashboard/payments?status=pending">
                <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 shrink-0">
                  Ver pagos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
