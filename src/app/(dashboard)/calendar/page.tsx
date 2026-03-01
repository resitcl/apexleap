import Link from "next/link"
import { getSchedules } from "@/lib/actions/schedules"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Clock, MapPin, Users } from "lucide-react"

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

export default async function CalendarPage() {
  let schedules: Awaited<ReturnType<typeof getSchedules>> = []
  let error: string | null = null

  try {
    schedules = await getSchedules()
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar horarios"
  }

  // Group by day_of_week
  const byDay: Record<number, typeof schedules> = {}
  for (const s of schedules) {
    const days = s.day_of_week as number[]
    for (const d of days) {
      if (!byDay[d]) byDay[d] = []
      byDay[d].push(s)
    }
  }

  const todayDow = new Date().getDay()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">{schedules.length} sesiones configuradas</p>
        </div>
        <Link href="/dashboard/calendar/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Sesión
          </Button>
        </Link>
      </div>

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
          {/* Weekly view */}
          <div className="grid gap-3 md:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
              <div key={dow} className="min-w-0">
                <div className={`text-center text-xs font-bold py-1 rounded-t-md ${
                  dow === todayDow ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {DAYS[dow]}
                  {dow === todayDow && <span className="ml-1">•</span>}
                </div>
                <div className="space-y-1 p-1 min-h-24 bg-muted/20 rounded-b-md">
                  {(byDay[dow] ?? []).map((s) => (
                    <Link key={s.id} href={`/dashboard/calendar/${s.id}`}>
                      <div className="p-1.5 rounded bg-background border hover:border-primary transition-colors text-xs">
                        <p className="font-medium truncate">{s.name}</p>
                        <p className="text-muted-foreground">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</p>
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
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end shrink-0">
                        {days.map((d) => (
                          <span key={d} className={`text-xs px-1.5 py-0.5 rounded font-medium ${DAY_COLORS[DAYS.indexOf(d)]}`}>
                            {d}
                          </span>
                        ))}
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
