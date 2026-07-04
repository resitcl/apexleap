/**
 * Billing Utilities
 * Handles period calculations, catch-up payments, and billing logic
 */

export type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'single'

export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
  single: 0,
}

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
  single: 'Único',
}

/** Parsea YYYY-MM-DD sin desfase de timezone (mediodía local). */
export function parseYmd(ymd: string): Date {
  return new Date(`${ymd.slice(0, 10)}T12:00:00`)
}

/** Fecha local de hoy en YYYY-MM-DD. */
export function todayYmd(): string {
  const now = new Date()
  return ymdFromDate(now)
}

/** Convierte Date a YYYY-MM-DD en hora local. */
export function ymdFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Suma meses evitando desbordamiento de setMonth (p.ej. 31 ene + 1 mes → 28/29 feb). */
export function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(date)
  const targetDay = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(targetDay, lastDay))
  return d
}

/**
 * Calculate the end date of a billing period given start date and cycle.
 */
export function calculatePeriodEnd(startDate: Date, cycle: BillingCycle): Date | null {
  if (cycle === 'single') return null

  const endDate = addMonthsClamped(startDate, CYCLE_MONTHS[cycle])
  endDate.setDate(endDate.getDate() - 1)
  return endDate
}

/**
 * Calculate the next period start date.
 */
export function calculateNextPeriodStart(currentStart: Date, cycle: BillingCycle): Date | null {
  if (cycle === 'single') return null
  return addMonthsClamped(currentStart, CYCLE_MONTHS[cycle])
}

/** Normaliza YYYY-MM-DD desde string DB o input date. */
function normYmd(s: string | null | undefined): string | null {
  if (!s || s.length < 10) return null
  return s.slice(0, 10)
}

/**
 * Fechas de suscripción al activar un pago: usa inicio/fin de período del pago si existen;
 * si no, cae en paidAt (comportamiento anterior).
 */
export function subscriptionPeriodFieldsForPlan(
  cycle: BillingCycle,
  opts: { periodStart?: string | null; periodEnd?: string | null; paidAt: Date },
): {
  startStr: string
  endStr: string | null
  nextBillingStr: string | null
  billingAnchorDay: number
} {
  const ps = normYmd(opts.periodStart)
  const pe = normYmd(opts.periodEnd)
  const anchor = ps ? parseYmd(ps) : opts.paidAt
  const startStr = ps ?? ymdFromDate(opts.paidAt)

  let endStr: string | null
  if (pe) endStr = pe
  else {
    const end = calculatePeriodEnd(anchor, cycle)
    endStr = end ? ymdFromDate(end) : null
  }

  const nextStart = calculateNextPeriodStart(anchor, cycle)
  const nextBillingStr = nextStart ? ymdFromDate(nextStart) : null
  const billingAnchorDay = getBillingAnchorDay(anchor)

  return { startStr, endStr, nextBillingStr, billingAnchorDay }
}

/**
 * Get the billing anchor day (day of month when billing should occur).
 */
export function getBillingAnchorDay(startDate: Date): number {
  return Math.min(startDate.getDate(), 28)
}

/** Extrae el día del mes desde YYYY-MM-DD sin desfase UTC. */
export function dayOfMonthFromYmd(ymd: string): number {
  return parseYmd(ymd).getDate()
}

/**
 * Calculate what the period start should be for a payment.
 * For non-monthly cycles, aligns to the real billing cycle using referencePeriodStart.
 */
