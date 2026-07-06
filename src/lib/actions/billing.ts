'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, assertClubCapability } from '@/lib/actions/club-context'
import { getExpectedMonthIncome } from '@/lib/actions/finances'
import { auth, clerkClient } from '@clerk/nextjs/server'
import {
  calculatePeriodEnd,
  calculateNextPeriodStart,
  generateOverduePeriods,
  CYCLE_MONTHS,
  dayOfMonthFromYmd,
  todayYmd,
  type BillingCycle,
} from '@/lib/billing-utils'

/**
 * Get detailed payment metrics for the dashboard.
 * Includes actual income, projected income, and overdue amounts.
 */
export async function getPaymentMetrics(month?: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Default to current month
  const targetMonth = month || new Date().toISOString().slice(0, 7)
  const monthStart = `${targetMonth}-01`
  const nextMonth = new Date(targetMonth + '-01')
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const monthEnd = nextMonth.toISOString().split('T')[0]
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)
  const sixtyDaysAgo = new Date(today)
  sixtyDaysAgo.setDate(today.getDate() - 60)

  // Get all payments for analysis
  const { data: allPayments } = await supabase
    .from('payments')
    .select('id, athlete_id, amount, status, due_date, paid_at, payment_method, notes, period_start, period_end')
    .eq('club_id', clubId)

  // Get active subscriptions for projected income
  const { data: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id, athlete_id, plan_id, status, start_date,
      current_period_start, current_period_end, next_billing_date,
      plans (id, name, price, billing_cycle)
    `)
    .eq('club_id', clubId)
    .eq('status', 'active')

  const payments = allPayments ?? []
  const subscriptions = activeSubscriptions ?? []
  const expectedMonth = await getExpectedMonthIncome(targetMonth)

  const monthlyTrend = Array.from({ length: 6 }, (_, idx) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - idx), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return {
      key,
      label: d.toLocaleDateString('es-CL', { month: 'short' }),
      collected: 0,
      emitted: 0,
      overdue: 0,
    }
  })
  const monthlyTrendByKey = new Map(monthlyTrend.map((item) => [item.key, item]))
  const methodMixMap: Record<string, { amount: number; count: number }> = {}
  const duplicateCounts: Record<string, number> = {}
  const overdueAthletes = new Set<string>()

  const metrics = {
    // Actual income this month (payments marked as paid this month)
    actualIncome: 0,
    actualIncomeCount: 0,

    // Projected income (payments due this month, regardless of status)
    projectedIncome: 0,
    projectedIncomeCount: 0,

    // Expected from active subscriptions (if everyone pays)
    expectedFromSubscriptions: 0,
    activeSubscriptionsCount: subscriptions.length,

    // Overdue amounts
    totalOverdue: 0,
    overdueCount: 0,
    overdueOlderThan30Days: 0,
    overdueOlderThan60Days: 0,

    // Pending (not yet due)
    totalPending: 0,
    pendingCount: 0,

    // Collection rate this month
    collectionRate: 0,

    // Month-over-month comparison
    previousMonthActual: 0,
    monthOverMonthChange: 0,

    // Expected target for the current month
    expectedMonthTotal: expectedMonth.total,
    expectedMonthFromScheduled: expectedMonth.fromScheduled,
    expectedMonthFromSubscriptions: expectedMonth.fromSubscriptions,
    collectionGap: 0,

    // Operational insights
    pendingTransfersCount: 0,
    overdueThisWeekCount: 0,
    overdueAthletesCount: 0,
    duplicateGroupsCount: 0,

    // Charts
    monthlyTrend,
    methodMix: [] as Array<{ method: string; amount: number; count: number; pct: number }>,
    overdueAging: {
      upTo30Days: 0,
      from31To60Days: 0,
      over60Days: 0,
    },
  }

  for (const p of payments) {
    const amount = Number(p.amount)
    const dueDate = p.due_date
    const paidAt = p.paid_at
    const paidMonth = paidAt?.slice(0, 7)
    const dueMonth = dueDate?.slice(0, 7)
    const duplicateKey = `${p.athlete_id ?? ''}|${dueMonth ?? ''}`
    duplicateCounts[duplicateKey] = (duplicateCounts[duplicateKey] ?? 0) + 1

    const notes = typeof p.notes === 'string' ? p.notes : ''
    const hasReceipt = /https?:\/\/[^\s]+/i.test(notes)
    const isTransfer =
      p.payment_method === 'transfer' || notes.toLowerCase().includes('comprobante')

    if ((p.status === 'pending' || p.status === 'overdue') && (isTransfer || hasReceipt)) {
      metrics.pendingTransfersCount++
    }

    // Actual income: paid this month
    if (p.status === 'paid' && paidAt) {
      if (paidMonth === targetMonth) {
        metrics.actualIncome += amount
        metrics.actualIncomeCount++

        if (p.payment_method) {
          const current = methodMixMap[p.payment_method] ?? { amount: 0, count: 0 }
          current.amount += amount
          current.count += 1
          methodMixMap[p.payment_method] = current
        }
      }
      // Previous month for comparison
      const prevMonth = new Date(targetMonth + '-01')
      prevMonth.setMonth(prevMonth.getMonth() - 1)
      const prevMonthStr = prevMonth.toISOString().slice(0, 7)
      if (paidMonth === prevMonthStr) {
        metrics.previousMonthActual += amount
      }
    }

    if (dueMonth && monthlyTrendByKey.has(dueMonth)) {
      monthlyTrendByKey.get(dueMonth)!.emitted += amount
    }
    if (paidMonth && monthlyTrendByKey.has(paidMonth) && p.status === 'paid') {
      monthlyTrendByKey.get(paidMonth)!.collected += amount
    }

    // Projected income: due this month
    if (dueDate >= monthStart && dueDate < monthEnd) {
      metrics.projectedIncome += amount
      metrics.projectedIncomeCount++
    }

    // Overdue
    if (p.status === 'overdue') {
      metrics.totalOverdue += amount
      metrics.overdueCount++
      if (p.athlete_id) overdueAthletes.add(p.athlete_id)
      if (dueMonth && monthlyTrendByKey.has(dueMonth)) {
        monthlyTrendByKey.get(dueMonth)!.overdue += amount
      }

      const dueDateObj = new Date(`${dueDate}T12:00:00`)
      if (dueDateObj >= sevenDaysAgo) {
        metrics.overdueThisWeekCount++
      }

      if (dueDateObj < sixtyDaysAgo) {
        metrics.overdueOlderThan30Days += amount
        metrics.overdueOlderThan60Days += amount
        metrics.overdueAging.over60Days += amount
      } else if (dueDateObj < thirtyDaysAgo) {
        metrics.overdueOlderThan30Days += amount
        metrics.overdueAging.from31To60Days += amount
      } else {
        metrics.overdueAging.upTo30Days += amount
      }
    }

    // Pending
    if (p.status === 'pending') {
      metrics.totalPending += amount
      metrics.pendingCount++
    }
  }

  // Expected from active subscriptions
  for (const sub of subscriptions) {
    const plansData = sub.plans as unknown
    const plan = Array.isArray(plansData) ? plansData[0] : plansData as { price: number } | null
    if (plan?.price) {
      metrics.expectedFromSubscriptions += Number(plan.price)
    }
  }

  // Collection rate
  if (metrics.projectedIncome > 0) {
    metrics.collectionRate = Math.round((metrics.actualIncome / metrics.projectedIncome) * 100)
  }
  if (metrics.expectedMonthTotal > 0) {
    metrics.collectionGap = Math.max(metrics.expectedMonthTotal - metrics.actualIncome, 0)
  }

  // Month-over-month change
  if (metrics.previousMonthActual > 0) {
    metrics.monthOverMonthChange = Math.round(
      ((metrics.actualIncome - metrics.previousMonthActual) / metrics.previousMonthActual) * 100
    )
  }

  metrics.overdueAthletesCount = overdueAthletes.size
  metrics.duplicateGroupsCount = Object.values(duplicateCounts).filter((count) => count > 1).length

  const methodTotal = Object.values(methodMixMap).reduce((sum, item) => sum + item.amount, 0)
  metrics.methodMix = Object.entries(methodMixMap)
    .map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      pct: methodTotal > 0 ? Math.round((data.amount / methodTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  return metrics
}

export type MonthlyAthleteCollectionRow = {
  athleteId: string
  name: string
  planName: string | null
  amount: number
  dueDate: string | null
  paidAt: string | null
  status: string | null
  paymentId: string | null
  paymentMethod: string | null
  nextBillingDate: string | null
}

export type MonthlyAthleteCollectionStatus = {
  month: string
  monthLabel: string
  paid: MonthlyAthleteCollectionRow[]
  pending: MonthlyAthleteCollectionRow[]
  notBilled: MonthlyAthleteCollectionRow[]
  counts: {
    paid: number
    pending: number
    notBilled: number
    expected: number
    activeSubscriptions: number
  }
}

/**
 * Vista atleta × mes: quién pagó la cuota del mes, quién está pendiente y quién aún no tiene fila emitida.
 * Criterio: cuota del mes = pago con due_date en el mes calendario.
 */
export async function getMonthlyAthleteCollectionStatus(
  monthIso?: string
): Promise<MonthlyAthleteCollectionStatus> {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const targetMonth = monthIso || new Date().toISOString().slice(0, 7)
  const parts = targetMonth.split('-')
  const y = Number(parts[0])
  const mo = Number(parts[1])
  const monthStart = `${y}-${String(mo).padStart(2, '0')}-01`
  const monthEnd = new Date(y, mo, 0).toISOString().split('T')[0]
  const monthLabel = new Date(`${monthStart}T12:00:00`).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  })

  const [{ data: monthPayments }, { data: activeSubs }] = await Promise.all([
    supabase
      .from('payments')
      .select(`
        id, athlete_id, amount, status, due_date, paid_at, payment_method,
        athletes (id, name, archived_at),
        plans (name)
      `)
      .eq('club_id', clubId)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd)
      .order('due_date', { ascending: true }),
    supabase
      .from('subscriptions')
      .select(`
        athlete_id, next_billing_date,
        plans (name, price),
        athletes (id, name, archived_at)
      `)
      .eq('club_id', clubId)
      .eq('status', 'active'),
  ])

  const paid: MonthlyAthleteCollectionRow[] = []
  const pending: MonthlyAthleteCollectionRow[] = []
  const athletesWithDueInMonth = new Set<string>()

  for (const p of monthPayments ?? []) {
    const rawAth = p.athletes as { id: string; name: string; archived_at: string | null } | { id: string; name: string; archived_at: string | null }[] | null
    const athlete = Array.isArray(rawAth) ? rawAth[0] : rawAth
    if (!athlete || athlete.archived_at) continue

    const athleteId = athlete.id ?? (p.athlete_id as string)
    if (!athleteId) continue
    athletesWithDueInMonth.add(athleteId)

    const rawPlan = p.plans as { name: string } | { name: string }[] | null
    const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan

    const row: MonthlyAthleteCollectionRow = {
      athleteId,
      name: athlete.name,
      planName: plan?.name ?? null,
      amount: Number(p.amount),
      dueDate: p.due_date,
      paidAt: p.paid_at,
      status: p.status,
      paymentId: p.id,
      paymentMethod: p.payment_method,
      nextBillingDate: null,
    }

    if (p.status === 'paid') {
      paid.push(row)
    } else if (p.status === 'pending' || p.status === 'overdue') {
      pending.push(row)
    }
  }

  const notBilled: MonthlyAthleteCollectionRow[] = []
  for (const sub of activeSubs ?? []) {
    const rawAth = sub.athletes as { id: string; name: string; archived_at: string | null } | { id: string; name: string; archived_at: string | null }[] | null
    const athlete = Array.isArray(rawAth) ? rawAth[0] : rawAth
    if (!athlete || athlete.archived_at) continue

    const athleteId = sub.athlete_id as string
    if (!athleteId || athletesWithDueInMonth.has(athleteId)) continue

    const nextBilling = sub.next_billing_date as string | null
    if (!nextBilling || nextBilling < monthStart || nextBilling > monthEnd) continue

    const rawPlan = sub.plans as { name: string; price: number } | { name: string; price: number }[] | null
    const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan

    notBilled.push({
      athleteId,
      name: athlete.name,
      planName: plan?.name ?? null,
      amount: Number(plan?.price ?? 0),
      dueDate: nextBilling,
      paidAt: null,
      status: null,
      paymentId: null,
      paymentMethod: null,
      nextBillingDate: nextBilling,
    })
  }

  const sortByName = (a: MonthlyAthleteCollectionRow, b: MonthlyAthleteCollectionRow) =>
    a.name.localeCompare(b.name, 'es')

  paid.sort(sortByName)
  pending.sort((a, b) => {
    const statusOrder = (s: string | null) => (s === 'overdue' ? 0 : 1)
    const diff = statusOrder(a.status) - statusOrder(b.status)
    return diff !== 0 ? diff : sortByName(a, b)
  })
  notBilled.sort(sortByName)

  const expected = paid.length + pending.length + notBilled.length

  return {
    month: targetMonth,
    monthLabel,
    paid,
    pending,
    notBilled,
    counts: {
      paid: paid.length,
      pending: pending.length,
      notBilled: notBilled.length,
      expected,
      activeSubscriptions: (activeSubs ?? []).filter((s) => {
        const rawAth = s.athletes as { archived_at: string | null } | { archived_at: string | null }[] | null
        const ath = Array.isArray(rawAth) ? rawAth[0] : rawAth
        return !ath?.archived_at
      }).length,
    },
  }
}

/**
 * Get athlete's subscription and payment status with period information.
 */
export async function getAthletePaymentStatus(athleteId: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Verificar pertenencia: esta action recibe `athleteId`, así que sin este check un atleta
  // podría leer el estado financiero de OTRO atleta del mismo club (IDOR). Solo el propio dueño.
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const clerk = await clerkClient()
  const caller = await clerk.users.getUser(userId)
  const callerEmail = (caller.emailAddresses[0]?.emailAddress ?? '').trim().toLowerCase()
  const { data: self } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('email', callerEmail)
    .is('archived_at', null)
    .maybeSingle()
  if (!self || self.id !== athleteId) throw new Error('No autorizado')

  // Get active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      id, status, start_date, end_date,
      current_period_start, current_period_end, next_billing_date,
      billing_anchor_day,
      plans (id, name, price, billing_cycle)
    `)
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .eq('status', 'active')
    .maybeSingle()

  // Get payment history
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, status, due_date, paid_at, period_start, period_end, concept, is_waived')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .order('due_date', { ascending: false })
    .limit(12) // Last 12 payments

  // Get overdue payments
  const { data: overduePayments } = await supabase
    .from('payments')
    .select('id, amount, status, due_date, period_start, period_end, concept')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })

  const plansData = subscription?.plans as unknown
  const plan = Array.isArray(plansData) ? plansData[0] : plansData as { id: string; name: string; price: number; billing_cycle: string } | null

  return {
    subscription: subscription ? {
      ...subscription,
      plan,
    } : null,
    payments: payments ?? [],
    overduePayments: overduePayments ?? [],
    totalOverdue: (overduePayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
    overdueCount: (overduePayments ?? []).length,
    currentPeriod: subscription?.current_period_start && subscription?.current_period_end ? {
      start: subscription.current_period_start,
      end: subscription.current_period_end,
    } : null,
    nextBillingDate: subscription?.next_billing_date ?? null,
  }
}

