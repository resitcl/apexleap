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

/**
 * Calculate the end date of a billing period given start date and cycle.
 */
export function calculatePeriodEnd(startDate: Date, cycle: BillingCycle): Date | null {
  if (cycle === 'single') return null
  
  const months = CYCLE_MONTHS[cycle]
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + months)
  endDate.setDate(endDate.getDate() - 1) // Last day of period
  return endDate
}

/**
 * Calculate the next period start date.
 */
export function calculateNextPeriodStart(currentStart: Date, cycle: BillingCycle): Date | null {
  if (cycle === 'single') return null
  
  const months = CYCLE_MONTHS[cycle]
  const nextStart = new Date(currentStart)
  nextStart.setMonth(nextStart.getMonth() + months)
  return nextStart
}

/** Normaliza YYYY-MM-DD desde string DB o input date. */
function normYmd(s: string | null | undefined): string | null {
  if (!s || s.length < 10) return null
  return s.slice(0, 10)
}

/**
 * Fechas de suscripción al activar un pago: usa inicio/fin de período del pago si existen;
 * si no, cae en paidAt (comportamiento anterior).
 * Así el próximo cobro sigue el ciclo del período cubierto y no “salta” un mes por usar solo la fecha de pago.
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
  const anchor = ps ? new Date(`${ps}T12:00:00`) : opts.paidAt
  const startStr = ps ?? opts.paidAt.toISOString().split('T')[0]

  let endStr: string | null
  if (pe) endStr = pe
  else {
    const end = calculatePeriodEnd(anchor, cycle)
    endStr = end ? end.toISOString().split('T')[0] : null
  }

  const nextStart = calculateNextPeriodStart(anchor, cycle)
  const nextBillingStr = nextStart ? nextStart.toISOString().split('T')[0] : null
  const billingAnchorDay = getBillingAnchorDay(anchor)

  return { startStr, endStr, nextBillingStr, billingAnchorDay }
}

/**
 * Get the billing anchor day (day of month when billing should occur).
 * Uses the original subscription start date's day.
 */
export function getBillingAnchorDay(startDate: Date): number {
  const day = startDate.getDate()
  // Cap at 28 to avoid issues with shorter months
  return Math.min(day, 28)
}

/**
 * Calculate what the period start should be for a late payment.
 * If someone is paying late, their period should still start from when it was due.
 * 
 * Example:
 * - Subscription started: Jan 15
 * - Billing anchor: 15th of each month
 * - Current date: Mar 20 (paying late)
 * - Should cover: Mar 15 → Apr 14 (not Mar 20 → Apr 19)
 */
export function calculatePeriodStartForPayment(
  billingAnchorDay: number,
  paymentDate: Date,
  cycle: BillingCycle
): { periodStart: Date; periodEnd: Date | null; isLate: boolean } {
  const year = paymentDate.getFullYear()
  const month = paymentDate.getMonth()
  const currentDay = paymentDate.getDate()
  
  // Determine which period this payment is for
  let periodStart: Date
  
  if (currentDay >= billingAnchorDay) {
    // Payment is on or after anchor day - covers current month's period
    periodStart = new Date(year, month, billingAnchorDay)
  } else {
    // Payment is before anchor day - might be early for next period or late for previous
    // Assume it's late for the previous period
    periodStart = new Date(year, month - 1, billingAnchorDay)
  }
  
  const periodEnd = calculatePeriodEnd(periodStart, cycle)
  const isLate = paymentDate > periodStart
  
  return { periodStart, periodEnd, isLate }
}

/**
 * Generate all overdue periods between last paid period and current date.
 * Used for "catch-up" payments when an athlete has multiple unpaid periods.
 */
export function generateOverduePeriods(
  lastPaidPeriodEnd: Date | null,
  billingAnchorDay: number,
  cycle: BillingCycle,
  currentDate: Date = new Date()
): Array<{ periodStart: Date; periodEnd: Date; dueDate: Date }> {
  if (cycle === 'single') return []
  
  const periods: Array<{ periodStart: Date; periodEnd: Date; dueDate: Date }> = []
  
  // Start from the day after the last paid period ended
  let nextPeriodStart: Date
  if (lastPaidPeriodEnd) {
    nextPeriodStart = new Date(lastPaidPeriodEnd)
    nextPeriodStart.setDate(nextPeriodStart.getDate() + 1)
  } else {
    // No previous payment - start from current month's anchor
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    nextPeriodStart = new Date(year, month, billingAnchorDay)
    
    // If anchor day hasn't passed yet, go back one period
    if (currentDate.getDate() < billingAnchorDay) {
      nextPeriodStart.setMonth(nextPeriodStart.getMonth() - CYCLE_MONTHS[cycle])
    }
  }
  
  // Generate all periods up to current date
  while (nextPeriodStart <= currentDate) {
    const periodEnd = calculatePeriodEnd(nextPeriodStart, cycle)
    if (!periodEnd) break
    
    periods.push({
      periodStart: new Date(nextPeriodStart),
      periodEnd: new Date(periodEnd),
      dueDate: new Date(nextPeriodStart), // Due date = period start
    })
    
    // Move to next period
    nextPeriodStart = calculateNextPeriodStart(nextPeriodStart, cycle)!
  }
  
  return periods
}

/**
 * Format a date range for display.
 */
export function formatPeriod(start: Date, end: Date | null, locale = 'es-CL'): string {
  const startStr = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  if (!end) return `Desde ${startStr}`
  const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

/**
 * Format a date range with year for clarity.
 */
export function formatPeriodFull(start: Date, end: Date | null, locale = 'es-CL'): string {
  const startStr = start.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  if (!end) return `Desde ${startStr}`
  const endStr = end.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  return `${startStr} al ${endStr}`
}

/**
 * Check if a date is within a period.
 */
export function isDateInPeriod(date: Date, periodStart: Date, periodEnd: Date | null): boolean {
  if (!periodEnd) return date >= periodStart
  return date >= periodStart && date <= periodEnd
}

/**
 * Calculate days remaining in a period.
 */
export function daysRemainingInPeriod(periodEnd: Date | null, currentDate: Date = new Date()): number | null {
  if (!periodEnd) return null
  const diffTime = periodEnd.getTime() - currentDate.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if a subscription period is about to expire (within N days).
 */
export function isExpiringWithinDays(periodEnd: Date | null, days: number, currentDate: Date = new Date()): boolean {
  const remaining = daysRemainingInPeriod(periodEnd, currentDate)
  return remaining !== null && remaining >= 0 && remaining <= days
}

/**
 * Determine subscription status based on payment history and current date.
 */
export function determineSubscriptionStatus(
  lastPaidPeriodEnd: Date | null,
  currentDate: Date = new Date()
): 'active' | 'grace_period' | 'expired' | 'never_paid' {
  if (!lastPaidPeriodEnd) return 'never_paid'
  
  const daysAfterExpiry = Math.ceil(
    (currentDate.getTime() - lastPaidPeriodEnd.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysAfterExpiry <= 0) return 'active'
  if (daysAfterExpiry <= 3) return 'grace_period' // 3 day grace period
  return 'expired'
}

/**
 * Calculate total amount owed for multiple periods.
 */
export function calculateCatchUpAmount(
  periodsCount: number,
  pricePerPeriod: number,
  discount: number = 0 // Percentage discount for paying multiple at once
): { subtotal: number; discount: number; total: number } {
  const subtotal = periodsCount * pricePerPeriod
  const discountAmount = subtotal * (discount / 100)
  const total = subtotal - discountAmount
  
  return {
    subtotal,
    discount: discountAmount,
    total,
  }
}
