export const dynamic = "force-dynamic"

import Link from "next/link"
import { getSchedules } from "@/lib/actions/schedules"
import { getVenues } from "@/lib/actions/venues"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, MapPin, Users, Pencil } from "lucide-react"
import { DeleteScheduleButton } from "@/components/calendar/DeleteScheduleButton"
import { ExportSchedulesButton } from "@/components/calendar/ExportSchedulesButton"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DAY_COLORS = [
  "bg-red-100 text-red-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-yellow-100 text-yellow-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
]

interface PageProps {
  searchParams: Promise<{ venueId?: string; dow?: string }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const { venueId, dow } = await searchParams
  let schedules: Awaited<ReturnType<typeof getSchedules>> = []
  let venues: { id: string; name: string }[] = []
  let error: string | null = null

  try {
    const [s, v] = await Promise.all([
      getSchedules({ venueId: venueId || undefined }),
      getVenues(),
    ])
    schedules = s
    venues = v.map((v) => ({ id: v.id, name: v.name }))
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar horarios"
  }

  const filteredSchedules = dow !== undefined
    ? schedules.filter((s) => (s.day_of_week as number[]).includes(Number(dow)))
    : schedules

  // Group by day_of_week, sorted by start_time
  const byDay: Record<number, typeof schedules> = {}
  for (const s of filteredSchedules) {
    const days = s.day_of_week as number[]
    for (const d of days) {
      if (!byDay[d]) byDay[d] = []
      byDay[d].push(s)
    }
  }
  for (const d in byDay) {
    byDay[d] = byDay[d].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const todayDow = new Date().getDay()
  const todaySessions = (byDay[todayDow] ?? []).filter((s) => s.is_active)

  const totalAttendancesAllTime = schedules.reduce((sum, s) => sum + ((s.attendance as unknown[])?.length ?? 0), 0)

  // Today occupation: sessions with capacity → sum today's check-ins vs total capacity
  const todayStr = new Date().toISOString().split('T')[0]
  const todayOccupation = todaySessions.reduce((acc, s) => {
    if (!s.capacity) return acc
    const todayCheckIns = ((s.attendance as Array<{ id: string; checked_in_at: string }> | null) ?? [])
      .filter((a) => a.checked_in_at?.startsWith(todayStr)).length
    return { checkins: acc.checkins + todayCheckIns, capacity: acc.capacity + s.capacity }
  }, { checkins: 0, capacity: 0 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">
            {schedules.length} sesiones configuradas
            {totalAttendancesAllTime > 0 && (
              <span className="ml-2 text-primary font-medium">· {totalAttendancesAllTime.toLocaleString('es-CL')} check-ins totales</span>
            )}
            {(() => {
              const inactive = schedules.filter((s) => !s.is_active).length
              return inactive > 0 ? (
                <span className="ml-2 text-yellow-600 font-medium">· {inactive} sesión{inactive !== 1 ? 'es' : ''} inactiva{inactive !== 1 ? 's' : ''}</span>
              ) : null
            })()}
            {todayOccupation.capacity > 0 && (() => {
              const pct = Math.round((todayOccupation.checkins / todayOccupation.capacity) * 100)
              const color = pct >= 80 ? 'text-red-600' : pct >= 50 ? 'text-yellow-600' : 'text-green-600'
              return <span className={`ml-2 font-medium ${color}`}>· Hoy {pct}% ocupado ({todayOccupation.checkins}/{todayOccupation.capacity})</span>
            })()}
            {(() => {
              const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
              const next = todaySessions
                .filter((s) => s.start_time)
                .map((s) => {
                  const [h, m] = s.start_time.split(':').map(Number)
                  return { ...s, startMins: h * 60 + m }
                })
                .filter((s) => s.startMins > nowMins)
                .sort((a, b) => a.startMins - b.startMins)[0]
              return next ? (
                <span className="ml-2 text-primary font-medium">· Próxima: {next.name} {next.start_time.slice(0,5)}</span>
              ) : null
            })()}
            {todaySessions.length > 0 && (() => {
              const earliest = todaySessions
                .filter((s) => s.start_time)
                .slice().sort((a, b) => a.start_time.localeCompare(b.start_time))[0]
              return earliest ? (
                <span className="ml-2 text-muted-foreground/70">· Hoy desde {earliest.start_time.slice(0, 5)}</span>
              ) : null
            })()}
            {(() => {
              const withTimes = schedules.filter((s) => s.is_active && s.start_time && s.end_time)
              if (withTimes.length === 0) return null
              const avgMins = withTimes.reduce((sum, s) => {
                const [sh, sm] = s.start_time.split(':').map(Number)
                const [eh, em] = s.end_time!.split(':').map(Number)
                return sum + (eh * 60 + em) - (sh * 60 + sm)
              }, 0) / withTimes.length
              return <span className="ml-2 text-muted-foreground/60">· {Math.round(avgMins)} min promedio</span>
            })()}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportSchedulesButton schedules={schedules.map((s) => ({
            ...s,
            day_of_week: s.day_of_week as number[],
          }))} />
          <Link href="/dashboard/calendar/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Sesión
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium">Día:</span>
        <Link href={`/dashboard/calendar${venueId ? `?venueId=${venueId}` : ''}`}>
          <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
            dow === undefined ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
          }`}>Todos</button>
        </Link>
        {DAYS.map((label, d) => (
          <Link key={d} href={`/dashboard/calendar?${new URLSearchParams({ ...(venueId ? { venueId } : {}), dow: String(d) }).toString()}`}>
            <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
              dow === String(d) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
            }`}>{label}</button>
          </Link>
        ))}
      </div>

      {venues.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">Sede:</span>
          <Link href="/dashboard/calendar">
            <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
              !venueId ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
            }`}>Todas</button>
          </Link>
          {venues.map((v) => (
            <Link key={v.id} href={`/dashboard/calendar?venueId=${v.id}`}>
              <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                venueId === v.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
              }`}>{v.name}</button>
            </Link>
          ))}
        </div>
      )}

      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
        </Card>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Clock className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin horarios configurados</h3>
            <p className="text-muted-foreground mb-4">
              Define las sesiones recurrentes de entrenamiento
            </p>
            <Link href="/dashboard/calendar/new">
              <Button>Crear Primera Sesión</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Today's Sessions */}
          {todaySessions.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Hoy — {new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {todaySessions.map((s) => {
                  const venue = s.venues as { id: string; name: string } | null
                  const durationMin = (() => {
                    const [sh, sm] = s.start_time.split(":").map(Number)
                    const [eh, em] = s.end_time.split(":").map(Number)
                    return (eh * 60 + em) - (sh * 60 + sm)
                  })()
                  const attCount = ((s.attendance as Array<{ id: string }> | null) ?? []).length
                  const occ = s.capacity && s.capacity > 0 ? Math.round((attCount / s.capacity) * 100) : null
                  return (
                    <Link key={s.id} href={`/dashboard/calendar/${s.id}`}>
                      <div className="p-3 rounded-lg border bg-background hover:border-primary transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          {s.capacity && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                              occ !== null && occ >= 90 ? 'bg-red-100 text-red-700' :
                              occ !== null && occ >= 70 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {attCount}/{s.capacity}{occ !== null ? ` (${occ}%)` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                          <span className="ml-1.5 text-muted-foreground/70">({durationMin}min)</span>
                        </p>
                        {venue && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{venue.name}</p>}
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Weekly view */}
          <div className="grid gap-3 md:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
              <div key={dow} className="min-w-0">
                <div className={`text-center text-xs font-bold py-1 rounded-t-md ${
                  dow === todayDow ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {DAYS[dow]}
                  {(byDay[dow]?.length ?? 0) > 0 && (() => {
                    const totalMin = (byDay[dow] ?? []).reduce((s, sess) => {
                      const [sh, sm] = sess.start_time.split(':').map(Number)
                      const [eh, em] = sess.end_time.split(':').map(Number)
                      return s + (eh * 60 + em) - (sh * 60 + sm)
                    }, 0)
                    return (
                      <span className="ml-1 text-[10px] font-normal opacity-80">
                        ({byDay[dow].length}) {totalMin}min
                      </span>
                    )
                  })()}
                  {dow === todayDow && <span className="ml-1">•</span>}
                </div>
                <div className="space-y-1 p-1 min-h-24 bg-muted/20 rounded-b-md">
                  {(byDay[dow] ?? []).map((s) => (
                    <Link key={s.id} href={`/dashboard/calendar/${s.id}`}>
                      <div className="p-1.5 rounded bg-background border hover:border-primary transition-colors text-xs">
                        <p className="font-medium truncate">{s.name}</p>
                        <p className="text-muted-foreground">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</p>
                        {s.capacity && (() => {
                          const n = ((s.attendance as Array<{ id: string }> | null) ?? []).length
                          const p = Math.round((n / s.capacity) * 100)
                          if (p >= 100) return (
                            <p className="text-[10px] font-bold text-red-600 bg-red-50 rounded px-1">🔴 LLENO {n}/{s.capacity}</p>
                          )
                          return (
                            <p className={`text-[10px] font-medium ${
                              p >= 90 ? 'text-red-600' : p >= 70 ? 'text-yellow-600' : 'text-green-600'
                            }`}>{n}/{s.capacity}</p>
                          )
                        })()}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* List view */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Todas las Sesiones</h2>
            {schedules.map((s) => {
              const venue = s.venues as { id: string; name: string } | null
              const days = (s.day_of_week as number[]).map((d) => DAYS[d])

              return (
                <Card key={s.id} className="hover:bg-accent/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{s.name}</span>
                          <Badge variant={s.access_rule === "open" ? "secondary" : "outline"} className="text-xs">
                            {s.access_rule === "open" ? "Abierta" : s.access_rule === "subscription" ? "Suscripción" : "Perfil"}
                          </Badge>
                          {!venue && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Sin sede</Badge>
                          )}
                          {s.capacity && s.capacity > 0 && (() => {
                            const attCount = ((s.attendance as Array<{ id: string }> | null) ?? []).length
                            const pct = Math.round((attCount / s.capacity) * 100)
                            if (pct < 90) return null
                            return (
                              <Badge variant="destructive" className="text-xs">
                                {pct >= 100 ? '🔴 Aforo completo' : `🟡 ${pct}% lleno`}
                              </Badge>
                            )
                          })()}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                          </span>
                          {venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {venue.name}
                            </span>
                          )}
                          {s.capacity && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              Máx. {s.capacity}
                            </span>
                          )}
                          {(() => {
                            const att = s.attendance as Array<{ id: string }> | null
                            const count = (att ?? []).length
                            return count > 0 ? (
                              <span className="flex items-center gap-1 text-primary font-medium">
                                📋 {count} asistencias
                              </span>
                            ) : null
                          })()}
                          {(() => {
                            const dowList = s.day_of_week as number[]
                            if (!dowList?.length) return null
                            const now = new Date()
                            const todayDow = now.getDay()
                            const diffs = dowList.map((d) => (d - todayDow + 7) % 7)
                            const minDiff = Math.min(...diffs)
                            const nextDate = new Date(now)
                            nextDate.setDate(nextDate.getDate() + minDiff)
                            const label = minDiff === 0 ? 'Hoy' : minDiff === 1 ? 'Mañana' : nextDate.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
                            return <span className={`text-xs font-medium ${minDiff === 0 ? 'text-green-600' : 'text-muted-foreground'}`}>📅 {label}</span>
                          })()}
                          {s.end_date && (() => {
                            const daysLeft = Math.ceil((new Date(s.end_date + 'T12:00:00').getTime() - Date.now()) / 86400000)
                            if (daysLeft < 0) return <span className="text-destructive text-xs font-medium">Finalizada</span>
                            if (daysLeft <= 30) return <span className={`text-xs font-medium ${daysLeft <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>⏱ {daysLeft}d restantes</span>
                            return null
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex gap-1 flex-wrap justify-end">
                          {days.map((d) => (
                            <span key={d} className={`text-xs px-1.5 py-0.5 rounded font-medium ${DAY_COLORS[DAYS.indexOf(d)]}`}>
                              {d}
                            </span>
                          ))}
                        </div>
                        <Link href={`/dashboard/calendar/${s.id}/edit`}>
                          <button className="h-8 w-8 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <DeleteScheduleButton scheduleId={s.id} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
