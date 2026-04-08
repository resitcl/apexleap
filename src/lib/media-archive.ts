/**
 * Utilidades para archivo de contenido del Media Hub (mes / semana del mes).
 */

/** Número de semana dentro del mes (1–5): días 1–7, 8–14, …, 29–fin */
export function weekOfMonthFromDate(isoDate: string): number {
  const d = new Date(isoDate + 'T12:00:00')
  const day = d.getDate()
  return Math.min(5, Math.ceil(day / 7))
}

/** Suma un día a una fecha `YYYY-MM-DD` (UTC) para rangos exclusivos en consultas. */
export function addOneDayIso(isoDate: string): string {
  const [y, mo, d] = isoDate.split('-').map(Number)
  if (!y || !mo || !d) return isoDate
  const t = new Date(Date.UTC(y, mo - 1, d + 1))
  return t.toISOString().slice(0, 10)
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

type WithDate = { media_date: string | null; created_at?: string | null }

/** Fecha YYYY-MM-DD para agrupar: prioriza media_date; si falta, el día de created_at. */
export function effectiveMediaDay(item: WithDate): string | null {
  if (item.media_date) return item.media_date
  const c = item.created_at
  if (typeof c === 'string' && c.length >= 10) return c.slice(0, 10)
  return null
}

/**
 * Fecha por defecto al publicar desde el archivo (coherente con mes/año/semana de la URL).
 * Si estás viendo "Semana 2 de Marzo", la fecha sugerida es el inicio de esa semana (8 Mar),
 * no el 1 de marzo ni "hoy" en abril.
 */
export function defaultContentDateForUpload(
  selectedYear: number,
  monthKey: string | undefined,
  weekOfMonth?: number,
): string {
  const now = new Date()
  const yNow = now.getFullYear()
  const moNow = now.getMonth() + 1
  const dayNow = now.getDate()
  const todayStr = `${yNow}-${String(moNow).padStart(2, '0')}-${String(dayNow).padStart(2, '0')}`

  if (!monthKey) {
    if (yNow === selectedYear) return todayStr
    return `${selectedYear}-01-01`
  }

  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return todayStr

  if (weekOfMonth && weekOfMonth >= 1 && weekOfMonth <= 5) {
    const r = weekOfMonthRange(monthKey, weekOfMonth)
    if (r) {
      if (yNow === y && moNow === m && dayNow >= parseInt(r.start.slice(8), 10) && dayNow <= parseInt(r.end.slice(8), 10)) {
        return todayStr
      }
      return r.start
    }
  }

  if (yNow === y && moNow === m) return todayStr
  return `${y}-${String(m).padStart(2, '0')}-01`
}

export function groupMediaByWeek<T extends WithDate>(items: T[]): Map<number, T[]> {
  const map = new Map<number, T[]>()
  for (const item of items) {
    const day = effectiveMediaDay(item)
    if (!day) continue
    const w = weekOfMonthFromDate(day)
    if (!map.has(w)) map.set(w, [])
    map.get(w)!.push(item)
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => (effectiveMediaDay(b) ?? '').localeCompare(effectiveMediaDay(a) ?? ''))
  }
  return map
}
