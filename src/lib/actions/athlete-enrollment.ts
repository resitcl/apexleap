'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, getUserRole } from '@/lib/actions/club-context'
import {
  calculatePeriodEnd,
  calculateNextPeriodStart,
  getBillingAnchorDay,
  calculatePeriodStartForPayment,
  type BillingCycle,
} from '@/lib/billing-utils'
import {
  getEnabledPaymentMethodIdsFromClubSettings,
  assertPaymentMethodEnabled,
  subscriptionRequiresPaymentConfirmation,
} from '@/lib/payment-methods'
import { createFlowPayment, resolveFlowConfigFromSettings } from '@/lib/flow'
import { TRANSFER_RECEIPT_MAX_BYTES } from '@/lib/constants'
import {
  ATHLETE_OVERDUE_HARD_BLOCK_DAYS,
  type AthleteFinancialAccessState,
  type OnboardingAthlete,
  type OnboardingData,
} from '@/lib/athlete-enrollment-shared'

/**
 * Get visible plans for the current club (public-facing, for athlete selection).
 */
export async function getVisiblePlans() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('plans')
    .select('id, name, description, price, billing_cycle, session_limit, enrollment_fee, is_visible')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .eq('is_visible', true)
    .order('price', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Check if the current authenticated user has an active subscription in the club.
 */
export async function getMySubscriptionStatus() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Find athlete by Clerk email
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  if (!email) return { hasAthleteProfile: false, hasActiveSubscription: false, athlete: null, subscription: null }

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, name, email, health_status, status')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (!athlete) return { hasAthleteProfile: false, hasActiveSubscription: false, athlete: null, subscription: null }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status, start_date, end_date, plans(id, name, price, billing_cycle)')
    .eq('club_id', clubId)
    .eq('athlete_id', athlete.id)
    .eq('status', 'active')
    .maybeSingle()

  return {
    hasAthleteProfile: true,
    hasActiveSubscription: !!subscription,
    athlete,
    subscription,
  }
}

/**
 * Athlete self-enrolls: creates athlete record (if needed) and subscription.
 */
