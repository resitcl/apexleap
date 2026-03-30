export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"
import { getEvents } from "@/lib/actions/events"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Trophy, Users, CalendarDays, Star, Info } from "lucide-react"

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

  let upcomingClubEvents: Awaited<ReturnType<typeof getEvents>> = []
  try {
    const allEvents = await getEvents({ from: todayStr })
    upcomingClubEvents = allEvents.filter((e) => e.is_visible_to_athletes !== false)
  } catch { /* silent */ }

  const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]
  const byDay: Record<number, Schedule[]> = {}
  for (const s of schedules) {
    for (const d of (s.day_of_week ?? [])) {
      if (!byDay[d]) byDay[d] = []
      byDay[d].push(s)
    }
  }


  // Next 7 days starting from today
  const upcoming7: { date: Date; dateStr: string; dow: number; sessions: Schedule[] }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    const sessions = (byDay[dow] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time))
    upcoming7.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      dow,
      sessions,
    })
  }

  return (
    <div className="space-y-12 pb-12 pt-1">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-3">
            <CalendarDays className="w-10 h-10 text-primary" /> Agenda y Eventos
          </h1>
          <p className="text-sm md:text-base text-muted-foreground/80 mt-3 max-w-xl font-medium">
            Optimiza tu ritmo de entrenamiento. Administra tus rutinas semanales recurrentes y tus compromisos de alto nivel, adaptables al entorno del club.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-4 py-2 font-black tracking-widest text-[11px] uppercase bg-muted/20 border border-white/[0.04]">
            <Calendar className="w-3.5 h-3.5 mr-2 text-primary" /> Hoy, {today.getDate()} de {today.toLocaleDateString("es-CL", { month: "short" })}
          </Badge>
        </div>
      </div>

      {/* HORARIO VERTICAL COLUMNAS (THE GRID) */}
      <div className="rounded-2xl border border-white/[0.04] bg-card overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1000px] grid grid-cols-7 divide-x divide-white/[0.04]">
            {upcoming7.map((dayColumn, i) => {
              const isToday = i === 0
              return (
                <div key={dayColumn.dateStr} className={`flex flex-col transition-colors ${isToday ? "bg-primary/5" : "hover:bg-muted/10"}`}>
                  {/* Column Header */}
                  <div className="py-6 flex flex-col items-center justify-center border-b border-white/[0.04]">
                    <span className={`text-[10px] uppercase font-black tracking-[0.2em] ${isToday ? "text-primary" : "text-muted-foreground/60"}`}>
                      {DOW_SHORT[dayColumn.dow]}
                    </span>
                    <span className={`text-2xl font-black mt-1 tracking-tighter ${isToday ? "text-primary drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "text-foreground"}`}>
                      {dayColumn.date.getDate()}
                    </span>
                  </div>

                  {/* Column Body */}
                  <div className="p-3 min-h-[500px] flex flex-col gap-3 relative group">
                    {dayColumn.sessions.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/20 italic rotate-[-15deg]">
                          Recovery Day
                        </span>
                      </div>
                    ) : (
                      dayColumn.sessions.map((s) => (
                        <div key={`${dayColumn.dateStr}-${s.id}`} className="flex flex-col p-3 rounded-lg bg-muted/30 border border-white/[0.02] border-l-2 border-l-primary hover:bg-muted/50 transition-colors shadow-sm">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 inline-flex items-center gap-1.5">
                            <Clock className="w-3 h-3" /> {s.start_time.slice(0, 5)} {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                          </span>
                          <span className="text-sm font-bold text-foreground leading-tight">{s.name}</span>
                          
                          {(s.venues as { name: string } | null)?.name && (
                            <span className="text-[10px] font-bold text-muted-foreground mt-3 flex items-center gap-1.5 uppercase tracking-wider">
                              <MapPin className="w-3 h-3" /> {(s.venues as { name: string }).name}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: UPCOMING EVENTS & FOCUS */}
      <div className="grid lg:grid-cols-3 gap-8 pt-8 border-t border-border/30">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black tracking-tight uppercase flex items-center justify-between">
            <span>Próximos Eventos Especiales</span>
            <span className="text-[10px] text-primary cursor-pointer hover:underline flex items-center gap-1">VER CALENDARIO COMPLETO <Clock className="w-3 h-3" /></span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Si no hay ni eventos ni competencias */}
            {upcomingClubEvents.length === 0 && competitions.length === 0 && (
              <div className="sm:col-span-2 p-12 text-center rounded-2xl border border-dashed border-white/[0.05] bg-muted/10">
                <p className="text-muted-foreground font-medium text-sm">No hay eventos especiales programados esta temporada.</p>
              </div>
            )}
            
            {/* Eventos */}
            {upcomingClubEvents.map((ev) => {
              const evDate = new Date(ev.event_date + "T12:00:00")
              return (
                <div key={ev.id} className="group relative rounded-2xl overflow-hidden border border-white/[0.05] shadow-sm bg-card hover:border-primary/30 transition-colors aspect-video flex flex-col justify-end p-5">
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/5 z-0" />
                  
                  <div className="relative z-10 flex flex-col gap-2">
                    {ev.event_type && (
                      <span className="self-start text-[9px] uppercase font-black tracking-widest bg-yellow-500 text-black px-2 py-0.5 rounded-sm shadow-sm">
                        {ev.event_type}
                      </span>
                    )}
                    <h3 className="text-lg font-black leading-tight text-white group-hover:text-primary transition-colors">{ev.name}</h3>
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-300">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 opacity-70" /> {evDate.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })}</span>
                      {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 opacity-70" /> {ev.location}</span>}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Competencias */}
            {competitions.map((c) => {
              const evDate = new Date(c.start_date + "T12:00:00")
              return (
                <div key={c.id} className="group relative rounded-2xl overflow-hidden border border-white/[0.05] shadow-sm bg-card hover:border-primary/30 transition-colors aspect-video flex flex-col justify-end p-5">
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/5 z-0" />
                  
                  <div className="relative z-10 flex flex-col gap-2">
                    <span className="self-start text-[9px] uppercase font-black tracking-widest bg-red-600 text-white px-2 py-0.5 rounded-sm shadow-sm">
                      Módulo de Torneo
                    </span>
                    <h3 className="text-lg font-black leading-tight text-white group-hover:text-primary transition-colors">{c.name}</h3>
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-300">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 opacity-70" /> {evDate.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })}</span>
                      {c.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 opacity-70" /> {c.location}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Right column pseudo-stats */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight uppercase flex items-center justify-between">
            Resumen Semanal
          </h2>
          <Card className="rounded-2xl bg-card border border-white/[0.04] p-6 shadow-sm">
            <div className="flex items-start justify-between border-b border-border/30 pb-6 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                 <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clases Totales</p>
                <p className="text-3xl font-black tracking-tighter text-foreground mt-1">{Object.values(byDay).flat().length}</p>
                <p className="text-[10px] font-bold text-muted-foreground">En tu semana actual</p>
              </div>
            </div>
            
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground/80">Recurrencia</span>
                    <span className="font-bold text-primary">Alto</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="w-[85%] h-full bg-primary" />
                  </div>
               </div>
               <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground/80">Eventos</span>
                    <span className="font-bold text-yellow-500">{upcomingClubEvents.length + competitions.length}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="w-[25%] h-full bg-yellow-500" />
                  </div>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
