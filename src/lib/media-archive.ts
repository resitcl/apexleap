/**
 * Utilidades para archivo de contenido del Media Hub (mes / semana del mes).
 */

/** Número de semana dentro del mes (1–5): días 1–7, 8–14, …, 29–fin */
export function weekOfMonthFromDate(isoDate: string): number {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDate()
  return Math.min(5, Math.ceil(day / 7))
}

export function weekOfMonthRange(
  monthKey: string,
  week: number
): { start: string; end: string } | null {
  if (week < 1 || week > 5) return null
  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m) return null
  const daysInMonth = new Date(y, m, 0).getDate()
  const startDay = (week - 1) * 7 + 1
  if (startDay > daysInMonth) return null
  const endDay = Math.min(week * 7, daysInMonth)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    start: `${y}-${pad(m)}-${pad(startDay)}`,
    end: `${y}-${pad(m)}-${pad(endDay)}`,
  }
}

export function monthLabelEs(monthKey: string): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  const [y, m] = monthKey.split('-').map(Number)
  if (!m || m < 1 || m > 12) return monthKey
  return `${months[m - 1]} ${y}`
}

export function weekLabelEs(monthKey: string, week: number): string {
  const r = weekOfMonthRange(monthKey, week)
  if (!r) return `Semana ${week}`
  const a = new Date(r.start + 'T12:00:00').getDate()
  const b = new Date(r.end + 'T12:00:00').getDate()
  const monthShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const [_, m] = monthKey.split('-').map(Number)
  const ms = monthShort[(m ?? 1) - 1] ?? ''
  return `Semana ${week} (${a}–${b} ${ms})`
}

type WithDate = { media_date: string | null }

export function groupMediaByWeek<T extends WithDate>(items: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>()
  for (const item of items) {
    if (!item.media_date) continue
    const w = weekOfMonthFromDate(item.media_date)
    if (!map.has(w)) map.set(w, [])
    map.get(w)!.push(item)
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => (b.media_date ?? '').localeCompare(a.media_date ?? ''))
  }
  return map
}
