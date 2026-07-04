import { createAdminClient } from '@/lib/supabase/admin'
import {
  calculateNextPeriodStart,
  calculatePeriodEnd,
  todayYmd,
  ymdFromDate,
  parseYmd,
  type BillingCycle,
} from '@/lib/billing-utils'
import { ONLINE_GATEWAY_IDS } from '@/lib/payment-methods'

type CronResult = {
  clubsProcessed: number
  paymentsGenerated: number
  overdueSynced: number
  gatewayFailed: number
  subscriptionsExpired: number
}

/** Marca pagos pendientes vencidos como overdue (excluye pasarelas online). */
export async function syncOverduePaymentsForClub(clubId: string): Promise<number> {
  const supabase = createAdminClient()
  const today = todayYmd()
  const gatewayFilter = ONLINE_GATEWAY_IDS.join(',')

  const { count, error } = await supabase
    .from('payments')
    .update({ status: 'overdue' })
    .eq('club_id', clubId)
    .eq('status', 'pending')
    .lt('due_date', today)
    .or(`payment_method.is.null,payment_method.not.in.(${gatewayFilter})`)

  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Marca intentos de pasarela vencidos como failed (no deben quedar como mora). */
export async function failStaleGatewayPaymentsForClub(clubId: string): Promise<number> {
  const supabase = createAdminClient()
  const today = todayYmd()

  const { count, error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      notes: 'Intento de pago por pasarela expirado (cron)',
    })
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])
    .lt('due_date', today)
    .in('payment_method', [...ONLINE_GATEWAY_IDS])

  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Genera cuotas pendientes para suscripciones cuyo next_billing_date ya llegó. */
export async function generateDuePaymentsForClub(clubId: string): Promise<number> {
  const supabase = createAdminClient()
  const today = todayYmd()
  let created = 0

  const { data: subs } = await supabase
    .from('subscriptions')
    .select(`
      id, athlete_id, plan_id, next_billing_date, current_period_end,
      billing_anchor_day,
      plans (id, name, price, billing_cycle)
    `)
    .eq('club_id', clubId)
    .eq('status', 'active')
    .not('next_billing_date', 'is', null)
    .lte('next_billing_date', today)

  for (const sub of subs ?? []) {
    const nextBilling = sub.next_billing_date as string
    if (!nextBilling) continue

    const plansData = sub.plans as unknown
    const plan = Array.isArray(plansData)
      ? plansData[0]
      : (plansData as { id: string; name: string; price: number; billing_cycle: string } | null)
    if (!plan || !plan.price) continue

    const periodStartStr = nextBilling.slice(0, 10)
    const cycle = plan.billing_cycle as BillingCycle
    const periodStart = parseYmd(periodStartStr)
    const periodEnd = calculatePeriodEnd(periodStart, cycle)
    const periodEndStr = periodEnd ? ymdFromDate(periodEnd) : null

    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('club_id', clubId)
      .eq('athlete_id', sub.athlete_id)
      .eq('period_start', periodStartStr)
      .in('status', ['pending', 'overdue', 'paid'])
      .maybeSingle()

    if (existing) {
      const nextStart = calculateNextPeriodStart(periodStart, cycle)
      if (nextStart) {
        await supabase
          .from('subscriptions')
          .update({ next_billing_date: ymdFromDate(nextStart) })
          .eq('id', sub.id)
          .eq('club_id', clubId)
      }
      continue
    }

    const month = periodStart.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    const { error: insertErr } = await supabase.from('payments').insert({
      club_id: clubId,
      athlete_id: sub.athlete_id,
      plan_id: plan.id,
      subscription_id: sub.id,
      concept: `${plan.name} – ${month}`,
      amount: plan.price,
      status: 'pending',
      due_date: periodStartStr,
      period_start: periodStartStr,
      period_end: periodEndStr,
    })

    if (insertErr) continue

    const nextStart = calculateNextPeriodStart(periodStart, cycle)
    await supabase
      .from('subscriptions')
      .update({
        next_billing_date: nextStart ? ymdFromDate(nextStart) : null,
      })
      .eq('id', sub.id)
      .eq('club_id', clubId)

    created++
  }

  return created
}

/** Expira suscripciones activas cuyo periodo actual ya terminó. */
export async function expireSubscriptionsForClub(clubId: string): Promise<number> {
  const supabase = createAdminClient()
  const today = todayYmd()

  const { count, error } = await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('club_id', clubId)
    .eq('status', 'active')
    .not('current_period_end', 'is', null)
    .lt('current_period_end', today)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function runBillingCronForClub(clubId: string): Promise<Omit<CronResult, 'clubsProcessed'>> {
  const paymentsGenerated = await generateDuePaymentsForClub(clubId)
  const overdueSynced = await syncOverduePaymentsForClub(clubId)
  const gatewayFailed = await failStaleGatewayPaymentsForClub(clubId)
  const subscriptionsExpired = await expireSubscriptionsForClub(clubId)
  return { paymentsGenerated, overdueSynced, gatewayFailed, subscriptionsExpired }
}

export async function runBillingCronForAllClubs(): Promise<CronResult> {
  const supabase = createAdminClient()
  const { data: clubs, error } = await supabase.from('clubs').select('id')
  if (error) throw new Error(error.message)

  const totals: CronResult = {
    clubsProcessed: 0,
    paymentsGenerated: 0,
    overdueSynced: 0,
    gatewayFailed: 0,
    subscriptionsExpired: 0,
  }

  for (const club of clubs ?? []) {
    try {
      const result = await runBillingCronForClub(club.id)
      totals.clubsProcessed++
      totals.paymentsGenerated += result.paymentsGenerated
      totals.overdueSynced += result.overdueSynced
      totals.gatewayFailed += result.gatewayFailed
      totals.subscriptionsExpired += result.subscriptionsExpired
    } catch (e) {
      console.error(`[billing-cron] club ${club.id} failed:`, e)
    }
  }

  return totals
}
