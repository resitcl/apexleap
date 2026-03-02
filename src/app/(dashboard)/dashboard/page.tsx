export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { getDashboardSummary, getRecentActivity, getMonthlyRevenue, getTodaySessions, getOverdueAlerts, getUpcomingSchedules, getExpiringSubscriptions, getWeeklyAttendanceRate, getExpiredDocuments, getAthletesWithoutPlan, getWeeklyAttendanceByDay, getMonthlyRetentionRate } from "@/lib/actions/dashboard"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getCompetitions } from "@/lib/actions/competitions"
import { getCoaches } from "@/lib/actions/finances"
import { getInventoryItems } from "@/lib/actions/inventory"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, ClipboardCheck, AlertCircle, UserPlus, CreditCard, QrCode, UserCheck, TrendingUp, FileWarning, Clock } from "lucide-react"

export default async function DashboardPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let summary = {
    totalAthletes: 0,
    mrr: 0,
    monthlyIncome: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    todayCheckIns: 0,
    semaforoCount: { green: 0, yellow: 0, red: 0 },
    topAthletes: [] as { id: string; name: string; count: number }[],
    activeSubscriptions: 0,
    topDebtors: [] as { id: string; name: string; debt: number }[],
    totalAllAthletes: 0,
  }
  let activity: Awaited<ReturnType<typeof getRecentActivity>> = []
  let monthlyRevenue: Awaited<ReturnType<typeof getMonthlyRevenue>> = []
  let todaySessions: Awaited<ReturnType<typeof getTodaySessions>> = []
  let overdueAlerts: Awaited<ReturnType<typeof getOverdueAlerts>> = []
  let upcomingSchedules: Awaited<ReturnType<typeof getUpcomingSchedules>> = []
  let expiringSubscriptions: Awaited<ReturnType<typeof getExpiringSubscriptions>> = []
  let weeklyAttendance = { total: 0, valid: 0, rate: 0 }
  let weeklyByDay: Awaited<ReturnType<typeof getWeeklyAttendanceByDay>> = []
  let expiredDocs: Awaited<ReturnType<typeof getExpiredDocuments>> = []
  let athletesWithoutPlan = 0
  let retention: Awaited<ReturnType<typeof getMonthlyRetentionRate>> = null
  let upcomingComps: { id: string; name: string; type: string; start_date: string; location: string | null }[] = []
  let brokenItems: { id: string; name: string }[] = []
  let coaches: { id: string; name: string }[] = []

  try {
    ;[summary, activity, monthlyRevenue, todaySessions, overdueAlerts, upcomingSchedules, expiringSubscriptions, weeklyAttendance, weeklyByDay, expiredDocs, athletesWithoutPlan, retention, coaches] = await Promise.all([
      getDashboardSummary(),
      getRecentActivity(12),
      getMonthlyRevenue(6),
      getTodaySessions(),
      getOverdueAlerts(),
      getUpcomingSchedules(),
      getExpiringSubscriptions(),
      getWeeklyAttendanceRate(),
      getWeeklyAttendanceByDay(),
      getExpiredDocuments(),
      getAthletesWithoutPlan(),
      getMonthlyRetentionRate(),
      getCoaches(),
    ])
    const compResult = await getCompetitions({ status: 'upcoming', limit: 5 })
    upcomingComps = compResult.competitions.map((c) => ({
      id: c.id, name: c.name, type: c.type, start_date: c.start_date, location: c.location ?? null,
    }))
    const invResult = await getInventoryItems({ condition: 'broken', limit: 100 })
    brokenItems = (invResult.items ?? []).map((i) => ({ id: i.id, name: i.name }))
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
            {activity.length > 0 && (() => {
              const last = activity[0]
              return (
                <span className="ml-2 text-sm">
                  · última actividad: <span className="font-medium">{last.label}</span>
                  <span className="text-muted-foreground/70 ml-1">({new Date(last.time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })})</span>
                </span>
              )
            })()}
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
            <p className="text-xs text-muted-foreground">
              {summary.totalAllAthletes > 0 && (
                <span className="font-medium text-foreground">
                  {Math.round((summary.totalAthletes / summary.totalAllAthletes) * 100)}% activos
                </span>
              )}
              {summary.activeSubscriptions > 0 && (
                <span className="ml-1.5 text-green-600 font-medium">· {summary.activeSubscriptions} con plan</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Link href={`/dashboard/finances?tab=overview&month=${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${summary.monthlyIncome.toLocaleString("es-CL")}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
              </p>
            </CardContent>
          </Card>
        </Link>

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
                {todaySessions.slice(0, 3).map((s) => {
                  const occ = s.capacity && s.capacity > 0
                    ? Math.round((s.todayCheckIns / s.capacity) * 100)
                    : null
                  return (
                    <Link key={s.id} href={`/dashboard/calendar/${s.id}`}>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium hover:bg-blue-100 transition-colors">
                        {s.start_time.slice(0, 5)} {s.name}
                        {s.todayCheckIns > 0 && (
                          <span className="ml-1 opacity-75">
                            {s.todayCheckIns}{s.capacity ? `/${s.capacity}` : ''}{occ !== null ? ` (${occ}%)` : ''}
                          </span>
                        )}
                      </span>
                    </Link>
                  )
                })}
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

      {/* Attendance KPI */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/dashboard/attendance?tab=history">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Asistencia 7 días</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                weeklyAttendance.rate >= 80 ? 'text-green-600' :
                weeklyAttendance.rate >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>{weeklyAttendance.rate}%</div>
              <p className="text-xs text-muted-foreground">{weeklyAttendance.valid} válidos de {weeklyAttendance.total} check-ins</p>
            </CardContent>
          </Card>
        </Link>
        {upcomingSchedules.length > 0 && (() => {
          const totalWeekly = upcomingSchedules.reduce((s, d) => s + d.sessions.length, 0)
          if (totalWeekly === 0) return null
          return (
            <Link href="/dashboard/calendar">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Sesiones Activas</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalWeekly}</div>
                  <p className="text-xs text-muted-foreground">en los próximos 7 días</p>
                </CardContent>
              </Card>
            </Link>
          )
        })()}
        {weeklyByDay.length > 1 && (() => {
          const todayISO = new Date().toISOString().split('T')[0]
          const todayData = weeklyByDay.find((d) => d.date === todayISO)
          const pastDays  = weeklyByDay.filter((d) => d.date < todayISO && d.total > 0)
          if (!todayData || pastDays.length === 0) return null
          const avg = Math.round(pastDays.reduce((s, d) => s + d.total, 0) / pastDays.length)
          const diff = todayData.total - avg
          const color = diff >= 0 ? 'text-green-600' : 'text-yellow-600'
          return (
            <Link href="/dashboard/attendance">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins Hoy</CardTitle>
                  <QrCode className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayData.total}</div>
                  <p className={`text-xs font-medium ${color}`}>
                    {diff >= 0 ? '+' : ''}{diff} vs prom. semanal ({avg}/día)
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })()}
        <Link href="/dashboard/payments?status=overdue">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Morosos</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{overdueAlerts.length}</div>
              <p className="text-xs text-muted-foreground">pagos vencidos pendientes</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/athletes?health=injured">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Semáforos Rojos</CardTitle>
              <UserCheck className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.semaforoCount.red}</div>
              <p className="text-xs text-muted-foreground">atletas bloqueados</p>
            </CardContent>
          </Card>
        </Link>
        {retention !== null && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Retención Mensual</CardTitle>
              <TrendingUp className="h-4 w-4 text-teal-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                retention.rate >= 80 ? 'text-green-600' :
                retention.rate >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>{retention.rate}%</div>
              <p className="text-xs text-muted-foreground">{retention.retained}/{retention.total} atletas del mes anterior</p>
            </CardContent>
          </Card>
        )}
        {athletesWithoutPlan > 0 && (
          <Link href="/dashboard/subscriptions">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sin Plan</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{athletesWithoutPlan}</div>
                <p className="text-xs text-muted-foreground">activos sin suscripción</p>
              </CardContent>
            </Card>
          </Link>
        )}
        {summary.monthlyIncome + summary.overdueAmount > 0 && (() => {
          const base = summary.monthlyIncome + summary.overdueAmount
          const rate = Math.round((summary.monthlyIncome / base) * 100)
          return (
            <Link href="/dashboard/payments">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Cobranza</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{rate}%</div>
                  <p className="text-xs text-muted-foreground">cobrado / esperado este mes</p>
                </CardContent>
              </Card>
            </Link>
          )
        })()}
        {(() => {
          const withCap = todaySessions.filter((s) => s.capacity && s.capacity > 0)
          if (withCap.length === 0) return null
          const avgPct = Math.round(
            withCap.reduce((sum, s) => sum + (s.todayCheckIns / s.capacity!) * 100, 0) / withCap.length
          )
          return (
            <Link href="/dashboard/calendar">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ocupación Hoy</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${avgPct >= 80 ? 'text-red-600' : avgPct >= 50 ? 'text-yellow-600' : 'text-green-600'}`}>{avgPct}%</div>
                  <p className="text-xs text-muted-foreground">promedio {withCap.length} sesión{withCap.length !== 1 ? 'es' : ''}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })()}
        {summary.totalAthletes > 0 && summary.monthlyIncome > 0 && (
          <Link href="/dashboard/payments">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pago Prom./Atleta</CardTitle>
                <CreditCard className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  ${Math.round(summary.monthlyIncome / summary.totalAthletes).toLocaleString('es-CL')}
                </div>
                <p className="text-xs text-muted-foreground">ingreso mensual ÷ activos</p>
              </CardContent>
            </Card>
          </Link>
        )}
        {expiredDocs.length > 0 && (() => {
          const in7 = new Date(); in7.setDate(in7.getDate() + 7)
          const in7ISO = in7.toISOString().split('T')[0]
          const today = new Date().toISOString().split('T')[0]
          const expiredCount = expiredDocs.filter((d) => d.isExpired).length
          const thisWeek = expiredDocs.filter((d) => !d.isExpired && d.expiry_date >= today && d.expiry_date <= in7ISO).length
          const later = expiredDocs.filter((d) => !d.isExpired && d.expiry_date > in7ISO).length
          return (
            <Link href="/dashboard/documents">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Docs Vencidos</CardTitle>
                  <FileWarning className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{expiredCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {thisWeek > 0 && <span className="text-orange-600 font-medium">+{thisWeek} esta semana</span>}
                    {thisWeek > 0 && later > 0 && ' · '}
                    {later > 0 && `+${later} este mes`}
                    {thisWeek === 0 && later === 0 && 'documentos vencidos'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })()}
      </div>

      {/* Weekly attendance bar chart */}
      {weeklyByDay.some((d) => d.total > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Asistencia Últimos 7 Días
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const maxVal = Math.max(...weeklyByDay.map((d) => d.total), 1)
              return (
                <div className="flex items-end gap-2 h-24">
                  {weeklyByDay.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-muted-foreground font-medium">{d.total > 0 ? d.total : ''}</span>
                      <div className="w-full relative rounded-t overflow-hidden bg-muted" style={{ height: `${Math.max((d.total / maxVal) * 64, d.total > 0 ? 8 : 2)}px` }}>
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-primary/80 rounded-t"
                          style={{ height: `${d.total > 0 ? Math.round((d.valid / d.total) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{d.label}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
            <p className="text-xs text-muted-foreground mt-2">Barras azules = check-ins válidos · gris = total</p>
          </CardContent>
        </Card>
      )}

      {overdueAlerts.length > 3 && (
        <Link href="/dashboard/payments?status=overdue">
          <Card className="border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                <p className="text-sm text-orange-800 font-medium">
                  {overdueAlerts.length} pagos vencidos sin gestionar — revisión recomendada
                  {overdueAlerts.length <= 5 && (
                    <span className="ml-1 font-normal">
                      ({overdueAlerts.slice(0, 3).map((a) => (a as { name?: string }).name ?? '').filter(Boolean).join(', ')}{overdueAlerts.length > 3 ? '...' : ''})
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {summary.totalAthletes > 4 && weeklyByDay.length > 0 && (() => {
        const weekTotal = weeklyByDay.reduce((s, d) => s + d.total, 0)
        if (weekTotal > 0) return null
        return (
          <Link href="/dashboard/attendance">
            <Card className="border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800 font-medium">
                    Sin check-ins registrados esta semana ({summary.totalAthletes} atletas activos)
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {summary.totalAthletes > 4 && summary.activeSubscriptions < summary.totalAthletes * 0.5 && (
        <Link href="/dashboard/subscriptions">
          <Card className="border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                <p className="text-sm text-yellow-800 font-medium">
                  Solo {summary.activeSubscriptions} de {summary.totalAthletes} atletas activos tienen suscripción ({Math.round((summary.activeSubscriptions / summary.totalAthletes) * 100)}%)
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {coaches.length > 0 && todaySessions.length === 0 && (
        <Link href="/dashboard/finances">
          <Card className="border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-600 shrink-0" />
                <p className="text-sm text-purple-800 font-medium">
                  {coaches.length} coach{coaches.length !== 1 ? 'es' : ''} sin sesiones asignadas hoy
                  {coaches.length <= 3 && <span className="ml-1 font-normal">— {coaches.map((c) => c.name).join(', ')}</span>}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {summary.mrr > 0 && summary.monthlyIncome < summary.mrr * 0.7 && (
        <Link href="/dashboard/finances">
          <Card className="border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-orange-600 shrink-0" />
                <p className="text-sm text-orange-800 font-medium">
                  Ingresos del mes (${summary.monthlyIncome.toLocaleString('es-CL')}) por debajo del MRR esperado (${Math.round(summary.mrr).toLocaleString('es-CL')})
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {summary.totalAthletes > 0 && todaySessions.length === 0 && (
        <Link href="/dashboard/calendar">
          <Card className="border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800 font-medium">
                  No hay sesiones programadas para hoy — ¿falta configurar el horario?
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {monthlyRevenue.length >= 2 && (() => {
        const cur  = monthlyRevenue[monthlyRevenue.length - 1]
        const prev = monthlyRevenue[monthlyRevenue.length - 2]
        if (!cur || !prev || prev.amount === 0 || cur.amount >= prev.amount) return null
        const drop = Math.round(((prev.amount - cur.amount) / prev.amount) * 100)
        return (
          <Link href={`/dashboard/finances`}>
            <Card className="border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-yellow-600 shrink-0 rotate-180" />
                  <p className="text-sm text-yellow-800 font-medium">
                    Ingresos bajaron {drop}% vs {prev.month} — ${cur.amount.toLocaleString('es-CL')} vs ${prev.amount.toLocaleString('es-CL')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {summary.semaforoCount.red > 0 && (
        <Link href="/dashboard/athletes?health=injured">
          <Card className="border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-800 font-medium">
                  {summary.semaforoCount.red} atleta{summary.semaforoCount.red !== 1 ? 's' : ''} con semáforo rojo — revisar lesiones y bloqueos
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {summary.semaforoCount.yellow > 3 && (
        <Link href="/dashboard/athletes?health=observation">
          <Card className="border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
                <p className="text-sm text-yellow-800 font-medium">
                  🟡 {summary.semaforoCount.yellow} atletas en observación — seguimiento recomendado
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {summary.topDebtors.length > 0 && (
        <Link href="/dashboard/payments?status=overdue">
          <Card className="border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800">Top deudores</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {summary.topDebtors.map((d) => (
                      <span key={d.id} className="text-xs text-red-700">
                        {d.name}: <span className="font-bold">${d.debt.toLocaleString('es-CL')}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {(() => {
        const withCap = todaySessions.filter((s) => s.capacity && s.capacity > 0)
        const lowOcc = withCap
          .map((s) => ({ ...s, pct: Math.round((s.todayCheckIns / s.capacity!) * 100) }))
          .filter((s) => s.pct < 50)
          .sort((a, b) => a.pct - b.pct)
          .slice(0, 3)
        if (lowOcc.length === 0) return null
        return (
          <Link href="/dashboard/calendar">
            <Card className="border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-800">Sesiones con baja ocupación hoy</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {lowOcc.map((s) => (
                        <span key={s.id} className="text-xs text-blue-700">
                          {s.name} {s.start_time.slice(0,5)}: <span className="font-bold">{s.pct}%</span> ({s.todayCheckIns}/{s.capacity})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {todaySessions.length === 0 && (
        <Link href="/dashboard/calendar">
          <Card className="border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-5 h-5 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-800 font-medium">
                  No hay sesiones programadas para hoy — ¿querés agregar una?
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {expiredDocs.length > 0 && (
        <Link href="/dashboard/documents">
          <Card className="border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <FileWarning className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-800">
                    {expiredDocs.filter((d) => d.isExpired).length > 0 && (
                      <span>{expiredDocs.filter((d) => d.isExpired).length} documento{expiredDocs.filter((d) => d.isExpired).length > 1 ? 's' : ''} vencido{expiredDocs.filter((d) => d.isExpired).length > 1 ? 's' : ''}</span>
                    )}
                    {expiredDocs.filter((d) => d.isExpired).length > 0 && expiredDocs.filter((d) => !d.isExpired).length > 0 && ' · '}
                    {expiredDocs.filter((d) => !d.isExpired).length > 0 && (
                      <span>{expiredDocs.filter((d) => !d.isExpired).length} vence{expiredDocs.filter((d) => !d.isExpired).length === 1 ? '' : 'n'} en 30 días</span>
                    )}
                  </p>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    {expiredDocs.slice(0, 3).map((d) => `${d.name}${d.athletes ? ` (${d.athletes.name})` : ''}`).join(' · ')}
                    {expiredDocs.length > 3 && ` +${expiredDocs.length - 3} más`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

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

      {/* Top athletes by attendance this month */}
      {summary.topAthletes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              🏅 Top Asistencias del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.topAthletes.map((ath, i) => {
                const HEALTH = (ath as { health_status?: string }).health_status
                const healthBadge = HEALTH === 'injured' ? '🔴' : HEALTH === 'observation' ? '🟡' : null
                return (
                  <div key={ath.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <Link href={`/dashboard/athletes/${ath.id}`} className="font-medium hover:underline">{ath.name}</Link>
                      {healthBadge && <span title={HEALTH}>{healthBadge}</span>}
                    </div>
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {ath.count} check-ins
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Latest today check-ins widget */}
      {(() => {
        const todayStr = new Date().toISOString().split('T')[0]
        const todayCheckIns = activity
          .filter((a) => a.type === 'checkin' && a.time.startsWith(todayStr))
          .slice(0, 5)
        if (todayCheckIns.length === 0) return null
        return (
          <Link href="/dashboard/calendar">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2 pt-4 px-6">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  Últimos check-ins de hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-6 space-y-1">
                {todayCheckIns.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-muted-foreground">{c.sublabel} · {new Date(c.time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Link>
        )
      })()}

      {/* Top debtors widget */}
      {overdueAlerts.length > 0 && (() => {
        const byAthlete: Record<string, { name: string; id: string; debt: number }> = {}
        for (const a of overdueAlerts) {
          const athlete = a.athletes
          if (!athlete) continue
          if (!byAthlete[athlete.id]) byAthlete[athlete.id] = { id: athlete.id, name: athlete.name, debt: 0 }
          byAthlete[athlete.id].debt += Number(a.amount)
        }
        const top3 = Object.values(byAthlete).sort((a, b) => b.debt - a.debt).slice(0, 3)
        if (top3.length === 0) return null
        return (
          <Card>
            <CardHeader className="pb-2 pt-4 px-6">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                Top deudores
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-6 space-y-1">
              {top3.map((d) => (
                <Link key={d.id} href={`/dashboard/athletes/${d.id}`} className="flex items-center justify-between text-xs hover:bg-accent/50 rounded px-1 py-0.5 transition-colors">
                  <span className="font-medium">{d.name}</span>
                  <span className="text-red-600 font-semibold">${d.debt.toLocaleString('es-CL')}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )
      })()}

      {/* Broken inventory alert */}
      {brokenItems.length > 0 && (
        <Link href="/dashboard/inventory?condition=broken">
          <Card className="border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm text-red-800 font-medium">
                  {brokenItems.length} ítem{brokenItems.length !== 1 ? 's' : ''} en mal estado (roto{brokenItems.length !== 1 ? 's' : ''})
                  {brokenItems.length <= 3 && (
                    <span className="ml-1 font-normal">— {brokenItems.map((i) => i.name).join(', ')}</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Upcoming competitions widget */}
      {upcomingComps.length > 0 && (
        <Link href="/dashboard/competitions?status=upcoming">
          <Card className="border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors cursor-pointer">
            <CardHeader className="pb-2 pt-4 px-6">
              <CardTitle className="text-sm font-semibold text-violet-800 flex items-center gap-2">
                🏆 {upcomingComps.length} competencia{upcomingComps.length !== 1 ? 's' : ''} próxima{upcomingComps.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-6 space-y-1">
              {upcomingComps.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-xs text-violet-700">
                  <span className="font-medium truncate">{c.name}</span>
                  <span className="shrink-0 text-violet-500">
                    {new Date(c.start_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                    {c.location && ` · ${c.location}`}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Expiring subscriptions alert */}
      {expiringSubscriptions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {expiringSubscriptions.length} suscripción{expiringSubscriptions.length > 1 ? 'es' : ''} vence{expiringSubscriptions.length > 1 ? 'n' : ''} en 7 días
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 px-6 space-y-1.5">
            {expiringSubscriptions.map((sub) => {
              const athlete = sub.athletes
              const daysLeft = Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000)
              return (
                <div key={sub.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {athlete ? (
                      <Link href={`/dashboard/athletes/${athlete.id}`} className="font-medium text-orange-900 hover:underline">
                        {athlete.name}
                      </Link>
                    ) : <span className="font-medium text-orange-900">Atleta</span>}
                    {sub.plans && <span className="text-orange-700 text-xs">— {sub.plans.name}</span>}
                  </div>
                  <span className="text-xs font-medium text-orange-700">{daysLeft === 0 ? 'hoy' : `${daysLeft}d`}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Upcoming 7-day agenda */}
      {upcomingSchedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                Agenda — Próximos 7 días
              </span>
              <Link href="/dashboard/calendar" className="text-xs text-muted-foreground hover:text-primary font-normal">
                Ver calendario →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSchedules.map((day) => (
              <div key={day.date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {day.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {day.sessions.map((s) => (
                    <Link key={s.id} href={`/dashboard/calendar/${s.id}`}>
                      <span className="inline-flex items-center gap-1.5 text-xs bg-primary/5 border border-primary/20 text-primary px-2.5 py-1 rounded-full hover:bg-primary/10 transition-colors">
                        <span className="font-medium">{s.start_time.slice(0, 5)}</span>
                        {s.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
