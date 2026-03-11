'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, Trophy, Swords, Calendar as CalendarIcon, CalendarPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { deleteEvent } from '@/lib/actions/events'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Schedule {
  id: string
  name: string
  day_of_week: number[]
  start_time: string
  end_time: string
  is_active: boolean
  venue?: { id: string; name: string } | null
}

interface CalEvent {
  kind: 'competition' | 'match' | 'event'
  id: string
  name?: string
  opponent?: string
  date: string
  location?: string | null
  is_home?: boolean
  competitionId?: string | null
  event_type?: string
  start_time?: string | null
  end_time?: string | null
  description?: string | null
}

interface Props {
  schedules: Schedule[]
  events: CalEvent[]
}

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  tournament: 'Torneo',
  seminar: 'Seminario',
  workshop: 'Taller',
  meeting: 'Reunión',
  graduation: 'Graduación',
  open_mat: 'Open Mat',
  friendly: 'Amistoso',
  exhibition: 'Exhibición',
  other: 'Evento',
}

export function CalendarView({ schedules, events }: Props) {
  const today = new Date()
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const todayStr = today.toISOString().split('T')[0]

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days: { date: string; day: number; isCurrentMonth: boolean; dow: number }[] = []
    
    // Previous month padding
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth)
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const date = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date, day: d, isCurrentMonth: false, dow: new Date(prevYear, prevMonth, d).getDay() })
    }
    
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date, day: d, isCurrentMonth: true, dow: new Date(currentYear, currentMonth, d).getDay() })
    }
    
    // Next month padding
    const remaining = 42 - days.length // 6 rows * 7 days
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
    for (let d = 1; d <= remaining; d++) {
      const date = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date, day: d, isCurrentMonth: false, dow: new Date(nextYear, nextMonth, d).getDay() })
    }
    
    return days
  }, [currentYear, currentMonth, daysInMonth, firstDay])

  // Map events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    }
    return map
  }, [events])

  // Map schedules by day of week
  const schedulesByDow = useMemo(() => {
    const map: Record<number, Schedule[]> = {}
    for (const s of schedules.filter(s => s.is_active)) {
      for (const dow of s.day_of_week) {
        if (!map[dow]) map[dow] = []
        map[dow].push(s)
      }
    }
    // Sort by start time
    for (const dow in map) {
      map[dow].sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [schedules])

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  function goToToday() {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
  }

  // Get items for selected date
  const selectedItems = useMemo(() => {
    if (!selectedDate) return { schedules: [], events: [] }
    const dow = new Date(selectedDate + 'T12:00:00').getDay()
    return {
      schedules: schedulesByDow[dow] ?? [],
      events: eventsByDate[selectedDate] ?? [],
    }
  }, [selectedDate, schedulesByDow, eventsByDate])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={goToToday}>
          Hoy
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted">
          {DAYS_SHORT.map((d, i) => (
            <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 || i === 6 ? 'text-muted-foreground' : ''}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, day, isCurrentMonth, dow }) => {
            const isToday = date === todayStr
            const isSelected = date === selectedDate
            const daySchedules = schedulesByDow[dow] ?? []
            const dayEvents = eventsByDate[date] ?? []
            const hasItems = daySchedules.length > 0 || dayEvents.length > 0
            const isWeekend = dow === 0 || dow === 6

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date === selectedDate ? null : date)}
                className={`
                  min-h-[80px] p-1 border-t border-r text-left transition-colors relative
                  ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                  ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                  ${isToday ? 'bg-primary/5' : ''}
                  hover:bg-accent/50
                `}
              >
                <span className={`
                  text-sm font-medium inline-flex items-center justify-center w-6 h-6 rounded-full
                  ${isToday ? 'bg-primary text-primary-foreground' : ''}
                  ${!isCurrentMonth ? 'text-muted-foreground/50' : isWeekend ? 'text-muted-foreground' : ''}
                `}>
                  {day}
                </span>

                {/* Indicators */}
                <div className="mt-0.5 space-y-0.5">
                  {daySchedules.slice(0, 2).map(s => (
                    <div key={s.id} className="text-[10px] truncate px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                      {s.start_time.slice(0, 5)} {s.name}
                    </div>
                  ))}
                  {daySchedules.length > 2 && (
                    <div className="text-[10px] text-muted-foreground px-1">+{daySchedules.length - 2} más</div>
                  )}
                  {dayEvents.map(ev => (
                    <div 
                      key={ev.id} 
                      className={`text-[10px] truncate px-1 py-0.5 rounded ${
                        ev.kind === 'competition' ? 'bg-purple-100 text-purple-700' :
                        ev.kind === 'event' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}
                    >
                      {ev.kind === 'match' ? `vs ${ev.opponent}` : ev.name}
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className="border rounded-lg p-4 bg-card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </h3>

          {selectedItems.schedules.length === 0 && selectedItems.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay actividades programadas para este día.</p>
          ) : (
            <div className="space-y-3">
              {/* Schedules */}
              {selectedItems.schedules.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sesiones recurrentes</p>
                  <div className="space-y-2">
                    {selectedItems.schedules.map(s => (
                      <Link key={s.id} href={`/dashboard/calendar/${s.id}`}>
                        <div className="p-3 rounded-lg border bg-background hover:border-primary transition-colors">
                          <p className="font-medium text-sm">{s.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                            </span>
                            {s.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {s.venue.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Events */}
              {selectedItems.events.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Eventos</p>
                  <div className="space-y-2">
                    {selectedItems.events.map(ev => {
                      const isCustomEvent = ev.kind === 'event'
                      const href = ev.kind === 'competition'
                        ? `/dashboard/competitions/${ev.id}`
                        : ev.competitionId
                          ? `/dashboard/competitions/${ev.competitionId}`
                          : undefined

                      const card = (
                        <div className="p-3 rounded-lg border bg-background hover:border-primary transition-colors flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            ev.kind === 'competition' ? 'bg-purple-100' :
                            ev.kind === 'event' ? 'bg-orange-100' :
                            'bg-green-100'
                          }`}>
                            {ev.kind === 'competition'
                              ? <Trophy className="w-4 h-4 text-purple-600" />
                              : ev.kind === 'event'
                                ? <CalendarPlus className="w-4 h-4 text-orange-600" />
                                : <Swords className="w-4 h-4 text-green-600" />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">
                              {ev.kind === 'match' ? `vs. ${ev.opponent}` : ev.name}
                            </p>
                            {isCustomEvent && ev.event_type && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                                {EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type}
                              </span>
                            )}
                            {ev.start_time && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {ev.start_time.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ''}
                              </p>
                            )}
                            {ev.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {ev.location}
                              </p>
                            )}
                            {isCustomEvent && ev.description && (
                              <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>
                            )}
                          </div>
                          {ev.kind === 'match' && ev.is_home !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              ev.is_home ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {ev.is_home ? 'Local' : 'Visita'}
                            </span>
                          )}
                          {isCustomEvent && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (!confirm('¿Eliminar este evento?')) return
                                try {
                                  await deleteEvent(ev.id)
                                  toast.success('Evento eliminado')
                                  router.refresh()
                                } catch { toast.error('Error al eliminar') }
                              }}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              title="Eliminar evento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )

                      return href ? (
                        <Link key={ev.id} href={href}>{card}</Link>
                      ) : (
                        <div key={ev.id}>{card}</div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-100" /> Sesiones
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-100" /> Eventos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-100" /> Competencias
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-100" /> Partidos
        </span>
      </div>
    </div>
  )
}
