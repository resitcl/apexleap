'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'

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

  // Calculate end date based on billing cycle
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

  // Create subscription
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
    })

  if (subErr) throw new Error('Error al crear la suscripción: ' + subErr.message)

  // Create initial payment record (pending) — non-blocking
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
export async function getOnboardingData() {
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

  // Current athlete record (if exists)
  type OnboardingAthlete = { id: string; name: string; phone: string | null; birth_date: string | null; emergency_contact: string | null; emergency_phone: string | null; technical_meta: Record<string, unknown> | null }
  let athlete: OnboardingAthlete | null = null
  if (email) {
    const { data } = await supabase
      .from('athletes')
      .select('id, name, phone, birth_date, emergency_contact, emergency_phone, technical_meta')
      .eq('club_id', clubId)
      .eq('email', email)
      .maybeSingle()
    athlete = data as OnboardingAthlete | null
  }

  // Active or pending_payment subscription
  let hasActiveSubscription = false
  let hasPendingPayment = false
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
        .select('id')
        .eq('club_id', clubId)
        .eq('athlete_id', athlete.id)
        .eq('status', 'pending_payment')
        .maybeSingle()
      hasPendingPayment = !!pendingSub
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

  const profileComplete = !!athlete && Object.keys(athlete.technical_meta ?? {}).length > 0

  // Extract bank_info from club settings
  const settings = (club?.settings ?? {}) as Record<string, unknown>
  const bankInfo = (settings.bank_info as {
    bank_name?: string
    account_type?: string
    account_number?: string
    account_holder?: string
    rut?: string
    email?: string
  } | null) ?? null

  return {
    needsOnboarding: !hasActiveSubscription,
    hasPendingPayment,
    club: club ?? { id: clubId, name: 'Club', slug: '', sport_type: null, logo_url: null, primary_color: null, settings: {} },
    bankInfo,
    user: { fullName, email, photoUrl },
    athlete,
    profileComplete,
    hasActiveSubscription,
    plans: plans ?? [],
  }
}

export type OnboardingData = Awaited<ReturnType<typeof getOnboardingData>>

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
 * Enroll athlete in plan with chosen payment method.
 */
export async function enrollWithPayment(planId: string, paymentMethod: string, receiptUrl?: string) {
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

  // For transfer payments: subscription starts as pending_payment until admin confirms
  const isTransfer = paymentMethod === 'transfer'
  const subStatus = isTransfer ? 'pending_payment' as const : 'active' as const

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
      auto_renew: !isTransfer,
    })

  if (subErr) throw new Error('Error al crear la suscripción: ' + subErr.message)

  // Create payment record
  const totalAmount = (plan.price ?? 0) + (plan.enrollment_fee ?? 0)
  if (totalAmount > 0) {
    const concept = plan.enrollment_fee && plan.enrollment_fee > 0
      ? `Inscripción + Matrícula – ${plan.name}`
      : `Inscripción – ${plan.name}`

    const notes = isTransfer && receiptUrl
      ? `Comprobante: ${receiptUrl}`
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

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${clubId}/receipts/${userId}-${Date.now()}.${ext}`

  // Ensure bucket exists (idempotent)
  await supabase.storage.createBucket('payment-receipts', { public: true, fileSizeLimit: 5 * 1024 * 1024 })

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
      id, number, position, is_captain, status,
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
    is_captain: boolean; status: string
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
      id, number, position, is_captain, status,
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