export async function enrollInPlan(planId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Get Clerk user info
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'Atleta'

  if (!email) throw new Error('No se encontró un email asociado a tu cuenta')

  // Validate plan exists and is visible
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('id, name, billing_cycle, price')
    .eq('id', planId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .single()

  if (planErr || !plan) throw new Error('Plan no encontrado o no disponible')

  // Find or create athlete record
  let { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (!athlete) {
    const { data: created, error: createErr } = await supabase
      .from('athletes')
      .insert({
        club_id: clubId,
        name: fullName,
        email,
        status: 'active',
        health_status: 'healthy',
      })
      .select('id')
      .single()

    if (createErr) throw new Error('Error al crear tu perfil de atleta: ' + createErr.message)
    athlete = created
  }

  // Cancel any existing active subscriptions
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('club_id', clubId)
    .eq('athlete_id', athlete.id)
    .eq('status', 'active')

  // Calculate period dates using proper month-based billing
  const startDate = new Date()
  const startStr = startDate.toISOString().split('T')[0]
  const cycle = plan.billing_cycle as BillingCycle

  const periodEnd = calculatePeriodEnd(startDate, cycle)
  const endStr = periodEnd ? periodEnd.toISOString().split('T')[0] : null
  const anchorDay = getBillingAnchorDay(startDate)
  const nextStart = calculateNextPeriodStart(startDate, cycle)
  const nextBillingStr = nextStart ? nextStart.toISOString().split('T')[0] : null

  // Create subscription (active immediately — athlete gains access while first payment is pending)
  const { error: subErr } = await supabase
    .from('subscriptions')
    .insert({
      club_id: clubId,
      athlete_id: athlete.id,
      plan_id: plan.id,
      status: 'active',
      start_date: startStr,
      end_date: endStr,
      auto_renew: true,
      billing_anchor_day: anchorDay,
      current_period_start: startStr,
      current_period_end: endStr,
      next_billing_date: nextBillingStr,
    })

  if (subErr) throw new Error('Error al crear la suscripción: ' + subErr.message)

  // Create initial payment record (pending) with period tracking
  if (plan.price > 0) {
    await supabase
      .from('payments')
      .insert({
        club_id: clubId,
        athlete_id: athlete.id,
        plan_id: plan.id,
        concept: `Inscripción – ${plan.name}`,
        amount: plan.price,
        status: 'pending',
        due_date: startStr,
        period_start: startStr,
        period_end: endStr,
      })
  }

  revalidatePath('/dashboard/athlete')
  revalidatePath('/dashboard/subscriptions')
  revalidatePath('/dashboard/payments')

  return { success: true }
}

/**
 * Gather all data needed for the onboarding wizard.
 */
export async function getOnboardingData(): Promise<OnboardingData> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Club info (including settings for bank_info)
  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, slug, sport_type, logo_url, primary_color, settings')
    .eq('id', clubId)
    .single()

  // Clerk user info
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || ''
  const photoUrl = user.imageUrl ?? null

  // Check if this is a team sport that requires approval
  const TEAM_SPORTS = ['Fútbol', 'Básquetbol', 'Vóley', 'Rugby', 'Hockey', 'Handball', 'Waterpolo']
  const isTeamSport = TEAM_SPORTS.includes(club?.sport_type ?? '')

  // Current athlete record (if exists)
  let athlete: OnboardingAthlete | null = null
  if (email) {
    const { data } = await supabase
      .from('athletes')
      .select('id, name, phone, birth_date, emergency_contact, emergency_phone, technical_meta, enrollment_status')
      .eq('club_id', clubId)
      .eq('email', email)
      .maybeSingle()
    athlete = data as OnboardingAthlete | null
  }
  
  // For team sports: check if athlete needs approval before payment
  const needsApproval = isTeamSport && (!athlete || athlete.enrollment_status === null)
  const isPendingApproval = isTeamSport && athlete?.enrollment_status === 'pending_approval'
  const isApproved = !isTeamSport || athlete?.enrollment_status === 'approved'
  const isRejected = athlete?.enrollment_status === 'rejected'

  // Active or pending_payment subscription
  let hasActiveSubscription = false
  let hasPendingPayment = false
  let pendingPaymentPlanName: string | null = null
  if (athlete) {
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('club_id', clubId)
      .eq('athlete_id', athlete.id)
      .eq('status', 'active')
      .maybeSingle()
    hasActiveSubscription = !!activeSub

    if (!hasActiveSubscription) {
      const { data: pendingSub } = await supabase
        .from('subscriptions')
        .select('id, plans(name)')
        .eq('club_id', clubId)
        .eq('athlete_id', athlete.id)
        .eq('status', 'pending_payment')
        .maybeSingle()
      hasPendingPayment = !!pendingSub
      const planRow = pendingSub?.plans as { name?: string } | null | undefined
      pendingPaymentPlanName = planRow?.name ?? null
    }
  }

  // Visible plans
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, description, price, billing_cycle, session_limit, enrollment_fee')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .eq('is_visible', true)
    .order('price', { ascending: true })

  // Check if profile is complete: has basic info + sport-specific fields
  const hasBasicInfo = !!athlete && !!athlete.phone && !!athlete.birth_date
  const hasSportFields = !!athlete && Object.keys(athlete.technical_meta ?? {}).length > 0
  const profileComplete = hasBasicInfo && hasSportFields
  
  // Check if platform tour has been completed (stored in technical_meta)
  const tourCompleted = !!athlete?.technical_meta?.onboarding_tour_completed

  // Extract bank_info (priorizar payment_settings del formulario de pagos)
  const settings = (club?.settings ?? {}) as Record<string, unknown>
  const psBank = (settings.payment_settings as { bank_info?: Record<string, unknown> } | undefined)?.bank_info
  const topBank = settings.bank_info as Record<string, unknown> | undefined
  const merged = { ...topBank, ...psBank } as {
    bank_name?: string
    account_type?: string
    account_number?: string
    account_holder?: string
    rut?: string
    email?: string
    whatsapp_phone?: string
  }
  const bankInfo =
    merged && (merged.bank_name || merged.account_number || merged.whatsapp_phone) ? merged : null

  return {
    // For team sports: must be approved before payment
    needsEnrollmentRequest: isTeamSport && needsApproval && !hasActiveSubscription,
    isPendingApproval,
    isRejected,
    isApproved,
    isTeamSport,
    // Original onboarding states (only applicable after approval for team sports)
    // Sin suscripción activa pero con pending_payment = ya eligió plan/medio; no repetir wizard
    needsOnboarding: !hasActiveSubscription && !hasPendingPayment && isApproved,
    needsProfileOnboarding: hasActiveSubscription && !profileComplete,
    needsPlatformTour: hasActiveSubscription && profileComplete && !tourCompleted,
    hasPendingPayment,
    pendingPaymentPlanName,
    club: club ?? {
      id: clubId,
      name: 'Club',
      slug: '',
      sport_type: null,
      logo_url: null,
      primary_color: null,
      settings: {} as Record<string, unknown>,
    },
    bankInfo,
    user: { fullName, email, photoUrl },
    athlete,
    profileComplete,
    tourCompleted,
    hasActiveSubscription,
    plans: (plans ?? []) as OnboardingData['plans'],
  }
}

function calendarDaysOverdue(dueDateYmd: string, todayYmd: string): number {
  const due = new Date(dueDateYmd + 'T12:00:00').getTime()
  const today = new Date(todayYmd + 'T12:00:00').getTime()
  return Math.floor((today - due) / (24 * 60 * 60 * 1000))
}

/**
 * Reglas de acceso del portal atleta: pago inicial pendiente de admin y mora en cuotas.
 */
export async function getAthleteFinancialAccessState(): Promise<AthleteFinancialAccessState> {
  const empty: AthleteFinancialAccessState = {
    awaitingAdminPaymentConfirmation: false,
    delinquency: { isLate: false, daysPastDue: 0, hardBlocked: false, message: null },
  }

  const { userId } = await auth()
  if (!userId) return empty

  let role: string
  try {
    role = await getUserRole()
  } catch {
    return empty
  }
  if (role !== 'athlete') return empty

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  if (!email) return empty

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (!athlete) return empty

  const { data: pendingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('club_id', clubId)
    .eq('athlete_id', athlete.id)
    .eq('status', 'pending_payment')
    .maybeSingle()

  const awaitingAdminPaymentConfirmation = !!pendingSub

  const delinquency = {
    isLate: false,
    daysPastDue: 0,
    hardBlocked: false,
    message: null as string | null,
  }

  if (!awaitingAdminPaymentConfirmation) {
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('club_id', clubId)
      .eq('athlete_id', athlete.id)
      .eq('status', 'active')
      .maybeSingle()

    if (activeSub) {
      const todayStr = new Date().toISOString().split('T')[0]
      const { data: paymentRows } = await supabase
        .from('payments')
        .select('due_date, status')
        .eq('club_id', clubId)
        .eq('athlete_id', athlete.id)
        .in('status', ['pending', 'overdue'])

      const late = (paymentRows ?? []).filter((p) => {
        if (!p.due_date) return p.status === 'overdue'
        if (p.status === 'overdue') return true
        if (p.status === 'pending' && p.due_date < todayStr) return true
        return false
      })

      if (late.length > 0) {
        const daysList = late.map((p) => {
          const due = p.due_date ?? todayStr
          const raw = calendarDaysOverdue(due, todayStr)
          return p.status === 'overdue' ? Math.max(1, raw) : raw
        })
        const daysPastDue = Math.max(...daysList)
        delinquency.isLate = daysPastDue >= 1
        delinquency.daysPastDue = daysPastDue
        delinquency.hardBlocked = daysPastDue >= ATHLETE_OVERDUE_HARD_BLOCK_DAYS
        delinquency.message = delinquency.hardBlocked
          ? 'Para poder seguir inscrito debes regularizar tu suscripción.'
          : `Tienes un pago atrasado (${daysPastDue} ${daysPastDue === 1 ? 'día' : 'días'}). Regularízalo para evitar restricciones en tu acceso.`
      }
    }
  }

  return {
    awaitingAdminPaymentConfirmation,
    delinquency,
  }
}

/**
 * Save athlete profile with sport-specific technical_meta.
 */
export async function saveAthleteProfile(profile: {
  name: string
  phone?: string
  birth_date?: string
  emergency_contact?: string
  emergency_phone?: string
  technical_meta: Record<string, unknown>
}) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  if (!email) throw new Error('No se encontró un email asociado a tu cuenta')

  // Find or create athlete
  let { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (!athlete) {
    const { data: created, error: createErr } = await supabase
      .from('athletes')
      .insert({
        club_id: clubId,
        name: profile.name,
        email,
        phone: profile.phone || null,
        birth_date: profile.birth_date || null,
        emergency_contact: profile.emergency_contact || null,
        emergency_phone: profile.emergency_phone || null,
        status: 'active',
        health_status: 'healthy',
        technical_meta: profile.technical_meta,
        performance_meta: {},
      })
      .select('id')
      .single()

    if (createErr) throw new Error('Error al crear tu perfil: ' + createErr.message)
    athlete = created
  } else {
    const { error: updateErr } = await supabase
      .from('athletes')
      .update({
        name: profile.name,
        phone: profile.phone || null,
        birth_date: profile.birth_date || null,
        emergency_contact: profile.emergency_contact || null,
        emergency_phone: profile.emergency_phone || null,
        technical_meta: profile.technical_meta,
      })
      .eq('id', athlete.id)
      .eq('club_id', clubId)

    if (updateErr) throw new Error('Error al actualizar tu perfil: ' + updateErr.message)
  }

  revalidatePath('/dashboard/athlete')
  return { success: true, athleteId: athlete.id }
}

/**
 * Request enrollment for team sports (creates athlete record with pending_approval status).
 */
export async function requestEnrollment(profile: {
  name: string
  phone?: string
  birth_date?: string
  emergency_contact?: string
  emergency_phone?: string
  technical_meta?: Record<string, unknown>
  notes?: string
}) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  if (!email) throw new Error('No se encontró un email asociado a tu cuenta')

  // Check if athlete already exists
  const { data: existing } = await supabase
    .from('athletes')
    .select('id, enrollment_status')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('athletes')
      .update({
        name: profile.name,
        phone: profile.phone || null,
        birth_date: profile.birth_date || null,
        emergency_contact: profile.emergency_contact || null,
        emergency_phone: profile.emergency_phone || null,
        technical_meta: profile.technical_meta || {},
        enrollment_status: 'pending_approval',
        enrollment_requested_at: new Date().toISOString(),
        notes: profile.notes || null,
      })
      .eq('id', existing.id)
      .eq('club_id', clubId)

    if (error) throw new Error('Error al enviar solicitud: ' + error.message)
  } else {
    // Create new athlete with pending status
    const { error } = await supabase
      .from('athletes')
      .insert({
        club_id: clubId,
        user_id: userId,
        name: profile.name,
        email,
        phone: profile.phone || null,
        birth_date: profile.birth_date || null,
        emergency_contact: profile.emergency_contact || null,
        emergency_phone: profile.emergency_phone || null,
        technical_meta: profile.technical_meta || {},
        performance_meta: {},
        status: 'inactive', // Will become active after approval + payment
        health_status: 'healthy',
        enrollment_status: 'pending_approval',
        enrollment_requested_at: new Date().toISOString(),
        notes: profile.notes || null,
      })

    if (error) throw new Error('Error al crear solicitud: ' + error.message)
  }

  revalidatePath('/dashboard/athlete')
  revalidatePath('/dashboard/athletes')
  return { success: true }
}

