/**
 * Reglas compartidas: día/hora en zona del club, ventana post-sesión y geofencing.
 */

export const CHECK_IN_GRACE_AFTER_END_MIN = 30

export function calendarDateInTimeZone(d: Date, timeZone: string): string {
  return d.toLocaleDateString('en-CA', { timeZone })
}

export function weekdayInTimeZone(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).formatToParts(d)
  const dayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayStr)
}

export function minutesSinceMidnightInTimeZone(d: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

export function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export type ScheduleForCheckIn = {
  id: string
  name: string
  day_of_week: number[] | null
  start_time: string
  end_time: string
  start_date: string
  end_date: string | null
}

/** Sesiones de hoy en la sede que aún admiten check-in (misma ventana que lista por venue). */
export function filterSchedulesForVenueCheckInToday(
  schedules: ScheduleForCheckIn[],
  now: Date,
  timeZone: string
): ScheduleForCheckIn[] {
  const dow = weekdayInTimeZone(now, timeZone)
  const todayStr = calendarDateInTimeZone(now, timeZone)
  const nowM = minutesSinceMidnightInTimeZone(now, timeZone)

  return schedules
    .filter((s) => {
      if (!s.day_of_week?.includes(dow)) return false
      if (todayStr < s.start_date) return false
      if (s.end_date && todayStr > s.end_date) return false
      const endM = parseTimeToMinutes(s.end_time) + CHECK_IN_GRACE_AFTER_END_MIN
      return endM >= nowM
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

/**
 * Entre los horarios del día en la sede, elige el bloque más coherente con la hora actual
 * (sesión en curso más reciente, o la próxima por `start_time`).
 */
export function resolveScheduleForQrCheckIn(
  schedules: ScheduleForCheckIn[],
  now: Date,
  timeZone: string
): ScheduleForCheckIn | null {
  const candidates = filterSchedulesForVenueCheckInToday(schedules, now, timeZone)
  if (candidates.length === 0) return null

  const nowM = minutesSinceMidnightInTimeZone(now, timeZone)
  const started = candidates.filter((s) => parseTimeToMinutes(s.start_time) <= nowM)
  if (started.length > 0) {
    return started.reduce((a, b) => (a.start_time > b.start_time ? a : b))
  }
  return candidates[0]
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** True si la sede exige coordenadas del usuario para validar distancia. */
export function venueRequiresGeofence(venue: {
  lat: unknown
  lng: unknown
  geofence_radius: unknown
}): boolean {
  if (venue.lat == null || venue.lng == null || venue.geofence_radius == null) return false
  return Number(venue.geofence_radius) > 0
}