/**
 * Generate catch-up payments for an athlete who has missed multiple periods.
 * Creates individual payment records for each missed period.
 */
export async function generateCatchUpPayments(
  athleteId: string,
  options?: {
    periodsToGenerate?: number // If not specified, generates all overdue periods
    fromDate?: string // Start generating from this date
  }
) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Get athlete's subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      id, start_date, billing_anchor_day,
      current_period_start, current_period_end,
      plans (id, name, price, billing_cycle)
    `)
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .in('status', ['active', 'paused'])
    .maybeSingle()

  if (!subscription) {
    throw new Error('No se encontró una suscripción activa para este atleta')
  }

  const plansDataSub = subscription.plans as unknown
  const plan = Array.isArray(plansDataSub) ? plansDataSub[0] : plansDataSub as { id: string; name: string; price: number; billing_cycle: string } | null
  if (!plan) {
    throw new Error('No se encontró el plan asociado a la suscripción')
  }

  const billingCycle = plan.billing_cycle as BillingCycle
  const billingAnchorDay = subscription.billing_anchor_day || dayOfMonthFromYmd(subscription.start_date)

  // Find the last paid period
  const { data: lastPaidPayment } = await supabase
    .from('payments')
    .select('period_end')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .eq('status', 'paid')
    .not('period_end', 'is', null)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastPaidPeriodEnd = lastPaidPayment?.period_end 
    ? new Date(lastPaidPayment.period_end) 
    : null

  // Generate overdue periods
  const fromDate = options?.fromDate ? new Date(options.fromDate) : new Date()
  const overduePeriods = generateOverduePeriods(
    lastPaidPeriodEnd,
    billingAnchorDay,
    billingCycle,
    fromDate
  )

  // Limit periods if specified
  const periodsToCreate = options?.periodsToGenerate 
    ? overduePeriods.slice(0, options.periodsToGenerate)
    : overduePeriods

  if (periodsToCreate.length === 0) {
    return { created: 0, payments: [] }
  }

  // Check for existing payments in these periods to avoid duplicates
  const { data: existingPayments } = await supabase
    .from('payments')
    .select('period_start')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .in('status', ['pending', 'overdue', 'paid'])

  const existingPeriodStarts = new Set(
    (existingPayments ?? []).map(p => p.period_start)
  )

  // Create payment records for each period
  const paymentsToInsert = periodsToCreate
    .filter(period => !existingPeriodStarts.has(period.periodStart.toISOString().split('T')[0]))
    .map(period => ({
      club_id: clubId,
      athlete_id: athleteId,
      plan_id: plan.id,
      subscription_id: subscription.id,
      concept: `${plan.name} - ${period.periodStart.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`,
      amount: plan.price,
      status: period.dueDate < new Date() ? 'overdue' : 'pending',
      due_date: period.dueDate.toISOString().split('T')[0],
      period_start: period.periodStart.toISOString().split('T')[0],
      period_end: period.periodEnd.toISOString().split('T')[0],
    }))

  if (paymentsToInsert.length === 0) {
    return { created: 0, payments: [] }
  }

  const { data: createdPayments, error } = await supabase
    .from('payments')
    .insert(paymentsToInsert)
    .select()

  if (error) throw new Error('Error al generar pagos: ' + error.message)

  revalidatePath('/dashboard/payments')
  revalidatePath(`/dashboard/athletes/${athleteId}`)

  return {
    created: createdPayments?.length ?? 0,
    payments: createdPayments ?? [],
  }
}

/**
 * Waive (forgive) a payment - marks it as waived so it doesn't count as overdue.
 */
export async function waivePayment(paymentId: string, reason?: string) {
  await assertClubCapability('finances')
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'cancelled',
      is_waived: true,
      waived_at: new Date().toISOString(),
      waived_by: userId,
      waiver_reason: reason || null,
    })
    .eq('id', paymentId)
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])

  if (error) throw new Error('Error al condonar pago: ' + error.message)

  revalidatePath('/dashboard/payments')
  return { success: true }
}

/**
 * Bulk waive multiple payments (e.g., forgive all overdue for fresh start).
 */
export async function bulkWaivePayments(paymentIds: string[], reason?: string) {
  await assertClubCapability('finances')
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error, count } = await supabase
    .from('payments')
    .update({
      status: 'cancelled',
      is_waived: true,
      waived_at: new Date().toISOString(),
      waived_by: userId,
      waiver_reason: reason || 'Condonación masiva',
    })
    .in('id', paymentIds)
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])

  if (error) throw new Error('Error al condonar pagos: ' + error.message)

  revalidatePath('/dashboard/payments')
  return { waived: count ?? 0 }
}

/**
 * Adjust subscription dates (admin function).
 * Used to manually set the current period and next billing date.
 */
export async function adjustSubscriptionDates(
  subscriptionId: string,
  dates: {
    currentPeriodStart?: string
    currentPeriodEnd?: string
    nextBillingDate?: string
    billingAnchorDay?: number
  }
) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const updateData: Record<string, unknown> = {}
  if (dates.currentPeriodStart) updateData.current_period_start = dates.currentPeriodStart
  if (dates.currentPeriodEnd) updateData.current_period_end = dates.currentPeriodEnd
  if (dates.nextBillingDate) updateData.next_billing_date = dates.nextBillingDate
  if (dates.billingAnchorDay) updateData.billing_anchor_day = dates.billingAnchorDay

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('id', subscriptionId)
    .eq('club_id', clubId)

  if (error) throw new Error('Error al ajustar fechas: ' + error.message)

  revalidatePath('/dashboard/subscriptions')
  return { success: true }
}

/**
 * Create a payment with proper period tracking.
 * This is the new way to create subscription payments.
 */
export async function createPaymentWithPeriod(params: {
  athleteId: string
  planId: string
  subscriptionId?: string
  periodStart: string
  periodEnd: string
  dueDate: string
  amount: number
  concept: string
  status?: 'pending' | 'paid' | 'overdue'
  paidAt?: string
  paymentMethod?: string
}) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('payments')
    .insert({
      club_id: clubId,
      athlete_id: params.athleteId,
      plan_id: params.planId,
      subscription_id: params.subscriptionId || null,
      concept: params.concept,
      amount: params.amount,
      status: params.status || 'pending',
      due_date: params.dueDate,
      period_start: params.periodStart,
      period_end: params.periodEnd,
      paid_at: params.paidAt || null,
      payment_method: params.paymentMethod || null,
    })
    .select()
    .single()

  if (error) throw new Error('Error al crear pago: ' + error.message)

  revalidatePath('/dashboard/payments')
  revalidatePath(`/dashboard/athletes/${params.athleteId}`)

  return data
}

/**
 * Mark payment as paid and update subscription period.
 * This is the enhanced version that updates the subscription's current period.
 */
export async function markPaymentAsPaidWithPeriod(
  paymentId: string,
  params: {
    paymentMethod: string
    paidAt?: string
  }
) {
  await assertClubCapability('finances')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Get payment details
  const { data: payment, error: fetchError } = await supabase
    .from('payments')
    .select('*, subscriptions(id, plan_id, plans(billing_cycle))')
    .eq('id', paymentId)
    .eq('club_id', clubId)
    .single()

  if (fetchError || !payment) throw new Error('Pago no encontrado')

  const paidAt = params.paidAt || new Date().toISOString()

  // Update payment
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: paidAt,
      payment_method: params.paymentMethod,
    })
    .eq('id', paymentId)
    .eq('club_id', clubId)

  if (updateError) throw new Error('Error al actualizar pago: ' + updateError.message)

  // Update subscription period if payment has period info and subscription
  if (payment.period_start && payment.period_end && payment.subscription_id) {
    const subscription = payment.subscriptions as { id: string; plan_id: string; plans: { billing_cycle: string } | null } | null
    const billingCycle = (subscription?.plans?.billing_cycle || 'monthly') as BillingCycle

    const periodEnd = new Date(payment.period_end)
    const nextPeriodStart = calculateNextPeriodStart(new Date(payment.period_start), billingCycle)

    await supabase
      .from('subscriptions')
      .update({
        current_period_start: payment.period_start,
        current_period_end: payment.period_end,
        next_billing_date: nextPeriodStart?.toISOString().split('T')[0] || null,
        status: 'active',
      })
      .eq('id', payment.subscription_id)
      .eq('club_id', clubId)
  }

  revalidatePath('/dashboard/payments')
  revalidatePath('/dashboard/subscriptions')

  return { success: true }
}

/**
 * Get athletes with overdue payments for reporting.
 */
export async function getAthletesWithOverduePayments() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, amount, due_date, period_start, period_end,
      athletes (id, name, email, phone, photo_url)
    `)
    .eq('club_id', clubId)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })

  if (error) throw new Error(error.message)

  // Group by athlete
  const byAthlete = new Map<string, {
    athlete: { id: string; name: string; email: string | null; phone: string | null; photo_url: string | null }
    payments: typeof data
    totalOverdue: number
    oldestDueDate: string
  }>()

  for (const payment of data ?? []) {
    const athletesData = payment.athletes as unknown
    const athlete = Array.isArray(athletesData) ? athletesData[0] : athletesData as { id: string; name: string; email: string | null; phone: string | null; photo_url: string | null } | null
    if (!athlete) continue

    if (!byAthlete.has(athlete.id)) {
      byAthlete.set(athlete.id, {
        athlete,
        payments: [],
        totalOverdue: 0,
        oldestDueDate: payment.due_date,
      })
    }

    const entry = byAthlete.get(athlete.id)!
    entry.payments.push(payment)
    entry.totalOverdue += Number(payment.amount)
    if (payment.due_date < entry.oldestDueDate) {
      entry.oldestDueDate = payment.due_date
    }
  }

  return Array.from(byAthlete.values()).sort((a, b) => b.totalOverdue - a.totalOverdue)
}
