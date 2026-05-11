export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, CalendarDays, TrendingUp, Flame, QrCode, Camera, ClipboardCheck } from "lucide-react"
import { AthleteSectionHeader } from "@/components/athlete/AthleteSectionHeader"

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
    <div className="space-y-8 pb-12 pt-1">
      <AthleteSectionHeader
        icon={ClipboardCheck}
        title="Mi asistencia"
        description="Historial de check-ins y métricas de presencia. Mantén un ritmo de entrenamiento constante."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors">
          <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
            <div className="text-4xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">{validThisMonth}</div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Mes actual</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
          <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
            <div className="text-3xl font-black text-foreground">{validPrevMonth}</div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Mes anterior</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm relative overflow-hidden">
          {streak >= 3 && <div className="absolute inset-0 bg-orange-500/5 animate-pulse" />}
          <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full relative z-10">
            <div className={`text-4xl font-black ${streak >= 3 ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]" : "text-muted-foreground"}`}>
              {streak > 0 ? `${streak}` : "—"}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 flex items-center gap-1">
              Racha actual {streak >= 3 && <Flame className="w-3 h-3 text-orange-500" />}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
          <CardContent className="py-6 flex flex-col items-center justify-center text-center h-full">
            <div className="text-3xl font-black text-foreground">{totalValid}</div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Check-ins Totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Cómo marcar asistencia */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent z-0" />
        <div className="p-6 sm:p-8 flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-lg tracking-tight uppercase leading-none">¿Cómo marcar asistencia?</p>
            <p className="text-sm text-muted-foreground/80 font-medium mt-1">
              Escanea el código QR físico del club con la <span className="font-semibold text-foreground">cámara de tu celular</span>.
              Inicia sesión con tu cuenta y la asistencia queda registrada automáticamente.
            </p>
          </div>
          <Camera className="hidden sm:block w-6 h-6 text-muted-foreground/60 shrink-0" />
        </div>
      </div>

      {/* Trend indicator */}
      {(validThisMonth > 0 || validPrevMonth > 0) && (
        <Card className={`rounded-2xl border-white/[0.04] shadow-sm ${validThisMonth >= validPrevMonth ? "bg-primary/[0.02]" : "bg-card"}`}>
          <CardContent className="py-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${validThisMonth >= validPrevMonth ? "bg-primary/10" : "bg-muted"}`}>
              <TrendingUp className={`w-5 h-5 ${validThisMonth >= validPrevMonth ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              {validThisMonth > validPrevMonth ? (
                <p className="text-sm font-semibold text-foreground">
                  ¡Vas <span className="text-primary font-bold">{validThisMonth - validPrevMonth}</span> check-ins por encima del mes anterior!
                </p>
              ) : validThisMonth < validPrevMonth ? (
                <p className="text-sm font-medium text-muted-foreground">
                  Tienes <strong className="text-foreground">{validPrevMonth - validThisMonth}</strong> check-ins menos que el mes anterior.
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

      <div className="grid md:grid-cols-3 gap-6">
        {/* History */}
        <Card className="rounded-2xl border border-white/[0.04] shadow-sm overflow-hidden md:col-span-2">
          <CardHeader className="pb-4 border-b border-border/30 bg-muted/10 px-6 pt-6">
            <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Historial Reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground/60">Aún no tienes check-ins registrados.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/20">
                {recent.map((r) => {
                  const date = new Date(r.checked_in_at)
                  const dow = DAYS[date.getDay()]
                  const dateStr = date.toLocaleDateString("es-CL", { day: "numeric", month: "short" })
                  const timeStr = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                  const sessionName = (r.schedules as { name: string } | null)?.name ?? "Sesión General"

                  return (
                    <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/5 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${r.is_valid ? "bg-primary/10 border-primary/20" : "bg-destructive/10 border-destructive/20"}`}>
                        {r.is_valid
                          ? <CheckCircle className="w-5 h-5 text-primary" />
                          : <XCircle className="w-5 h-5 text-destructive" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-foreground">{sessionName}</p>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                          {dow}, {dateStr} <span className="text-muted-foreground/30 mx-1">|</span> {timeStr}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest ${r.is_valid ? "text-primary border-primary/30" : "text-destructive border-destructive/30"}`}>
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
        <Card className="rounded-2xl border border-white/[0.04] shadow-sm overflow-hidden h-fit">
          <CardHeader className="pb-4 border-b border-border/30 bg-muted/10 px-6 pt-6">
            <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" /> Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <div className="space-y-6">
              {[0, 1, 2].map((offset) => {
                const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
                const mStart = d.toISOString()
                const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
                const count = allRecords.filter((r) => r.is_valid && r.checked_in_at >= mStart && r.checked_in_at <= mEnd).length
                const label = d.toLocaleDateString("es-CL", { month: "short", year: "numeric" })
                const maxW = Math.max(...[0, 1, 2].map((o2) => {
                  const d2 = new Date(now.getFullYear(), now.getMonth() - o2, 1)
                  const s = d2.toISOString()
                  const e = new Date(d2.getFullYear(), d2.getMonth() + 1, 0, 23, 59, 59).toISOString()
                  return allRecords.filter((r) => r.is_valid && r.checked_in_at >= s && r.checked_in_at <= e).length
                }))
                const pct = maxW > 0 ? Math.round((count / maxW) * 100) : 0

                return (
                  <div key={offset} className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">{label}</p>
                      <span className="text-lg font-black text-foreground">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden flex shadow-inner">
                      <div
                        className="h-full bg-primary/80 transition-all rounded-r-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