export function calculatePeriodStartForPayment(
  billingAnchorDay: number,
  paymentDate: Date,
  cycle: BillingCycle,
  referencePeriodStart?: Date | null,
): { periodStart: Date; periodEnd: Date | null; isLate: boolean } {
  if (cycle === 'single') {
    return { periodStart: paymentDate, periodEnd: null, isLate: false }
  }

  if (referencePeriodStart) {
    let periodStart = new Date(
      referencePeriodStart.getFullYear(),
      referencePeriodStart.getMonth(),
      billingAnchorDay,
    )

    if (periodStart > paymentDate) {
      let prev = periodStart
      for (let i = 0; i < 120 && prev > paymentDate; i++) {
        const back = addMonthsClamped(prev, -CYCLE_MONTHS[cycle])
        if (back.getTime() >= prev.getTime()) break
        prev = back
      }
      periodStart = prev
    } else {
      let next = calculateNextPeriodStart(periodStart, cycle)
      while (next && next <= paymentDate) {
        periodStart = next
        next = calculateNextPeriodStart(periodStart, cycle)
      }
    }

    const periodEnd = calculatePeriodEnd(periodStart, cycle)
    return { periodStart, periodEnd, isLate: paymentDate > periodStart }
  }

  const year = paymentDate.getFullYear()
  const month = paymentDate.getMonth()
  const currentDay = paymentDate.getDate()

  let periodStart: Date
  if (currentDay >= billingAnchorDay) {
    periodStart = new Date(year, month, billingAnchorDay)
  } else {
    periodStart = new Date(year, month - 1, billingAnchorDay)
  }

  if (cycle !== 'monthly') {
    let next = calculateNextPeriodStart(periodStart, cycle)
    while (next && next <= paymentDate) {
      periodStart = next
      next = calculateNextPeriodStart(periodStart, cycle)
    }
    if (paymentDate < periodStart) {
      periodStart = addMonthsClamped(periodStart, -CYCLE_MONTHS[cycle])
    }
  }

  const periodEnd = calculatePeriodEnd(periodStart, cycle)
  const isLate = paymentDate > periodStart
  return { periodStart, periodEnd, isLate }
}

/**
 * Generate all overdue periods between last paid period and current date.
 */
export function generateOverduePeriods(
  lastPaidPeriodEnd: Date | null,
  billingAnchorDay: number,
  cycle: BillingCycle,
  currentDate: Date = new Date(),
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date }> {
  if (cycle === 'single') return []

  const periods: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date }> = []

  let nextPeriodStart: Date
  if (lastPaidPeriodEnd) {
    nextPeriodStart = new Date(lastPaidPeriodEnd)
    nextPeriodStart.setDate(nextPeriodStart.getDate() + 1)
  } else {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    nextPeriodStart = new Date(year, month, billingAnchorDay)

    if (currentDate.getDate() < billingAnchorDay) {
      nextPeriodStart = addMonthsClamped(nextPeriodStart, -CYCLE_MONTHS[cycle])
    }
  }

  while (nextPeriodStart <= currentDate) {
    const periodEnd = calculatePeriodEnd(nextPeriodStart, cycle)
    if (!periodEnd) break

    periods.push({
      periodStart: new Date(nextPeriodStart),
      periodEnd: new Date(periodEnd),
      dueDate: new Date(nextPeriodStart),
    })

    const advanced = calculateNextPeriodStart(nextPeriodStart, cycle)
    if (!advanced) break
    nextPeriodStart = advanced
  }

  return periods
}

export function formatPeriod(start: Date, end: Date | null, locale = 'es-CL'): string {
  const startStr = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  if (!end) return `Desde ${startStr}`
  const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

export function formatPeriodFull(start: Date, end: Date | null, locale = 'es-CL'): string {
  const startStr = start.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  if (!end) return `Desde ${startStr}`
  const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  return `${startStr} al ${endStr}`
}

export function isDateInPeriod(date: Date, periodStart: Date, periodEnd: Date | null): boolean {
  if (!periodEnd) return date >= periodStart
  return date >= periodStart && date <= periodEnd
}

export function daysRemainingInPeriod(periodEnd: Date | null, currentDate: Date = new Date()): number | null {
  if (!periodEnd) return null
  const diffTime = periodEnd.getTime() - currentDate.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function isExpiringWithinDays(periodEnd: Date | null, days: number, currentDate: Date = new Date()): boolean {
  const remaining = daysRemainingInPeriod(periodEnd, currentDate)
  return remaining !== null && remaining >= 0 && remaining <= days
}

export function determineSubscriptionStatus(
  lastPaidPeriodEnd: Date | null,
  currentDate: Date = new Date(),
): 'active' | 'grace_period' | 'expired' | 'never_paid' {
  if (!lastPaidPeriodEnd) return 'never_paid'

  const daysAfterExpiry = Math.ceil(
    (currentDate.getTime() - lastPaidPeriodEnd.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (daysAfterExpiry <= 0) return 'active'
  if (daysAfterExpiry <= 3) return 'grace_period'
  return 'expired'
}

export function calculateCatchUpAmount(
  periodsCount: number,
  pricePerPeriod: number,
  discount: number = 0,
): { subtotal: number; discount: number; total: number } {
  const subtotal = periodsCount * pricePerPeriod
  const discountAmount = subtotal * (discount / 100)
  const total = subtotal - discountAmount

  return { subtotal, discount: discountAmount, total }
}
