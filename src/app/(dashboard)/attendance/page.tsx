export const dynamic = "force-dynamic"

import Link from "next/link"
import { getAttendanceToday, getAttendanceHistory } from "@/lib/actions/attendance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckSquare, Users, TrendingUp } from "lucide-react"
import { ManualCheckInButton } from "@/components/attendance/ManualCheckInButton"
import { QRCheckInDisplay } from "@/components/attendance/QRCheckInDisplay"
import { ExportAttendanceButton } from "@/components/attendance/ExportAttendanceButton"
import { getAthletes } from "@/lib/actions/athletes"
import { getSchedules } from "@/lib/actions/schedules"

interface PageProps {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; page?: string; scheduleId?: string }>
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab        = params.tab        ?? "today"
  const from       = params.from       ?? ""
  const to         = params.to         ?? ""
  const page       = Number(params.page ?? 1)
  const scheduleId = params.scheduleId ?? ""

  let todayRecords: Awaited<ReturnType<typeof getAttendanceToday>> = []
  let history: Awaited<ReturnType<typeof getAttendanceHistory>> = { records: [], total: 0 }
  let athletes: Array<{ id: string; name: string }> = []
  let schedules: Array<{ id: string; name: string }> = []
  let error: string | null = null

  try {
    const [today, hist, athletesResult, schedulesResult] = await Promise.all([
      getAttendanceToday(),
      getAttendanceHistory({ from: from || undefined, to: to || undefined, days: 30, limit: 50, page, scheduleId: scheduleId || undefined }),
      getAthletes({ limit: 200 }),
      getSchedules(),
    ])
    schedules = (schedulesResult as Array<{ id: string; name: string; is_active: boolean }>)
      .filter((s) => s.is_active)
      .map((s) => ({ id: s.id, name: s.name }))
    todayRecords = today
    history = hist
    athletes = athletesResult.athletes.map((a) => ({ id: a.id, name: a.name }))
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar asistencia"
  }

  const validToday = todayRecords.filter((r) => r.is_valid).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asistencia</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <ManualCheckInButton athletes={athletes} />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Presentes Hoy</CardTitle>
            <CheckSquare className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validToday}</div>
            <p className="text-xs text-muted-foreground">check-ins válidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Periodo seleccionado</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.total}</div>
            <p className="text-xs text-muted-foreground">registros totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Activos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{athletes.length}</div>
            <p className="text-xs text-muted-foreground">en el sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "today",   label: "Hoy" },
          { key: "history", label: "Historial" },
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
          <QRCheckInDisplay />
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
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          {/* Date + session filters */}
          <form method="get" action="/dashboard/attendance" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="history" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Sesión</label>
              <select name="scheduleId" defaultValue={scheduleId}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[160px]">
                <option value="">Todas las sesiones</option>
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Desde</label>
              <input type="date" name="from" defaultValue={from}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-medium">Hasta</label>
              <input type="date" name="to" defaultValue={to}
                className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button type="submit"
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Filtrar
            </button>
            <ExportAttendanceButton
              records={history.records.map((r) => ({
                ...r,
                athletes: r.athletes as { name: string } | null,
              }))}
            />
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
              <p className="text-sm text-muted-foreground">{history.total} registros encontrados</p>
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
                            {record.check_in_lat && " · 📍 GPS"}
                          </p>
                        </div>
                        <Badge variant={record.is_valid ? "default" : "destructive"} className="text-xs shrink-0">
                          {record.is_valid ? "Válido" : "Inválido"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
