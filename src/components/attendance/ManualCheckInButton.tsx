'use client'

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { checkIn } from "@/lib/actions/attendance"
import { ClipboardCheck } from "lucide-react"

interface ScheduleOption {
  id: string
  name: string
  /** "HH:MM:SS" o "HH:MM" */
  start_time: string
  end_time: string
  /** 0=domingo … 6=sábado, formato Postgres `int[]`. */
  day_of_week: number[]
}

interface Props {
  athletes: { id: string; name: string }[]
  schedules: ScheduleOption[]
  /** `scheduleId -> athleteIds[]` con quienes ya marcaron hoy en esa sesión. */
  presentBySession?: Record<string, string[]>
}

const CHILE_TZ = "America/Santiago"
const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

function chileNow(): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CHILE_TZ,
      year: "numeric", month: "numeric", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAY_MAP[parts.weekday as string] ?? 0,
  }
}

/** Próxima fecha local Chile (year/month/day y minutos desde medianoche) en que se imparte la sesión. */
function nextOccurrence(
  s: ScheduleOption,
  now: ReturnType<typeof chileNow>
): { year: number; month: number; day: number; weekday: number; minutesFromNow: number } | null {
  if (!s.day_of_week || s.day_of_week.length === 0) return null
  const [startH, startM] = s.start_time.split(":").map(Number)
  const [endH, endM] = s.end_time.split(":").map(Number)
  const days = new Set(s.day_of_week)
  const nowMinutes = now.hour * 60 + now.minute

  for (let offset = 0; offset < 8; offset++) {
    const wd = (now.weekday + offset) % 7
    if (!days.has(wd)) continue
    if (offset === 0 && nowMinutes >= endH * 60 + endM) continue

    const baseUTC = Date.UTC(now.year, now.month - 1, now.day) + offset * 86_400_000
    const d = new Date(baseUTC)
    const minutesFromNow = offset * 24 * 60 + (startH * 60 + startM) - nowMinutes
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      weekday: wd,
      minutesFromNow,
    }
  }
  return null
}

function formatOccurrence(occ: ReturnType<typeof nextOccurrence>): string {
  if (!occ) return "(sin próximas fechas)"
  const dt = new Date(Date.UTC(occ.year, occ.month - 1, occ.day))
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short", day: "numeric", month: "short",
    timeZone: "UTC",
  }).format(dt)
}

function hhmm(t: string): string {
  return (t ?? "").slice(0, 5)
}

export function ManualCheckInButton({ athletes, schedules, presentBySession = {} }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [scheduleId, setScheduleId] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)

  /** Opciones enriquecidas con próxima ocurrencia y ordenadas por proximidad. */
  const options = useMemo(() => {
    const now = chileNow()
    return schedules
      .map((s) => ({ schedule: s, occ: nextOccurrence(s, now) }))
      .sort((a, b) => {
        const am = a.occ?.minutesFromNow ?? Number.POSITIVE_INFINITY
        const bm = b.occ?.minutesFromNow ?? Number.POSITIVE_INFINITY
        return am - bm
      })
  }, [schedules])

  /** Sesión más próxima — preseleccionada al abrir. */
  const defaultScheduleId = options.find((o) => o.occ)?.schedule.id ?? ""

  useEffect(() => {
    if (open && !scheduleId && defaultScheduleId) {
      setScheduleId(defaultScheduleId)
    }
  }, [open, scheduleId, defaultScheduleId])

  const presentSet = useMemo(
    () => new Set(scheduleId ? (presentBySession[scheduleId] ?? []) : []),
    [presentBySession, scheduleId]
  )
  const filtered = useMemo(
    () => athletes.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [athletes, search]
  )

  const selectedOption = options.find((o) => o.schedule.id === scheduleId)

  async function handleSubmit() {
    if (!scheduleId) {
      toast.error("Selecciona un entrenamiento/sesión")
      return
    }
    const candidates = selectedIds.filter((id) => !presentSet.has(id))
    if (candidates.length === 0) {
      toast.error("Selecciona al menos un jugador pendiente")
      return
    }
    setLoading(true)
    try {
      const results = await Promise.allSettled(
        candidates.map((athleteId) => checkIn({ athleteId, scheduleId }))
      )
      const ok = results.filter((r) => r.status === "fulfilled").length
      const failed = results.length - ok
      if (ok > 0) {
        toast.success(`Asistencia registrada para ${ok} jugador${ok === 1 ? "" : "es"}`)
      }
      if (failed > 0) {
        toast.warning(`${failed} no se pudieron registrar (ya marcados o con error)`)
      }
      setOpen(false)
      setSelectedIds([])
      setScheduleId("")
      setSearch("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar asistencia")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <ClipboardCheck className="w-4 h-4" />
        Toma Manual
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Toma de Asistencia Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Entrenamiento
              </label>
              <select
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccionar entrenamiento/sesión...</option>
                {options.map(({ schedule, occ }) => (
                  <option key={schedule.id} value={schedule.id}>
                    {formatOccurrence(occ)} · {hhmm(schedule.start_time)}–{hhmm(schedule.end_time)} · {schedule.name}
                  </option>
                ))}
              </select>
              {selectedOption?.occ && (
                <p className="text-xs text-muted-foreground capitalize">
                  Tomando lista para <span className="font-medium text-foreground">{formatOccurrence(selectedOption.occ)}</span>
                  {" · "}
                  <span className="font-medium text-foreground">{hhmm(selectedOption.schedule.start_time)}–{hhmm(selectedOption.schedule.end_time)}</span>
                </p>
              )}
              {scheduleId && !selectedOption?.occ && (
                <p className="text-xs text-amber-600">
                  Esta sesión no tiene días configurados; igual puedes registrar la asistencia con la fecha de hoy.
                </p>
              )}
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jugador..."
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="max-h-80 overflow-y-auto border rounded-md divide-y">
              {filtered.map((a) => {
                const checked = selectedIds.includes(a.id)
                const alreadyPresent = presentSet.has(a.id)
                return (
                  <label key={a.id} className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${alreadyPresent ? "opacity-60" : ""}`}>
                    <span className="truncate">{a.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {alreadyPresent && <span className="text-xs text-green-600 font-medium">Ya presente</span>}
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={alreadyPresent || loading}
                        onChange={() => {
                          setSelectedIds((prev) => (prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]))
                        }}
                      />
                    </div>
                  </label>
                )
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Sin jugadores para mostrar</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || selectedIds.length === 0 || !scheduleId}>
              {loading ? "Registrando..." : `Registrar ${selectedIds.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