/**
 * Approve or reject an athlete's enrollment request (admin/coach only).
 */
export async function reviewEnrollment(
  athleteId: string, 
  decision: 'approved' | 'rejected',
  notes?: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Get reviewer's user_club record
  const { data: reviewer } = await supabase
    .from('user_clubs')
    .select('id, role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .maybeSingle()

  if (!reviewer || !['admin', 'admin_athlete', 'coach'].includes(reviewer.role)) {
    throw new Error('No tienes permisos para aprobar solicitudes')
  }

  // Get athlete info for email notification
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, name, email, enrollment_status')
    .eq('id', athleteId)
    .eq('club_id', clubId)
    .single()

  if (!athlete) throw new Error('Atleta no encontrado')
  if (athlete.enrollment_status !== 'pending_approval') {
    throw new Error('Esta solicitud ya fue procesada')
  }

  // Update athlete status
  const { error } = await supabase
    .from('athletes')
    .update({
      enrollment_status: decision,
      enrollment_reviewed_at: new Date().toISOString(),
      enrollment_reviewed_by: reviewer.id,
      enrollment_notes: notes || null,
      status: decision === 'approved' ? 'active' : 'inactive',
    })
    .eq('id', athleteId)
    .eq('club_id', clubId)

  if (error) throw new Error('Error al procesar solicitud: ' + error.message)

  // Get club info for email
  const { data: club } = await supabase
    .from('clubs')
    .select('name, slug')
    .eq('id', clubId)
    .single()

  // Send email notification
  if (athlete.email && club) {
    try {
      await sendEnrollmentDecisionEmail({
        to: athlete.email,
        athleteName: athlete.name,
        clubName: club.name,
        clubSlug: club.slug,
        decision,
        notes,
      })
    } catch (emailErr) {
      console.error('Error sending enrollment decision email:', emailErr)
      // Don't fail the whole operation if email fails
    }
  }

  revalidatePath('/dashboard/athlete')
  revalidatePath('/dashboard/athletes')
  return { success: true }
}

/**
 * Get pending enrollment requests for admin/coach.
 */
export async function getPendingEnrollments() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('athletes')
    .select('id, name, email, phone, birth_date, technical_meta, enrollment_requested_at, notes')
    .eq('club_id', clubId)
    .eq('enrollment_status', 'pending_approval')
    .order('enrollment_requested_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Send email notification for enrollment decision.
 */
async function sendEnrollmentDecisionEmail(params: {
  to: string
  athleteName: string
  clubName: string
  clubSlug: string
  decision: 'approved' | 'rejected'
  notes?: string
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://apexleap.cl'
  const joinUrl = `${baseUrl}/${params.clubSlug}/signin`

  const subject = params.decision === 'approved'
    ? `¡Bienvenido a ${params.clubName}! Tu solicitud fue aprobada`
    : `Actualización sobre tu solicitud en ${params.clubName}`

  const html = params.decision === 'approved'
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">¡Felicitaciones, ${params.athleteName}!</h1>
        <p>Tu solicitud de inscripción en <strong>${params.clubName}</strong> ha sido <strong style="color: #16a34a;">aprobada</strong>.</p>
        ${params.notes ? `<p><em>Mensaje del club: ${params.notes}</em></p>` : ''}
        <p>Ya puedes completar tu inscripción seleccionando un plan y realizando el pago.</p>
        <div style="margin: 24px 0;">
          <a href="${joinUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Completar Inscripción
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Si tienes alguna pregunta, contacta directamente al club.</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626;">Hola, ${params.athleteName}</h1>
        <p>Lamentamos informarte que tu solicitud de inscripción en <strong>${params.clubName}</strong> no fue aprobada en esta oportunidad.</p>
        ${params.notes ? `<p><em>Mensaje del club: ${params.notes}</em></p>` : ''}
        <p>Si tienes alguna pregunta, puedes contactar directamente al club.</p>
        <p style="color: #6b7280; font-size: 14px;">Gracias por tu interés en ${params.clubName}.</p>
      </div>
    `

  // Use Resend or other email service
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email')
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'ApexLeap <noreply@apexleap.cl>',
      to: params.to,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Email send failed: ${error}`)
  }
}

/**
 * Enroll athlete in plan with chosen payment method.
 */
export async function enrollWithPayment(
  planId: string,
  paymentMethod: string,
  receiptUrl?: string,
  transferReceiptSource?: 'upload' | 'whatsapp'
) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || email || 'Atleta'
  if (!email) throw new Error('No se encontró un email asociado a tu cuenta')

  // Validate plan
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('id, name, billing_cycle, price, enrollment_fee')
    .eq('id', planId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .single()

  if (planErr || !plan) throw new Error('Plan no encontrado o no disponible')

  const { data: clubRow } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', clubId)
    .single()
  const enabledIds = getEnabledPaymentMethodIdsFromClubSettings(
    (clubRow?.settings ?? {}) as Record<string, unknown>
  )
  assertPaymentMethodEnabled(enabledIds, paymentMethod)

  // Find or create athlete record (auto-link on enrollment)
  let { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (!athlete) {
    const { data: created, error: createErr } = await supabase
      .from('athletes')
      .insert({
        club_id: clubId,
        name: fullName,
        email,
        status: 'active',
        health_status: 'healthy',
        technical_meta: {},
        performance_meta: {},
      })
      .select('id')
      .single()

    if (createErr) throw new Error('Error al crear tu perfil: ' + createErr.message)
    athlete = created
  }

  // Cancel existing active subscriptions
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('club_id', clubId)
    .eq('athlete_id', athlete.id)
    .eq('status', 'active')

  // Calculate dates
  const startDate = new Date()
  const startStr = startDate.toISOString().split('T')[0]

  const CYCLE_DAYS: Record<string, number> = {
    monthly: 30, quarterly: 90, semiannual: 180, annual: 365, single: 0,
  }
  const days = CYCLE_DAYS[plan.billing_cycle] ?? 30
  let endStr: string | null = null
  if (days > 0) {
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + days)
    endStr = endDate.toISOString().split('T')[0]
  }

  // Hasta integrar cobro online end-to-end, todos los medios requieren confirmación del admin
  const isTransfer = paymentMethod === 'transfer'
  if (isTransfer) {
    const viaWhatsapp = transferReceiptSource === 'whatsapp'
    if (!receiptUrl && !viaWhatsapp) {
      throw new Error('Adjunta el comprobante o indica que lo enviarás por WhatsApp.')
    }
  }
  const pending = subscriptionRequiresPaymentConfirmation(paymentMethod)
  const subStatus = pending ? ('pending_payment' as const) : ('active' as const)

  // Create subscription
  const { error: subErr } = await supabase
    .from('subscriptions')
    .insert({
      club_id: clubId,
      athlete_id: athlete.id,
      plan_id: plan.id,
      status: subStatus,
      start_date: startStr,
      end_date: endStr,
      payment_method: paymentMethod,
      auto_renew: subStatus === 'active',
    })

  if (subErr) throw new Error('Error al crear la suscripción: ' + subErr.message)

  // Create payment record
  const totalAmount = (plan.price ?? 0) + (plan.enrollment_fee ?? 0)
  if (totalAmount > 0) {
    const concept = plan.enrollment_fee && plan.enrollment_fee > 0
      ? `Inscripción + Matrícula – ${plan.name}`
      : `Inscripción – ${plan.name}`

    const notes = isTransfer
      ? receiptUrl
        ? `Comprobante: ${receiptUrl}`
        : transferReceiptSource === 'whatsapp'
          ? 'Comprobante enviado por WhatsApp (pendiente de revisión).'
          : null
      : null

    await supabase
      .from('payments')
      .insert({
        club_id: clubId,
        athlete_id: athlete.id,
        plan_id: plan.id,
        concept,
        amount: totalAmount,
        status: 'pending',
        due_date: startStr,
        payment_method: paymentMethod,
        notes,
      })
  }

  revalidatePath('/dashboard/athlete')
  revalidatePath('/dashboard/subscriptions')
  revalidatePath('/dashboard/payments')

  return { success: true, isTransfer }
}

/**
 * Upload a transfer receipt image to Supabase Storage.
 */
export async function uploadTransferReceipt(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const file = formData.get('file') as File | null
  if (!file) throw new Error('No se adjuntó ningún archivo')
  if (file.size > TRANSFER_RECEIPT_MAX_BYTES) {
    throw new Error(
      `La imagen supera el máximo permitido (${Math.round(TRANSFER_RECEIPT_MAX_BYTES / (1024 * 1024))} MB). Reduce el tamaño o comprueba la foto.`
    )
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${clubId}/receipts/${userId}-${Date.now()}.${ext}`

  // Ensure bucket exists (idempotent)
  await supabase.storage.createBucket('payment-receipts', {
    public: true,
    fileSizeLimit: TRANSFER_RECEIPT_MAX_BYTES,
  })

  const { error } = await supabase.storage
    .from('payment-receipts')
    .upload(path, file, { upsert: true })

  if (error) throw new Error('Error al subir comprobante: ' + error.message)

  const { data: urlData } = supabase.storage
    .from('payment-receipts')
    .getPublicUrl(path)

  return { url: urlData.publicUrl }
}

/**
 * Athlete updates their own profile data (personal info + sport-specific technical_meta).
 */
export async function saveAthleteProfileSelf(profile: {
  name: string
  phone?: string
  birth_date?: string
  emergency_contact?: string
  emergency_phone?: string
  technical_meta: Record<string, unknown>
}) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  if (!email) throw new Error('No se encontró email asociado a tu cuenta')

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (!athlete) throw new Error('No se encontró tu perfil de atleta')

  const { error } = await supabase
    .from('athletes')
    .update({
      name: profile.name,
      phone: profile.phone ?? null,
      birth_date: profile.birth_date ?? null,
      emergency_contact: profile.emergency_contact ?? null,
      emergency_phone: profile.emergency_phone ?? null,
      technical_meta: profile.technical_meta,
    })
    .eq('id', athlete.id)
    .eq('club_id', clubId)

  if (error) throw new Error('Error al guardar el perfil: ' + error.message)

  revalidatePath('/dashboard/athlete')
  revalidatePath('/dashboard/athlete/profile')
}

/**
 * Mark the platform tour as completed for the current athlete.
 */
export async function markTourCompleted() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  if (!email) throw new Error('No se encontró email')

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id, technical_meta')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (!athlete) throw new Error('No se encontró tu perfil de atleta')

  const currentMeta = (athlete.technical_meta ?? {}) as Record<string, unknown>
  
  const { error } = await supabase
    .from('athletes')
    .update({
      technical_meta: {
        ...currentMeta,
        onboarding_tour_completed: true,
        onboarding_tour_completed_at: new Date().toISOString(),
      },
    })
    .eq('id', athlete.id)
    .eq('club_id', clubId)

  if (error) throw new Error('Error al guardar: ' + error.message)

  revalidatePath('/dashboard/athlete')
}

// ─── Team-sport athlete-facing data ──────────────────────────────────────────

async function getMyAthleteId(): Promise<{ athleteId: string; clubId: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  
  console.log("[DEBUG getMyAthleteId] userId:", userId, "email:", email, "clubId:", clubId)
  
  if (!email) throw new Error('No se encontró email')
  const { data } = await supabase
    .from('athletes').select('id, email, name').eq('club_id', clubId).eq('email', email).maybeSingle()
  
  console.log("[DEBUG getMyAthleteId] athlete lookup result:", data)
  
  if (!data) throw new Error('Perfil de atleta no encontrado')
  return { athleteId: data.id, clubId }
}

/**
 * Get rosters (call-ups) where this athlete is included.
 */
export async function getMyRosters() {
  const { athleteId, clubId } = await getMyAthleteId()
  const supabase = createAdminClient()

  console.log("[DEBUG getMyRosters] athleteId:", athleteId, "clubId:", clubId)

  const { data, error } = await supabase
    .from('roster_athletes')
    .select(`
      id, number, position, is_captain, is_starter, status,
      rosters (
        id, name, match_date, opponent, venue, notes,
        competitions ( id, name, type )
      )
    `)
    .eq('athlete_id', athleteId)

  console.log("[DEBUG getMyRosters] query result:", { data: data?.length ?? 0, error: error?.message })

  if (error) throw new Error(error.message)

  type RosterRow = {
    id: string; number: number | null; position: string | null
    is_captain: boolean; is_starter?: boolean | null; status: string
    rosters: {
      id: string; name: string; match_date: string
      opponent: string | null; venue: string | null; notes: string | null
      competitions: { id: string; name: string; type: string } | null
    } | null
  }

  return ((data ?? []) as unknown as RosterRow[])
    .filter((r) => r.rosters !== null)
    .sort((a, b) => (b.rosters!.match_date).localeCompare(a.rosters!.match_date))
}

/**
 * Get matches where the athlete was in the roster.
 */
export async function getMyMatches() {
  const { athleteId, clubId } = await getMyAthleteId()
  const supabase = createAdminClient()

  // Get roster IDs this athlete belongs to
  const { data: rosterRows } = await supabase
    .from('roster_athletes')
    .select('roster_id')
    .eq('athlete_id', athleteId)

  const rosterIds = (rosterRows ?? []).map((r) => r.roster_id).filter(Boolean)
  if (rosterIds.length === 0) return []

  // Get matches linked to those rosters
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*, competitions(id, name)')
    .eq('club_id', clubId)
    .in('roster_id', rosterIds)
    .order('match_date', { ascending: false })

  if (error) throw new Error(error.message)
  return matches ?? []
}

/**
 * Get aggregated personal stats for this athlete across all matches.
 */
export async function getMyStats() {
  const { athleteId, clubId } = await getMyAthleteId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('match_events')
    .select('event_type, event_value, match_id, matches(match_date, opponent, competitions(name))')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  type EventRow = {
    event_type: string; event_value: number; match_id: string
    matches: { match_date: string; opponent: string | null; competitions: { name: string } | null } | null
  }

  const events = (data ?? []) as unknown as EventRow[]

  // Aggregate totals
  const totals: Record<string, number> = {}
  for (const ev of events) {
    totals[ev.event_type] = (totals[ev.event_type] ?? 0) + Number(ev.event_value)
  }

  // Per-match breakdown
  const byMatch = new Map<string, { match_date: string; opponent: string; competition: string; stats: Record<string, number> }>()
  for (const ev of events) {
    if (!byMatch.has(ev.match_id)) {
      byMatch.set(ev.match_id, {
        match_date: ev.matches?.match_date ?? '',
        opponent: ev.matches?.opponent ?? '—',
        competition: ev.matches?.competitions?.name ?? '',
        stats: {},
      })
    }
    const entry = byMatch.get(ev.match_id)!
    entry.stats[ev.event_type] = (entry.stats[ev.event_type] ?? 0) + Number(ev.event_value)
  }

  return {
    totals,
    matchCount: byMatch.size,
    byMatch: Array.from(byMatch.values()).sort((a, b) => b.match_date.localeCompare(a.match_date)),
  }
}

/**
 * Get a specific roster where this athlete is included.
 */
export async function getMyRosterById(rosterId: string) {
  const { athleteId, clubId } = await getMyAthleteId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('roster_athletes')
    .select(`
      id, number, position, is_captain, is_starter, status,
      rosters (
        id, name, match_date, opponent, venue, notes,
        competitions ( id, name, type, status ),
        matches ( id, home_score, away_score, status, is_home )
      )
    `)
    .eq('roster_id', rosterId)
    .eq('athlete_id', athleteId)
    .single()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Citación no encontrada')

  return data
}

/**
 * Athlete self-submits a payment for an existing subscription (renewal/overdue).
 * Creates a pending payment record tied to their subscription.
 * For transfer: stores the receipt URL in notes. Admin confirms manually.
 * For other methods (cash, card, etc.): creates a pending record for admin to confirm.
 */
export async function submitSelfPayment(params: {
  paymentMethod: string
  receiptUrl?: string
  concept?: string
  /** Si transferencia sin archivo: el atleta enviará el comprobante por WhatsApp */
  transferReceiptSource?: 'upload' | 'whatsapp'
}) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  if (!email) throw new Error('No se encontró un email asociado a tu cuenta')

  // Get athlete
  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()

  if (!athlete) throw new Error('No se encontró tu perfil de atleta')

  const { data: clubRow } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', clubId)
    .single()
  const enabledIds = getEnabledPaymentMethodIdsFromClubSettings(
    (clubRow?.settings ?? {}) as Record<string, unknown>
  )
  assertPaymentMethodEnabled(enabledIds, params.paymentMethod)

  // Get active subscription + plan (including billing anchor day for period calc)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, plan_id, billing_anchor_day, plans(id, name, price, billing_cycle)')
    .eq('club_id', clubId)
    .eq('athlete_id', athlete.id)
    .eq('status', 'active')
    .maybeSingle()

  if (!subscription) throw new Error('No se encontró una suscripción activa. Contacta al club.')

  const plansData = subscription.plans as unknown
  const plan = Array.isArray(plansData)
    ? plansData[0]
    : (plansData as { id: string; name: string; price: number; billing_cycle: string } | null)

  if (!plan) throw new Error('No se encontró el plan asociado a tu suscripción')

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const cycle = plan.billing_cycle as BillingCycle

  // Determine the billing period this payment covers
  const anchorDay = subscription.billing_anchor_day ?? getBillingAnchorDay(today)
  const { periodStart, periodEnd } = calculatePeriodStartForPayment(anchorDay, today, cycle)
  const periodStartStr = periodStart.toISOString().split('T')[0]
  const periodEndStr = periodEnd ? periodEnd.toISOString().split('T')[0] : null

  const month = periodStart.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const concept = params.concept || `${plan.name} – ${month}`

  if (params.paymentMethod === 'transfer') {
    if (!params.receiptUrl && params.transferReceiptSource !== 'whatsapp') {
      throw new Error('Adjunta el comprobante o envíalo por WhatsApp y luego confirma aquí.')
    }
  }

  let notes: string | null = null
  if (params.paymentMethod === 'transfer') {
    if (params.receiptUrl) notes = `Comprobante: ${params.receiptUrl}`
    else if (params.transferReceiptSource === 'whatsapp') {
      notes = 'Comprobante enviado por WhatsApp (pendiente de revisión).'
    }
  }

  const { error } = await supabase
    .from('payments')
    .insert({
      club_id: clubId,
      athlete_id: athlete.id,
      plan_id: plan.id,
      subscription_id: subscription.id,
      concept,
      amount: plan.price,
      status: 'pending',
      due_date: todayStr,
      payment_method: params.paymentMethod,
      notes,
      period_start: periodStartStr,
      period_end: periodEndStr,
    })

  if (error) throw new Error('Error al registrar el pago: ' + error.message)

  revalidatePath('/dashboard/athlete/payments')
  revalidatePath('/dashboard/payments')

  return { success: true, isTransfer: params.paymentMethod === 'transfer' }
}

export async function createFlowCheckoutForSelfPayment() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null
  if (!email) throw new Error('No se encontró un email asociado a tu cuenta')

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('email', email)
    .maybeSingle()
  if (!athlete) throw new Error('No se encontró tu perfil de atleta')

  const { data: clubRow } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', clubId)
    .single()
  const settings = (clubRow?.settings ?? {}) as Record<string, unknown>
  const enabledIds = getEnabledPaymentMethodIdsFromClubSettings(settings)
  assertPaymentMethodEnabled(enabledIds, 'flow')

  const flowConfig = resolveFlowConfigFromSettings(settings)
  if (!flowConfig) {
    throw new Error('Flow no está configurado con credenciales API. Configura API Key + Secret Key.')
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, plan_id, billing_anchor_day, plans(id, name, price, billing_cycle)')
    .eq('club_id', clubId)
    .eq('athlete_id', athlete.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!subscription) throw new Error('No se encontró una suscripción activa. Contacta al club.')

  const plansData = subscription.plans as unknown
  const plan = Array.isArray(plansData)
    ? plansData[0]
    : (plansData as { id: string; name: string; price: number; billing_cycle: string } | null)
  if (!plan) throw new Error('No se encontró el plan asociado a tu suscripción')

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const cycle = plan.billing_cycle as BillingCycle
  const anchorDay = subscription.billing_anchor_day ?? getBillingAnchorDay(now)
  const { periodStart, periodEnd } = calculatePeriodStartForPayment(anchorDay, now, cycle)
  const periodStartStr = periodStart.toISOString().split('T')[0]
  const periodEndStr = periodEnd ? periodEnd.toISOString().split('T')[0] : null
  const month = periodStart.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const concept = `${plan.name} – ${month}`

  const { data: payment, error: paymentErr } = await supabase
    .from('payments')
    .insert({
      club_id: clubId,
      athlete_id: athlete.id,
      plan_id: plan.id,
      subscription_id: subscription.id,
      concept,
      amount: plan.price,
      status: 'pending',
      due_date: todayStr,
      payment_method: 'flow',
      period_start: periodStartStr,
      period_end: periodEndStr,
    })
    .select('id')
    .single()
  if (paymentErr || !payment) throw new Error('No se pudo crear el pago pendiente para Flow')

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const commerceOrder = `pay_${payment.id}`
  try {
    const created = await createFlowPayment(flowConfig, {
      commerceOrder,
      subject: concept.slice(0, 90),
      currency: 'CLP',
      amount: Number(plan.price),
      email,
      urlConfirmation: `${baseUrl}/api/webhooks/flow`,
      urlReturn: `${baseUrl}/api/payments/flow/return`,
    })

    await supabase
      .from('payments')
      .update({
        transaction_id: created.token,
        notes: `Flow order: ${commerceOrder}`,
      })
      .eq('id', payment.id)
      .eq('club_id', clubId)

    revalidatePath('/dashboard/athlete/payments')
    revalidatePath('/dashboard/payments')

    return { checkoutUrl: created.checkoutUrl }
  } catch (e) {
    await supabase.from('payments').delete().eq('id', payment.id).eq('club_id', clubId)
    throw e
  }
}
