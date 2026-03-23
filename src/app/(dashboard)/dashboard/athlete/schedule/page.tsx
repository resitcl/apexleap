export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Trophy, Users } from "lucide-react"

const DOW_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

export default async function AthleteSchedulePage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = new Date()
  const todayDow = today.getDay()
  const todayStr = today.toISOString().slice(0, 10)
  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)

  const schedulesRes = await supabase
    .from("schedules")
    .select("id, name, description, day_of_week, start_time, end_time, capacity, venues(name)")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("start_time")

  type Schedule = {
    id: string; name: string; description: string | null
    day_of_week: number[]; start_time: string; end_time: string
    capacity: number | null; venues: { name: string } | null
  }
  type Competition = { id: string; name: string; type: string; start_date: string; end_date: string | null; location: string | null; description: string | null }

  const schedules = (schedulesRes.data ?? []) as unknown as Schedule[]

  let competitions: Competition[] = []
  try {
    const { data } = await supabase
      .from("competitions")
      .select("id, name, type, start_date, end_date, location, description")
      .eq("club_id", clubId)
      .gte("start_date", todayStr)
      .lte("start_date", in30Days.toISOString().slice(0, 10))
      .order("start_date")
      .limit(10)
    competitions = (data ?? []) as Competition[]
  } catch { /* table may not exist */ }

  // Build weekly grid: Mon-Sun
  const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]
  const byDay: Record<number, Schedule[]> = {}
  for (const s of schedules) {
    for (const d of (s.day_of_week ?? [])) {
      if (!byDay[d]) byDay[d] = []
      byDay[d].push(s)
    }
  }

  // Today's classes
  const todaySchedules = (byDay[todayDow] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time))
  const nowTime = today.toTimeString().slice(0, 5)
  const nextClass = todaySchedules.find((s) => s.start_time >= nowTime) ?? todaySchedules[todaySchedules.length - 1] ?? null

  // Next 7 days upcoming
  const upcoming: { dow: number; dateStr: string; label: string; sessions: Schedule[] }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    const sessions = (byDay[dow] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time))
    if (sessions.length > 0) {
      upcoming.push({
        dow,
        dateStr: d.toISOString().slice(0, 10),
        label: i === 0 ? "Hoy" : i === 1 ? "Mañana" : DOW_SHORT[dow],
        sessions,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Horarios y Calendario</h1>
        <p className="text-muted-foreground capitalize">
          {today.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Next class highlight */}
      {nextClass && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {nextClass.start_time >= nowTime ? "Próxima clase hoy" : "Última clase del día"}
              </p>
              <p className="font-bold text-lg leading-tight">{nextClass.name}</p>
              <p className="text-sm text-muted-foreground">
                🕐 {nextClass.start_time.slice(0, 5)} – {nextClass.end_time.slice(0, 5)}
                {(nextClass.venues as { name: string } | null)?.name && (
                  <span className="ml-2">· 📍 {(nextClass.venues as { name: string }).name}</span>
                )}
              </p>
            </div>
            {nextClass.capacity && (
              <div className="text-right shrink-0">
                <Users className="w-4 h-4 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">{nextClass.capacity} cupos</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming 7 days */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Próximos 7 Días
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay clases programadas próximamente.</p>
          ) : (
            <div className="space-y-4">
              {upcoming.map((day) => (
                <div key={day.dateStr}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-semibold ${day.label === "Hoy" ? "text-primary" : "text-foreground"}`}>
                      {day.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(day.dateStr + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                    </span>
                    {day.label === "Hoy" && <Badge variant="default" className="text-xs px-1.5 py-0">Hoy</Badge>}
                  </div>
                  <div className="space-y-2 pl-3 border-l-2 border-primary/20">
                    {day.sessions.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground text-xs w-24 shrink-0 font-mono">
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </span>
                        <span className="font-medium">{s.name}</span>
                        {(s.venues as { name: string } | null)?.name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {(s.venues as { name: string }).name}
                          </span>
                        )}
                        {s.capacity && (
                          <span className="text-xs text-muted-foreground ml-auto">{s.capacity} cupos</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full weekly schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Horario Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ORDERED_DAYS.map((dow) => {
              const sessions = (byDay[dow] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time))
              const isToday = dow === todayDow
              return (
                <div key={dow} className={`flex gap-3 py-2 border-b border-border/50 last:border-0 ${isToday ? "opacity-100" : "opacity-70"}`}>
                  <div className={`w-10 shrink-0 text-center`}>
                    <p className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {DOW_SHORT[dow]}
                    </p>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {sessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin clases</p>
                    ) : (
                      sessions.map((s) => (
                        <div key={s.id} className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs border ${isToday ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-border"}`}>
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground">{s.start_time.slice(0, 5)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming competitions */}
      {competitions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <Trophy className="w-4 h-4" /> Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {competitions.map((c) => (
              <div key={c.id} className="flex items-start gap-3 py-2 border-b border-amber-100 last:border-0">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    📅 {new Date(c.start_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                    {c.end_date && c.end_date !== c.start_date && ` – ${new Date(c.end_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" })}`}
                    {c.location && <span className="ml-2">· 📍 {c.location}</span>}
                  </p>
                  {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">{c.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
