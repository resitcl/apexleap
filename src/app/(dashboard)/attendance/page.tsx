export const dynamic = "force-dynamic"

import { getAttendanceToday, getAttendanceHistory } from "@/lib/actions/attendance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckSquare, Users, TrendingUp } from "lucide-react"
import { ManualCheckInButton } from "@/components/attendance/ManualCheckInButton"
import { QRCheckInDisplay } from "@/components/attendance/QRCheckInDisplay"
import { getAthletes } from "@/lib/actions/athletes"

export default async function AttendancePage() {
  let todayRecords: Awaited<ReturnType<typeof getAttendanceToday>> = []
  let historyTotal = 0
  let athletes: Array<{ id: string; name: string }> = []
  let error: string | null = null

  try {
    const [today, history, athletesResult] = await Promise.all([
      getAttendanceToday(),
      getAttendanceHistory({ days: 7 }),
      getAthletes({ limit: 200 }),
    ])
    todayRecords = today
    historyTotal = history.total
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimos 7 días</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{historyTotal}</div>
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* QR Check-in Display */}
        <QRCheckInDisplay />

        {/* Today's Attendance List */}
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
                  const athlete = record.athletes as {
                    id: string; name: string; photo_url: string | null; health_status: string
                  } | null

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
                          {new Date(record.checked_in_at).toLocaleTimeString("es-CL", {
                            hour: "2-digit", minute: "2-digit"
                          })}
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
    </div>
  )
}
