export const dynamic = "force-dynamic"

import Link from "next/link"
import { getAttendanceToday, getAttendanceHistory, getPastSessionsAttendance } from "@/lib/actions/attendance"
import { PastSessionsList } from "@/components/attendance/PastSessionsList"
import type { SessionGroup } from "@/components/attendance/PastSessionsList"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckSquare, Users, TrendingUp } from "lucide-react"
import { InfoTooltip } from "@/components/ui/info-tooltip"
import { ManualCheckInButton } from "@/components/attendance/ManualCheckInButton"
import { BulkHistoricalAttendance } from "@/components/attendance/BulkHistoricalAttendance"
import { QRCheckInDisplay } from "@/components/attendance/QRCheckInDisplay"
import { ExportAttendanceButton } from "@/components/attendance/ExportAttendanceButton"
import { JustifyAttendanceButton } from "@/components/attendance/JustifyAttendanceButton"
import { getAthletes } from "@/lib/actions/athletes"
import { getSchedules } from "@/lib/actions/schedules"
import { getCategories } from "@/lib/actions/categories"
import { getVenues } from "@/lib/actions/venues"

interface PageProps {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; page?: string; scheduleId?: string; athleteId?: string; categoryId?: string }>
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab        = params.tab        ?? "today"
  const from       = params.from       ?? ""
  const to         = params.to         ?? ""
  const page       = Number(params.page ?? 1)
  const scheduleId = params.scheduleId ?? ""
  const athleteId  = params.athleteId  ?? ""
  const categoryId = params.categoryId ?? ""

  let todayRecords: Awaited<ReturnType<typeof getAttendanceToday>> = []
  let history: Awaited<ReturnType<typeof getAttendanceHistory>> = { records: [], total: 0 }
  let sessionGroups: SessionGroup[] = []
  let athletes: Array<{ id: string; name: string; category_id?: string | null }> = []
  let schedules: Array<{ id: string; name: string }> = []
  let categories: Array<{ id: string; name: string; color: string | null }> = []
  let venuesForQR: Array<{ id: string; name: string; address: string | null; qr_token: string | null; lat: number | null; lng: number | null; geofence_radius: number | null }> = []
  let error: string | null = null

  try {
    const [today, hist, sessionsHist, athletesResult, schedulesResult, catsData, venuesData] = await Promise.all([
      getAttendanceToday({ categoryId: categoryId || undefined }),
      getAttendanceHistory({ from: from || undefined, to: to || undefined, days: 30, limit: 50, page, scheduleId: scheduleId || undefined, athleteId: athleteId || undefined, categoryId: categoryId || undefined }),
      tab === 'sessions'
        ? getPastSessionsAttendance({ from: from || undefined, to: to || undefined, days: 30, scheduleId: scheduleId || undefined })
        : Promise.resolve([] as SessionGroup[]),
      getAthletes({ limit: 200 }),
      getSchedules(),
      getCategories(true).catch(() => []),
      getVenues().catch(() => []),
    ])
    sessionGroups = sessionsHist as SessionGroup[]
    schedules = (schedulesResult as Array<{ id: string; name: string; is_active: boolean }>)
      .filter((s) => s.is_active)
      .map((s) => ({ id: s.id, name: s.name }))
    todayRecords = today
    history = hist
    athletes = athletesResult.athletes.map((a) => ({ id: a.id, name: a.name, category_id: (a as { category_id?: string | null }).category_id ?? null }))
    categories = catsData.map((c) => ({ id: c.id, name: c.name, color: c.color ?? null }))
    venuesForQR = (venuesData as Array<{ id: string; name: string; address: string | null; qr_token: string | null; lat: number | null; lng: number | null; geofence_radius: number | null }>)
      .filter((v) => (v as { is_active?: boolean }).is_active !== false)
      .map((v) => ({ id: v.id, name: v.name, address: v.address, qr_token: v.qr_token, lat: v.lat, lng: v.lng, geofence_radius: v.geofence_radius }))
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar asistencia"
  }

  const validToday = todayRecords.filter((r) => r.is_valid).length
  /** Mapa `scheduleId -> athleteId[]` con quienes ya marcaron hoy en esa sesión.
   *  Permite que el botón manual evalúe duplicados por (atleta, sesión), no por atleta global. */
  const presentBySession = todayRecords.reduce<Record<string, string[]>>((acc, r) => {
    const sid = (r as { schedule_id?: string | null }).schedule_id ?? ""
    const aid = (r as { athlete_id?: string | null }).athlete_id ?? ""
    if (!sid || !aid) return acc
    if (!acc[sid]) acc[sid] = []
    if (!acc[sid].includes(aid)) acc[sid].push(aid)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Asistencia</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {todayRecords.length > 0 && (() => {
              const pct = Math.round((validToday / todayRecords.length) * 100)
              const color = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'
              return <span className={`ml-2 font-medium ${color}`}>· {pct}% válidos hoy ({validToday}/{todayRecords.length})</span>
            })()}
          </p>
        </div>
        <div className="flex gap-2">
          <BulkHistoricalAttendance athletes={athletes} schedules={schedules} />
          <ManualCheckInButton athletes={athletes} schedules={schedules} presentBySession={presentBySession} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Presentes Hoy</CardTitle>
              <InfoTooltip text="Check-ins válidos registrados hoy, ya sea por QR o manualmente por un admin." />
            </div>
            <CheckSquare className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validToday}</div>
            <p className="text-xs text-muted-foreground">check-ins válidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Periodo seleccionado</CardTitle>
              <InfoTooltip text="Total de check-ins en el rango de fechas seleccionado. Incluye válidos e inválidos." />
            </div>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.total}</div>
            <p className="text-xs text-muted-foreground">registros totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Activos</CardTitle>
              <InfoTooltip text="Atletas con estado activo en el club. Referencia para calcular tasa de asistencia." />
            </div>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{athletes.length}</div>
            <p className="text-xs text-muted-foreground">en el sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">Categoría:</span>
          <Link href={`/dashboard/attendance?tab=${tab}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`}>
            <button className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${!categoryId ? 'bg-foreground text-background border-foreground shadow-sm' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'}`}>Todas</button>
          </Link>
          {categories.map((cat) => (
            <Link key={cat.id} href={`/dashboard/attendance?tab=${tab}&categoryId=${cat.id}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`}>
              <button className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${categoryId === cat.id ? 'bg-foreground text-background border-foreground shadow-sm' : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'}`}>
                {cat.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                {cat.name}
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "today",    label: "Hoy" },
          { key: "sessions", label: "Por entrenamiento" },
          { key: "history",  label: "Historial" },
        ].map((t) => (
          <Link key={t.key} href={`/dashboard/attendance?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "today" && (
        <div className="grid md:grid-cols-2 gap-6">
          <QRCheckInDisplay venues={venuesForQR} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Asistencia de Hoy ({todayRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : todayRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nadie ha registrado asistencia hoy</p>
                </div>
              ) : (
                <>
                {(() => {
                  const bySession = todayRecords.reduce<Record<string, { name: string; count: number }>>((acc, r) => {
                    const s = r.schedules as { id: string; name: string } | null
                    if (!s) return acc
                    if (!acc[s.id]) acc[s.id] = { name: s.name, count: 0 }
                    acc[s.id].count++
                    return acc
                  }, {})
                  const entries = Object.values(bySession)
                  if (entries.length === 0) return null
                  return (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {entries.map((e) => (
                        <span key={e.name} className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
                          {e.name}: {e.count}
                        </span>
                      ))}
                    </div>
                  )
                })()}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {todayRecords.map((record) => {
                    const athlete = record.athletes as { id: string; name: string; photo_url: string | null; health_status: string } | null
                    return (
                      <div key={record.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="text-xs font-semibold">
                            {athlete?.name?.slice(0, 2).toUpperCase() ?? "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{athlete?.name ?? "Desconocido"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.checked_in_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                            {record.check_in_lat && " · 📍 GPS"}
                          </p>
                        </div>
                        <Badge variant={record.is_valid ? "default" : "destructive"} className="text-xs shrink-0">
                          {record.is_valid ? "Válido" : "Inválido"}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "sessions" && (
        <div className="space-y-4">
          <form method="get" action="/dashboard/attendance" className="space-y-3">
            <input type="hidden" name="tab" value="sessions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Sesión</label>
                <select name="scheduleId" defaultValue={scheduleId}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full">
                  <option value="">Todas las sesiones</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Desde</label>
                <input type="date" name="from" defaultValue={from}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Hasta</label>
                <input type="date" name="to" defaultValue={to}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full" />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit"
                  className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  Filtrar
                </button>
                {(from || to || scheduleId) && (
                  <Link href="/dashboard/attendance?tab=sessions"
                    className="text-xs text-muted-foreground hover:text-foreground underline">
                    ✕ Limpiar
                  </Link>
                )}
              </div>
            </div>
          </form>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {sessionGroups.length} entrenamiento{sessionGroups.length === 1 ? '' : 's'} con asistencia registrada
                {(from || to) ? ' en el rango seleccionado' : ' en los últimos 30 días'}
              </p>
              <PastSessionsList groups={sessionGroups} />
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          {/* Date + session filters */}
          <form method="get" action="/dashboard/attendance" className="space-y-3">
            <input type="hidden" name="tab" value="history" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Alumno</label>
                <select name="athleteId" defaultValue={athleteId}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full">
                  <option value="">Todos los alumnos</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Sesión</label>
                <select name="scheduleId" defaultValue={scheduleId}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full">
                  <option value="">Todas las sesiones</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Desde</label>
                <input type="date" name="from" defaultValue={from}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground font-medium">Hasta</label>
                <input type="date" name="to" defaultValue={to}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full" />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button type="submit"
                className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Filtrar
              </button>
              <ExportAttendanceButton
                records={history.records.map((r) => ({
                  ...r,
                  athletes: r.athletes as { name: string } | null,
                  schedules: r.schedules as { name: string } | null,
                }))}
              />
              {(from || to || scheduleId || athleteId) && (
                <Link href="/dashboard/attendance?tab=history"
                  className="text-xs text-muted-foreground hover:text-foreground underline">
                  ✕ Limpiar filtros
                </Link>
              )}
            </div>
          </form>

          {/* History list */}
          {history.records.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>Sin registros en el periodo seleccionado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(() => {
                const validCount = history.records.filter((r) => r.is_valid).length
                const pct = history.records.length > 0 ? Math.round((validCount / history.records.length) * 100) : 0

                // Per-session breakdown (only when not already filtered by session)
                const bySession = !scheduleId ? history.records.reduce<Record<string, { name: string; total: number; valid: number }>>((acc, r) => {
                  const s = r.schedules as { name: string } | null
                  const key = s?.name ?? 'Sin sesión'
                  if (!acc[key]) acc[key] = { name: key, total: 0, valid: 0 }
                  acc[key].total++
                  if (r.is_valid) acc[key].valid++
                  return acc
                }, {}) : {}
                const sessionEntries = Object.values(bySession).sort((a, b) => b.total - a.total)

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      <span className="text-muted-foreground">{history.total} registros encontrados</span>
                      <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                        pct >= 80 ? 'bg-green-100 text-green-700' :
                        pct >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {validCount}/{history.records.length} válidos · {pct}% asistencia
                      </span>
                    </div>
                    {sessionEntries.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {sessionEntries.map((e) => {
                          const sp = Math.round((e.valid / e.total) * 100)
                          return (
                            <span key={e.name} className={`text-xs px-2 py-0.5 rounded font-medium ${
                              sp >= 80 ? 'bg-green-50 text-green-700' :
                              sp >= 50 ? 'bg-yellow-50 text-yellow-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {e.name}: {e.valid}/{e.total} ({sp}%)
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {!athleteId && (() => {
                      const byAthlete = history.records.reduce<Record<string, { name: string; id: string; total: number; valid: number }>>((acc, r) => {
                        const a = r.athletes as { id: string; name: string } | null
                        if (!a) return acc
                        if (!acc[a.id]) acc[a.id] = { name: a.name, id: a.id, total: 0, valid: 0 }
                        acc[a.id].total++
                        if (r.is_valid) acc[a.id].valid++
                        return acc
                      }, {})
                      const entries = Object.values(byAthlete).sort((a, b) => b.total - a.total).slice(0, 8)
                      if (entries.length < 2) return null
                      return (
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="text-xs text-muted-foreground font-medium self-center">Por atleta:</span>
                          {entries.map((e) => {
                            const ap = Math.round((e.valid / e.total) * 100)
                            return (
                              <span key={e.id} className={`text-xs px-2 py-0.5 rounded font-medium ${
                                ap >= 80 ? 'bg-green-50 text-green-700' :
                                ap >= 50 ? 'bg-yellow-50 text-yellow-700' :
                                'bg-red-50 text-red-700'
                              }`} title={`${e.valid}/${e.total} válidos`}>
                                {e.name.split(' ')[0]}: {ap}%
                              </span>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}
              {history.records.map((record) => {
                const athlete = record.athletes as { id: string; name: string } | null
                const dt = new Date(record.checked_in_at)
                return (
                  <Card key={record.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="text-xs font-semibold">
                            {athlete?.name?.slice(0, 2).toUpperCase() ?? "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{athlete?.name ?? "Desconocido"}</p>
                          <p className="text-xs text-muted-foreground">
                            {dt.toLocaleDateString("es-CL")} · {dt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                            {(record.schedules as { name: string } | null)?.name && ` · ${(record.schedules as { name: string }).name}`}
                            {record.check_in_lat && " · 📍 GPS"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={record.is_valid ? "default" : "destructive"} className="text-xs">
                            {record.is_valid ? (record.notes ? "Justificado" : "Válido") : "Inválido"}
                          </Badge>
                          <JustifyAttendanceButton
                            attendanceId={record.id}
                            isValid={record.is_valid ?? false}
                            currentNotes={record.notes as string | null}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Pagination */}
              {history.total > 50 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {(page - 1) * 50 + 1}–{Math.min(page * 50, history.total)} de {history.total}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link href={`/dashboard/attendance?${new URLSearchParams({
                        tab: 'history',
                        ...(from        ? { from }        : {}),
                        ...(to          ? { to }          : {}),
                        ...(scheduleId  ? { scheduleId }  : {}),
                        ...(athleteId   ? { athleteId }   : {}),
                        page: String(page - 1),
                      }).toString()}`}>
                        <button className="h-8 px-3 rounded-md border border-input bg-background text-xs hover:bg-accent transition-colors">← Anterior</button>
                      </Link>
                    )}
                    {page * 50 < history.total && (
                      <Link href={`/dashboard/attendance?${new URLSearchParams({
                        tab: 'history',
                        ...(from        ? { from }        : {}),
                        ...(to          ? { to }          : {}),
                        ...(scheduleId  ? { scheduleId }  : {}),
                        ...(athleteId   ? { athleteId }   : {}),
                        page: String(page + 1),
                      }).toString()}`}>
                        <button className="h-8 px-3 rounded-md border border-input bg-background text-xs hover:bg-accent transition-colors">Siguiente →</button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
