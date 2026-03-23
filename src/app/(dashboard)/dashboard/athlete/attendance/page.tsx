export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, CalendarDays, TrendingUp, Flame } from "lucide-react"

export default async function AthleteAttendancePage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const subStatus = await getMySubscriptionStatus().catch(() => null)
  if (!subStatus?.hasAthleteProfile || !subStatus.athlete) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tu perfil de atleta aún no ha sido vinculado.</p>
      </div>
    )
  }

  const clubId = await getClubId()
  const supabase = createAdminClient()
  const athleteId = subStatus.athlete.id

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [allAttRes, schedulesRes] = await Promise.all([
    supabase
      .from("attendance")
      .select("id, is_valid, checked_in_at, schedule_id, schedules(name)")
      .eq("club_id", clubId)
      .eq("athlete_id", athleteId)
      .order("checked_in_at", { ascending: false })
      .limit(200),
    supabase
      .from("schedules")
      .select("id, name")
      .eq("club_id", clubId)
      .eq("is_active", true),
  ])

  type AttRow = { id: string; is_valid: boolean; checked_in_at: string; schedule_id: string | null; schedules: { name: string } | null }
  const allRecords = (allAttRes.data ?? []) as unknown as AttRow[]

  const thisMonth = allRecords.filter((r) => r.checked_in_at >= monthStart)
  const prevMonth = allRecords.filter((r) => r.checked_in_at >= prevMonthStart && r.checked_in_at <= prevMonthEnd)
  const validThisMonth = thisMonth.filter((r) => r.is_valid).length
  const validPrevMonth = prevMonth.filter((r) => r.is_valid).length

  // Attendance streak (consecutive days with valid check-in)
  const validDays = [...new Set(
    allRecords.filter((r) => r.is_valid).map((r) => r.checked_in_at.slice(0, 10))
  )].sort().reverse()

  let streak = 0
  const today = now.toISOString().slice(0, 10)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (validDays[0] === today || validDays[0] === yesterdayStr) {
    const startDate = validDays[0] === today ? new Date(today) : yesterday
    for (let i = 0; i < validDays.length; i++) {
      const expected = new Date(startDate)
      expected.setDate(expected.getDate() - i)
      if (validDays[i] === expected.toISOString().slice(0, 10)) {
        streak++
      } else break
    }
  }

  const totalValid = allRecords.filter((r) => r.is_valid).length

  // Last 30 records
  const recent = allRecords.slice(0, 30)

  const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Asistencia</h1>
        <p className="text-muted-foreground">Historial de check-ins y métricas de presencia</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{validThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Check-ins este mes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{validPrevMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Mes anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className={`text-3xl font-bold ${streak >= 5 ? "text-orange-500" : "text-muted-foreground"}`}>
              {streak > 0 ? `🔥 ${streak}` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Racha actual (días)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-green-600">{totalValid}</div>
            <p className="text-xs text-muted-foreground mt-1">Total check-ins válidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend indicator */}
      {(validThisMonth > 0 || validPrevMonth > 0) && (
        <Card className={validThisMonth >= validPrevMonth ? "border-green-200 bg-green-50/40" : "border-orange-200 bg-orange-50/40"}>
          <CardContent className="py-4 flex items-center gap-3">
            <TrendingUp className={`w-6 h-6 shrink-0 ${validThisMonth >= validPrevMonth ? "text-green-600" : "text-orange-500"}`} />
            <div>
              {validThisMonth > validPrevMonth ? (
                <p className="text-sm font-medium text-green-700">
                  ¡Vas {validThisMonth - validPrevMonth} check-ins por encima del mes anterior! Sigue así 💪
                </p>
              ) : validThisMonth < validPrevMonth ? (
                <p className="text-sm font-medium text-orange-700">
                  Tienes {validPrevMonth - validThisMonth} check-ins menos que el mes anterior. ¡Puedes mejorar!
                </p>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  Mismo ritmo que el mes anterior. ¡Mantén la constancia!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Historial Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aún no tienes check-ins registrados.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => {
                const date = new Date(r.checked_in_at)
                const dow = DAYS[date.getDay()]
                const dateStr = date.toLocaleDateString("es-CL", { day: "numeric", month: "short" })
                const timeStr = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                const sessionName = (r.schedules as { name: string } | null)?.name ?? "Sesión"

                return (
                  <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${r.is_valid ? "bg-green-100" : "bg-red-100"}`}>
                      {r.is_valid
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <XCircle className="w-4 h-4 text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sessionName}</p>
                      <p className="text-xs text-muted-foreground">{dow}, {dateStr} · {timeStr}</p>
                    </div>
                    <Badge variant={r.is_valid ? "default" : "destructive"} className="text-xs shrink-0">
                      {r.is_valid ? "Válido" : "Inválido"}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly summary - last 3 months */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Resumen Mensual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[0, 1, 2].map((offset) => {
              const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
              const mStart = d.toISOString()
              const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
              const count = allRecords.filter((r) => r.is_valid && r.checked_in_at >= mStart && r.checked_in_at <= mEnd).length
              const label = d.toLocaleDateString("es-CL", { month: "long", year: "numeric" })
              const maxW = Math.max(...[0, 1, 2].map((o2) => {
                const d2 = new Date(now.getFullYear(), now.getMonth() - o2, 1)
                const s = d2.toISOString()
                const e = new Date(d2.getFullYear(), d2.getMonth() + 1, 0, 23, 59, 59).toISOString()
                return allRecords.filter((r) => r.is_valid && r.checked_in_at >= s && r.checked_in_at <= e).length
              }))
              const pct = maxW > 0 ? Math.round((count / maxW) * 100) : 0

              return (
                <div key={offset} className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground w-28 capitalize shrink-0">{label}</p>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
