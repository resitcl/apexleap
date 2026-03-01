export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { getDashboardSummary, getRecentActivity, getMonthlyRevenue, getTodaySessions, getOverdueAlerts } from "@/lib/actions/dashboard"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, ClipboardCheck, AlertCircle, UserPlus, CreditCard, QrCode, UserCheck } from "lucide-react"

export default async function DashboardPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let summary = {
    totalAthletes: 0,
    mrr: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    todayCheckIns: 0,
    semaforoCount: { green: 0, yellow: 0, red: 0 },
  }
  let activity: Awaited<ReturnType<typeof getRecentActivity>> = []
  let monthlyRevenue: Awaited<ReturnType<typeof getMonthlyRevenue>> = []
  let todaySessions: Awaited<ReturnType<typeof getTodaySessions>> = []
  let overdueAlerts: Awaited<ReturnType<typeof getOverdueAlerts>> = []

  try {
    ;[summary, activity, monthlyRevenue, todaySessions, overdueAlerts] = await Promise.all([
      getDashboardSummary(),
      getRecentActivity(12),
      getMonthlyRevenue(6),
      getTodaySessions(),
      getOverdueAlerts(),
    ])
  } catch {
    // show zeros on error
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
            <p className="text-xs text-muted-foreground">
              asistencias válidas
              {todaySessions.length > 0 && (
                <span className="ml-1 text-blue-600">· {todaySessions.length} sesión{todaySessions.length !== 1 ? 'es' : ''} hoy</span>
              )}
            </p>
            {todaySessions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {todaySessions.slice(0, 3).map((s) => (
                  <Link key={s.id} href={`/dashboard/calendar/${s.id}`}>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium hover:bg-blue-100 transition-colors">
                      {s.start_time.slice(0, 5)} {s.name}
                    </span>
                  </Link>
                ))}
                {todaySessions.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{todaySessions.length - 3} más</span>
                )}
              </div>
            )}
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
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/dashboard/athletes/new",       label: "Nuevo Alumno",      icon: "👤", color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
                { href: "/dashboard/payments/new",       label: "Registrar Pago",    icon: "💳", color: "bg-green-50 hover:bg-green-100 text-green-700" },
                { href: "/dashboard/attendance?tab=today", label: "Check-in Manual", icon: "📋", color: "bg-purple-50 hover:bg-purple-100 text-purple-700" },
                { href: "/dashboard/documents/new",      label: "Subir Documento",   icon: "📄", color: "bg-orange-50 hover:bg-orange-100 text-orange-700" },
                { href: "/dashboard/competitions/new",   label: "Nueva Competencia", icon: "🏆", color: "bg-yellow-50 hover:bg-yellow-100 text-yellow-700" },
                { href: "/dashboard/calendar/new",       label: "Nueva Sesión",      icon: "�", color: "bg-pink-50 hover:bg-pink-100 text-pink-700" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={`flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors cursor-pointer text-center ${item.color}`}>
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alerts */}
      {overdueAlerts.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Pagos morosos &gt;7 días ({overdueAlerts.length})
            </CardTitle>
            <CardDescription>Alumnos con deudas vencidas que requieren gestión</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueAlerts.map((alert) => {
              const daysPast = Math.floor((Date.now() - new Date(alert.due_date).getTime()) / 86400000)
              return (
                <div key={alert.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    {alert.athletes && (
                      <Link href={`/dashboard/athletes/${alert.athletes.id}`}
                        className="font-medium hover:underline">
                        {alert.athletes.name}
                      </Link>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{alert.concept}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-destructive font-semibold">${Number(alert.amount).toLocaleString('es-CL')}</span>
                    <Badge variant="destructive" className="text-xs">{daysPast}d vencido</Badge>
                  </div>
                </div>
              )
            })}
            <div className="pt-1">
              <Link href="/dashboard/payments?status=overdue"
                className="text-xs text-destructive hover:underline">Ver todos los pagos vencidos →</Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimos pagos, check-ins y alumnos</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Sin actividad reciente
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.map((item) => {
                const Icon =
                  item.type === 'payment' ? CreditCard :
                  item.type === 'checkin' ? QrCode : UserCheck

                const iconColor =
                  item.type === 'payment' ? 'text-green-500 bg-green-50' :
                  item.type === 'checkin' ? 'text-blue-500 bg-blue-50' :
                  'text-purple-500 bg-purple-50'

                const timeAgo = (() => {
                  const diff = Date.now() - new Date(item.time).getTime()
                  const mins = Math.floor(diff / 60000)
                  const hrs  = Math.floor(diff / 3600000)
                  const days = Math.floor(diff / 86400000)
                  if (mins < 60) return `hace ${mins}m`
                  if (hrs  < 24) return `hace ${hrs}h`
                  return `hace ${days}d`
                })()

                return (
                  <div key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && item.type === 'payment' && (
                        <Badge variant={
                          item.badge === 'paid'    ? 'default' :
                          item.badge === 'pending' ? 'secondary' : 'destructive'
                        } className="text-xs">
                          {item.badge === 'paid' ? 'Pagado' : item.badge === 'pending' ? 'Pendiente' : 'Moroso'}
                        </Badge>
                      )}
                      {item.type === 'checkin' && (
                        <Badge variant={item.badge === 'valid' ? 'default' : 'secondary'} className="text-xs">
                          {item.badge === 'valid' ? '✓ Válido' : '✗ Inválido'}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground w-14 text-right">{timeAgo}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Revenue Chart */}
      {monthlyRevenue.length > 0 && (() => {
        const maxAmount = Math.max(...monthlyRevenue.map((m) => m.amount), 1)
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Ingresos Últimos 6 Meses</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Total: ${monthlyRevenue.reduce((s, m) => s + m.amount, 0).toLocaleString("es-CL")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-28">
                {monthlyRevenue.map((m, i) => {
                  const pct = maxAmount > 0 ? Math.max((m.amount / maxAmount) * 100, 2) : 2
                  const isCurrentMonth = i === monthlyRevenue.length - 1
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        {m.amount > 0 ? `$${Math.round(m.amount / 1000)}k` : ''}
                      </span>
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          isCurrentMonth ? 'bg-primary' : 'bg-primary/30'
                        }`}
                        style={{ height: `${pct}%` }}
                        title={`${m.label}: $${m.amount.toLocaleString('es-CL')}`}
                      />
                      <span className={`text-xs capitalize ${
                        isCurrentMonth ? 'text-primary font-semibold' : 'text-muted-foreground'
                      }`}>{m.label}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })()}

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
