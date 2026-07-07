import { createAdminClient } from '@/lib/supabase/admin'
import {
  calculateNextPeriodStart,
  calculatePeriodEnd,
  calculatePeriodStartForPayment,
  getBillingAnchorDay,
  getBillingPolicyFromSettings,
  getRemindersEnabledFromSettings,
  todayYmd,
  ymdFromDate,
  parseYmd,
  type BillingCycle,
  type BillingPolicy,
} from '@/lib/billing-utils'
import { ONLINE_GATEWAY_IDS } from '@/lib/payment-methods'
import { sendPaymentReminderEmail } from '@/lib/email'
import { getAutoTemplate, resolveAutoEmail } from '@/lib/auto-templates'

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
export async function generateDuePaymentsForClub(
  clubId: string,
  policy: BillingPolicy = 'suspend',
): Promise<number> {
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

    // Política "No acumular": si ya hay una cuota vencida de este plan sin pagar, no generamos
    // la del período siguiente (se corta la acumulación; el alumno queda con la cuota vencida y
    // bloqueado hasta regularizar). En "Acumular" se genera igual y la deuda se apila.
    if (policy === 'suspend') {
      const { count: overdueForPlan } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .eq('athlete_id', sub.athlete_id)
        .eq('plan_id', plan.id)
        .eq('status', 'overdue')
      if ((overdueForPlan ?? 0) > 0) continue
    }

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

/** Días de gracia tras el fin de período antes de expirar (coherente con determineSubscriptionStatus). */
const EXPIRY_GRACE_DAYS = 3

/**
 * Expira suscripciones activas cuyo período terminó hace más de EXPIRY_GRACE_DAYS.
 * La ventana de gracia es clave: sin ella el cron expiraba el mismo día que emitía la nueva
 * cuota (next_billing_date = current_period_end + 1), dejando al atleta al día sin una
 * suscripción `active` y por tanto bloqueado de pagar por self-service. Con gracia, la
 * suscripción sigue `active` durante la gracia para que pueda renovar.
 */
export async function expireSubscriptionsForClub(clubId: string): Promise<number> {
  const supabase = createAdminClient()

  const graceCutoff = new Date()
  graceCutoff.setDate(graceCutoff.getDate() - EXPIRY_GRACE_DAYS)
  const cutoff = ymdFromDate(graceCutoff)

  const { count, error } = await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('club_id', clubId)
    .eq('status', 'active')
    .not('current_period_end', 'is', null)
    .lt('current_period_end', cutoff)

  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Saneo de anclas de facturación. Las suscripciones activas con `next_billing_date = NULL`
 * (creadas antes de que createSubscription poblara las anclas) eran INVISIBLES para el cron:
 * nunca se generaba su cuota → el atleta aparecía "al día" sin pagar hace meses. Aquí les
 * asignamos anclas apuntando al PERÍODO ACTUAL (no retroactivo: no se inventan meses viejos),
 * para que generateDuePaymentsForClub las empiece a facturar desde este mes en adelante.
 * Idempotente: tras la primera corrida ya no quedan subs en NULL.
 */
export async function backfillMissingBillingAnchorsForClub(clubId: string): Promise<number> {
  const supabase = createAdminClient()
  let fixed = 0

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, athlete_id, start_date, billing_anchor_day, current_period_start, plans (billing_cycle, price)')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .is('next_billing_date', null)

  const now = new Date()
  for (const sub of subs ?? []) {
    const plansData = sub.plans as unknown
    const plan = Array.isArray(plansData)
      ? plansData[0]
      : (plansData as { billing_cycle: string; price: number } | null)
    if (!plan || !plan.price) continue // plan gratis o sin plan: no se factura

    const cycle = plan.billing_cycle as BillingCycle
    if (cycle === 'single') continue // pago único: no es recurrente, no lleva next_billing_date

    const refDate = sub.start_date ? parseYmd(sub.start_date as string) : now
    const anchorDay = sub.billing_anchor_day ?? getBillingAnchorDay(refDate)
    const refStart = sub.current_period_start ? parseYmd(sub.current_period_start as string) : null
    const { periodStart, periodEnd } = calculatePeriodStartForPayment(anchorDay, now, cycle, refStart)
    const periodStartStr = ymdFromDate(periodStart)
    const periodEndStr = periodEnd ? ymdFromDate(periodEnd) : null

    const { error } = await supabase
      .from('subscriptions')
      .update({
        billing_anchor_day: anchorDay,
        current_period_start: periodStartStr,
        current_period_end: periodEndStr,
        // next_billing_date = inicio del período actual → generateDuePayments emite la cuota de
        // este período en la misma corrida (y luego avanza al siguiente mes).
        next_billing_date: periodStartStr,
      })
      .eq('id', sub.id)
      .eq('club_id', clubId)
    if (!error) fixed++
  }

  return fixed
}

const REMINDER_OFFSETS = [-3, 1, 7, 15] // días relativos al vencimiento (negativo = antes de vencer)

/**
 * Envía recordatorios de pago por correo en offsets EXACTOS respecto al vencimiento: 3 días antes,
 * y 1/7/15 días de mora. Al ejecutarse una vez al día, el match exacto garantiza un solo envío por
 * offset sin necesidad de trackear estado (sin columna extra). Solo si el club activó recordatorios;
 * best-effort (un fallo de correo no interrumpe el cron).
 */
export async function sendPaymentRemindersForClub(clubId: string): Promise<number> {
  const supabase = createAdminClient()
  const { data: club } = await supabase
    .from('clubs')
    .select('name, slug, logo_url, primary_color, settings')
    .eq('id', clubId)
    .single()

  const settings = (club?.settings ?? {}) as Record<string, unknown>
  if (!getRemindersEnabledFromSettings(settings)) return 0
  // Además del toggle general de recordatorios, respeta si el club desactivó esta plantilla.
  if (!getAutoTemplate(settings, 'payment_reminder').enabled) return 0

  const ps = (settings.payment_settings ?? {}) as { bank_info?: { email?: string }; cash_instructions?: string }
  const clubEmail = ps.bank_info?.email ?? null
  const cashInstructions = ps.cash_instructions || undefined
  const todayMs = parseYmd(todayYmd()).getTime()

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, due_date, status, plans(name), athletes(name, email)')
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])
    .not('due_date', 'is', null)

  let sent = 0
  for (const p of payments ?? []) {
    const due = p.due_date as string
    const offset = Math.round((todayMs - parseYmd(due).getTime()) / 86400000)
    if (!REMINDER_OFFSETS.includes(offset)) continue

    const athlete = (Array.isArray(p.athletes) ? p.athletes[0] : p.athletes) as { name?: string; email?: string } | null
    const to = athlete?.email?.trim()
    if (!to) continue
    const plan = (Array.isArray(p.plans) ? p.plans[0] : p.plans) as { name?: string } | null

    const clubName = club?.name ?? 'tu academia'
    const amount = Number(p.amount ?? 0)
    const montoFmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount)
    const dueFmt = new Date(`${due}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    const tpl = resolveAutoEmail(settings, 'payment_reminder', {
      nombre: athlete?.name ?? 'Atleta',
      club: clubName,
      plan: plan?.name ?? '',
      monto: montoFmt,
      fecha_vencimiento: dueFmt,
    })
    if (!tpl) continue

    try {
      await sendPaymentReminderEmail({
        to,
        athleteName: athlete?.name ?? 'Atleta',
        clubName,
        clubSlug: club?.slug ?? '',
        amount,
        dueDate: due,
        planName: plan?.name ?? undefined,
        paymentInstructions: cashInstructions,
        logoUrl: club?.logo_url ?? null,
        brandColor: club?.primary_color ?? null,
        replyTo: clubEmail,
        subjectOverride: tpl.subject,
        introOverride: tpl.intro,
      })
      sent++
    } catch (err) {
      console.error('[sendPaymentRemindersForClub] error (no bloqueante):', err instanceof Error ? err.message : err)
    }
  }
  return sent
}

export async function runBillingCronForClub(clubId: string): Promise<Omit<CronResult, 'clubsProcessed'>> {
  const supabase = createAdminClient()
  const { data: clubRow } = await supabase.from('clubs').select('settings').eq('id', clubId).single()
  const policy = getBillingPolicyFromSettings((clubRow?.settings ?? {}) as Record<string, unknown>)

  await backfillMissingBillingAnchorsForClub(clubId)
  const paymentsGenerated = await generateDuePaymentsForClub(clubId, policy)
  const overdueSynced = await syncOverduePaymentsForClub(clubId)
  const gatewayFailed = await failStaleGatewayPaymentsForClub(clubId)
  // "Acumular": nunca vencer por impago (la sub sigue activa acumulando deuda).
  // "No acumular": vencer normal tras la gracia → deja de facturar.
  const subscriptionsExpired = policy === 'accumulate' ? 0 : await expireSubscriptionsForClub(clubId)
  // Recordatorios por correo (después de sincronizar mora, para usar estados actualizados).
  await sendPaymentRemindersForClub(clubId)
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
