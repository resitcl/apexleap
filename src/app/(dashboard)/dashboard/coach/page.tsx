export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getClubVocab } from "@/lib/actions/club-context"
import { getCoachDashboard } from "@/lib/actions/dashboard"
import { getTodaySessions } from "@/lib/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, CheckCircle, AlertTriangle, Activity, Calendar, TrendingUp, Shield } from "lucide-react"
import { SessionAttendanceView } from "@/components/coach/SessionAttendanceView"

const SEMAFORO_CONFIG = {
  green:  { label: "Apto",        bg: "bg-green-500",  text: "text-green-700",  border: "border-green-200",  card: "bg-green-50",  emoji: "🟢" },
  yellow: { label: "Observación", bg: "bg-yellow-400", text: "text-yellow-700", border: "border-yellow-200", card: "bg-yellow-50", emoji: "🟡" },
  red:    { label: "Bloqueado",   bg: "bg-red-500",    text: "text-red-700",    border: "border-red-200",    card: "bg-red-50",    emoji: "🔴" },
}

const HEALTH_LABEL: Record<string, string> = {
  healthy: "Saludable", injured: "Lesionado", observation: "Observación",
}

export default async function CoachPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  let data: Awaited<ReturnType<typeof getCoachDashboard>> | null = null
  let error = ""

  try {
    data = await getCoachDashboard()
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar"
  }

  const vocab = await getClubVocab()

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{error || "Sin datos"}</p>
      </div>
    )
  }

  const { athletes, checkedInTodayIds, sessions, nextSession, semaforoCount } = data
  const checkedInSet = new Set(checkedInTodayIds)

  const todayDate = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })

  const green  = athletes.filter((a) => a.semaforo === "green")
  const yellow = athletes.filter((a) => a.semaforo === "yellow")
  const red    = athletes.filter((a) => a.semaforo === "red")

  const checkedInToday  = athletes.filter((a) => checkedInSet.has(a.id))
  const presentAndReady = checkedInToday.filter((a) => a.semaforo === "green")

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">War Room 🏟</h1>
          <p className="text-muted-foreground capitalize">{todayDate}</p>
        </div>
        <Link href="/dashboard/attendance">
          <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3 cursor-pointer hover:bg-accent">
            <Activity className="w-3.5 h-3.5" />
            Ver asistencia
          </Badge>
        </Link>
      </div>

      {/* Semáforo KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {(["green", "yellow", "red"] as const).map((color) => {
          const cfg = SEMAFORO_CONFIG[color]
          const count = semaforoCount[color]
          return (
            <Card key={color} className={`border ${cfg.border} ${cfg.card}`}>
              <CardContent className="py-4 text-center">
                <div className={`text-4xl font-bold ${cfg.text}`}>{count}</div>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${cfg.bg}`} />
                  <span className="text-sm font-medium text-muted-foreground">{cfg.label}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sesiones hoy + check-ins */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins Hoy</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{checkedInToday.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {presentAndReady.length} aptos · {checkedInToday.filter((a) => a.semaforo === "red").length} bloqueados presentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {nextSession ? "Próxima Sesión" : "Sesiones Hoy"}
            </CardTitle>
            <Calendar className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {nextSession ? (
              <>
                <div className="text-xl font-bold truncate">{nextSession.name}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {nextSession.start_time.slice(0, 5)} – {nextSession.end_time.slice(0, 5)}
                  {nextSession.capacity && <span className="ml-2">· {nextSession.capacity} cupos</span>}
                </p>
              </>
            ) : (
              <div className="text-xl font-bold text-muted-foreground">{sessions.length > 0 ? `${sessions.length} sesiones` : "Sin sesiones"}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline sesiones del día */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horario de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sessions.map((s) => {
                const isNext = nextSession?.id === s.id
                return (
                  <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${isNext ? "border-primary bg-primary/5 font-semibold" : "border-border"}`}>
                    <span className="font-mono text-xs text-muted-foreground">{s.start_time.slice(0, 5)}</span>
                    <span className="truncate max-w-[120px]">{s.name}</span>
                    {s.capacity && <span className="text-xs text-muted-foreground">/{s.capacity}</span>}
                    {isNext && <span className="text-xs text-primary font-medium">← ahora</span>}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Attendance View - for next/current session */}
      {nextSession && (
        <SessionAttendanceView
          session={nextSession}
          athletes={athletes.map(a => ({
            id: a.id,
            name: a.name,
            photo_url: a.photo_url,
            health_status: a.health_status,
            semaforo: a.semaforo,
          }))}
          attendance={(data.attendanceToday ?? [])
            .filter(att => att.schedule_id === nextSession.id || !att.schedule_id)
            .map(att => ({
              id: att.id,
              athlete_id: att.athlete_id,
              is_valid: att.is_valid,
              checked_in_at: att.checked_in_at,
            }))}
        />
      )}

      {/* Semáforo detallado */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Semáforo de Disponibilidad
        </h2>

        {/* Bloqueados */}
        {red.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1.5">
              🔴 Bloqueados ({red.length})
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {red.map((a) => (
                <Link key={a.id} href={`/dashboard/athletes/${a.id}`}>
                  <Card className="border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-red-600">
                          {a.health_status === "injured" ? "🩹 Lesionado" : "💳 Deuda pendiente"}
                        </p>
                      </div>
                      {checkedInSet.has(a.id) && (
                        <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 shrink-0">
                          Presente
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Observación */}
        {yellow.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-yellow-700 mb-2 flex items-center gap-1.5">
              🟡 En Observación ({yellow.length})
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {yellow.map((a) => (
                <Link key={a.id} href={`/dashboard/athletes/${a.id}`}>
                  <Card className="border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-yellow-600">{HEALTH_LABEL[a.health_status ?? "healthy"]}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {checkedInSet.has(a.id) && (
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200">✓</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{a.monthCheckIns}✓</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Aptos */}
        {green.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1.5">
              🟢 Aptos ({green.length}) · {green.filter((a) => checkedInSet.has(a.id)).length} presentes hoy
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {green.map((a) => {
                const present = checkedInSet.has(a.id)
                return (
                  <Link key={a.id} href={`/dashboard/athletes/${a.id}`}>
                    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      present ? "border-green-300 bg-green-50 hover:bg-green-100" : "border-border hover:bg-accent/50"
                    }`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${present ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.monthCheckIns} este mes</p>
                      </div>
                      {present && <span className="text-xs text-green-600">✓</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ranking asistencia del mes */}
      {athletes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Check-ins del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {athletes
              .filter((a) => a.monthCheckIns > 0)
              .sort((a, b) => b.monthCheckIns - a.monthCheckIns)
              .slice(0, 5)
              .map((a, i) => {
                const maxCheckIns = Math.max(...athletes.map((x) => x.monthCheckIns), 1)
                const pct = Math.round((a.monthCheckIns / maxCheckIns) * 100)
                return (
                  <Link key={a.id} href={`/dashboard/athletes/${a.id}`}>
                    <div className="flex items-center gap-3 py-2 hover:bg-accent/30 rounded px-1 transition-colors cursor-pointer">
                      <span className="text-sm text-muted-foreground w-5 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium truncate">{a.name}</span>
                          <span className="text-sm font-bold text-green-600 shrink-0 ml-2">{a.monthCheckIns}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            {athletes.every((a) => a.monthCheckIns === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin check-ins registrados este mes</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* CTA si no hay atletas */}
      {athletes.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin atletas activos</h3>
            <p className="text-muted-foreground text-sm mb-4">Agrega atletas al club para ver el semáforo de disponibilidad</p>
            <Link href="/dashboard/athletes">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">Ir a {vocab.athletes}</Badge>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
