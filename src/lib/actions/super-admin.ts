'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureAthleteRecordForUser, archiveAthleteForUser } from '@/lib/admin-athlete-sync'
import { CLUB_COOKIE } from '@/lib/constants'

// ─── Auth guard ────────────────────────────────────────────────────────────
export async function requireSuperAdmin() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (!data) throw new Error('Acceso denegado: no eres Super Admin')
  return userId
}

export async function isSuperAdmin(): Promise<boolean> {
  try {
    await requireSuperAdmin()
    return true
  } catch {
    return false
  }
}

// ─── Clubs ─────────────────────────────────────────────────────────────────
export async function getAllClubs() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('clubs')
    .select(`
      id, name, slug, sport_type, city, country, primary_color, logo_url,
      is_active, created_at, email, phone,
      athletes(count),
      user_clubs(count)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Fetch SaaS subscriptions separately
  const { data: subs } = await supabase
    .from('club_saas_subscriptions')
    .select('club_id, status, billing_cycle, current_period_end, trial_ends_at, saas_plans(name, slug, price_monthly)')

  const subMap = Object.fromEntries((subs ?? []).map((s) => [s.club_id, s]))

  return (data ?? []).map((c) => ({
    ...c,
    athlete_count: (c.athletes as unknown as { count: number }[])[0]?.count ?? 0,
    user_count:    (c.user_clubs as unknown as { count: number }[])[0]?.count ?? 0,
    saas_sub:      subMap[c.id] ?? null,
  }))
}

export type ClubListItem = Awaited<ReturnType<typeof getAllClubs>>[number]

export async function getClubDetail(clubId: string) {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const [clubRes, usersRes, athletesRes, saasSubRes, billingRes] = await Promise.all([
    supabase
      .from('clubs')
      .select('*')
      .eq('id', clubId)
      .single(),
    supabase
      .from('user_clubs')
      .select('id, user_id, role, is_active, created_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false }),
    supabase
      .from('athletes')
      .select('id, name, status, health_status, created_at, category')
      .eq('club_id', clubId)
      .order('name'),
    supabase
      .from('club_saas_subscriptions')
      .select('*, saas_plans(id, name, slug, price_monthly, price_annual, features)')
      .eq('club_id', clubId)
      .single(),
    supabase
      .from('saas_billing_history')
      .select('*, saas_plans(name)')
      .eq('club_id', clubId)
      .order('billing_date', { ascending: false })
      .limit(12),
  ])

  if (clubRes.error) throw new Error(clubRes.error.message)

  // Revenue stats from club's own payments
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, status, paid_at')
    .eq('club_id', clubId)
    .eq('status', 'paid')

  const totalRevenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)

  return {
    club:     clubRes.data,
    users:    usersRes.data ?? [],
    athletes: athletesRes.data ?? [],
    saas_sub: saasSubRes.data ?? null,
    billing:  billingRes.data ?? [],
    stats: {
      total_athletes:  (athletesRes.data ?? []).length,
      active_athletes: (athletesRes.data ?? []).filter((a) => a.status === 'active').length,
      total_users:     (usersRes.data ?? []).length,
      total_revenue:   totalRevenue,
    },
  }
}

// ─── Activate / Deactivate club ───────────────────────────────────────────
export async function setClubActive(clubId: string, isActive: boolean) {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clubs')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/super-admin')
  revalidatePath('/super-admin/clubs')
  return { ok: true }
}

// ─── SaaS Plans ──────────────────────────────────────────────────────────
export async function getSaasPlans() {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('saas_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Update club's SaaS subscription ─────────────────────────────────────
export async function updateClubSaasSub(clubId: string, input: {
  saas_plan_id: string
  status: string
  billing_cycle: string
  notes?: string
}) {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const today = new Date()
  const periodEnd = new Date(today)
  periodEnd.setMonth(periodEnd.getMonth() + (input.billing_cycle === 'annual' ? 12 : 1))

  const { error } = await supabase
    .from('club_saas_subscriptions')
    .upsert({
      club_id:              clubId,
      saas_plan_id:         input.saas_plan_id,
      status:               input.status,
      billing_cycle:        input.billing_cycle,
      current_period_start: today.toISOString(),
      current_period_end:   periodEnd.toISOString(),
      notes:                input.notes ?? null,
      updated_at:           today.toISOString(),
    }, { onConflict: 'club_id' })

  if (error) throw new Error(error.message)
  revalidatePath(`/super-admin/clubs/${clubId}`)
  revalidatePath('/super-admin/billing')
  return { ok: true }
}

// ─── Record a manual SaaS payment ────────────────────────────────────────
export async function recordSaasBillingPayment(input: {
  club_id: string
  saas_plan_id: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
  notes?: string
}) {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('saas_billing_history')
    .insert({
      ...input,
      billing_date: new Date().toISOString(),
      paid_at:      input.status === 'paid' ? new Date().toISOString() : null,
    })
  if (error) throw new Error(error.message)
  revalidatePath(`/super-admin/clubs/${input.club_id}`)
  revalidatePath('/super-admin/billing')
  return { ok: true }
}

// ─── Link / unlink a user to a club ──────────────────────────────────────
export async function linkUserToClub(
  clubId: string,
  clerkUserId: string,
  role: 'admin' | 'coach' | 'athlete' | 'admin_athlete' = 'admin'
) {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('user_clubs')
    .select('id, is_active')
    .eq('user_id', clerkUserId)
    .eq('club_id', clubId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('user_clubs')
      .update({ is_active: true, role })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('user_clubs')
      .insert({ user_id: clerkUserId, club_id: clubId, role, is_active: true })
    if (error) throw new Error(error.message)
  }

  if (role === 'admin_athlete' || role === 'athlete') {
    const { data: userRow } = await supabase
      .from('users')
      .select('email, name')
      .eq('clerk_id', clerkUserId)
      .maybeSingle()

    let email = (userRow?.email as string | null) ?? null
    let name = (userRow?.name as string | null) ?? null

    if (!email || !name) {
      try {
        const clerk = await clerkClient()
        const u = await clerk.users.getUser(clerkUserId)
        email = email ?? (u.emailAddresses?.[0]?.emailAddress ?? null)
        name = name ?? ([u.firstName, u.lastName].filter(Boolean).join(' ') || email)
      } catch {
        /* Clerk opcional si falla API */
      }
    }

    await ensureAthleteRecordForUser({
      clubId,
      userId: clerkUserId,
      email,
      name,
    }).catch((err) => {
      console.error('[linkUserToClub] ensureAthleteRecordForUser:', err)
    })

    revalidatePath('/dashboard/athletes')
  } else {
    // Rol staff sin jugador → archivar ficha de atleta si existía.
    await archiveAthleteForUser({ clubId, userId: clerkUserId }).catch((err) => {
      console.error('[linkUserToClub] archiveAthleteForUser:', err)
    })
    revalidatePath('/dashboard/athletes')
    revalidatePath('/dashboard/attendance')
  }

  revalidatePath(`/super-admin/clubs/${clubId}`)
  return { ok: true }
}

export async function removeUserFromClub(clubId: string, clerkUserId: string) {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('user_clubs')
    .update({ is_active: false })
    .eq('user_id', clerkUserId)
    .eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath(`/super-admin/clubs/${clubId}`)
  return { ok: true }
}

// ─── Super Admin: enter any club dashboard ──────────────────────────────────
/** Fija `user_clubs.role` en `admin`. Para admin + jugador, vincular con `linkUserToClub(..., 'admin_athlete')`. */
export async function superAdminEnterClub(clubId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  await requireSuperAdmin()

  const supabase = createAdminClient()

  // Upsert: garantiza que la fila exista y esté activa antes de setear el cookie
  const { error: upsertErr } = await supabase
    .from('user_clubs')
    .upsert(
      { user_id: userId, club_id: clubId, role: 'admin', is_active: true },
      { onConflict: 'user_id,club_id', ignoreDuplicates: false }
    )

  if (upsertErr) throw new Error(`No se pudo vincular al club: ${upsertErr.message}`)

  const cookieStore = await cookies()
  cookieStore.set(CLUB_COOKIE, clubId, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })

  revalidatePath('/dashboard')
  return { ok: true }
}

// ─── Register / remove super admin ─────────────────────────────────────────
export async function addSuperAdmin(userId: string, email?: string, name?: string) {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('super_admins')
    .insert({ user_id: userId, email, name })
  if (error) throw new Error(error.message)
  revalidatePath('/super-admin')
  return { ok: true }
}

// ─── Global KPIs ─────────────────────────────────────────────────────────
export async function getSuperAdminKPIs() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const [clubsRes, saasSubsRes, athletesRes, billingRes] = await Promise.all([
    supabase.from('clubs').select('id, is_active, created_at', { count: 'exact' }),
    supabase.from('club_saas_subscriptions').select('status, saas_plans(price_monthly)'),
    supabase.from('athletes').select('id', { count: 'exact' }).eq('status', 'active'),
    supabase
      .from('saas_billing_history')
      .select('amount, status, billing_date')
      .eq('status', 'paid')
      .gte('billing_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const clubs       = clubsRes.data ?? []
  const saasSubs    = saasSubsRes.data ?? []
  const totalAthletes = athletesRes.count ?? 0

  const activeClubs  = clubs.filter((c) => c.is_active).length
  const mrr = saasSubs
    .filter((s) => s.status === 'active' || s.status === 'trialing')
    .reduce((s, sub) => {
      const plan = sub.saas_plans as { price_monthly?: number } | null
      return s + (plan?.price_monthly ?? 0)
    }, 0)

  const revenueThisMonth = (billingRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0)

  const newThisMonth = clubs.filter((c) => {
    const d = new Date(c.created_at)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  return {
    total_clubs:     clubs.length,
    active_clubs:    activeClubs,
    inactive_clubs:  clubs.length - activeClubs,
    total_athletes:  totalAthletes,
    mrr,
    revenue_this_month: revenueThisMonth,
    new_clubs_this_month: newThisMonth,
    saas_breakdown: saasSubs.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1
      return acc
    }, {}),
  }
}

// ─── Update club notes (internal) ─────────────────────────────────────────
export async function updateClubNotes(clubId: string, notes: string) {
  await requireSuperAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clubs')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath(`/super-admin/clubs/${clubId}`)
  return { ok: true }
}
