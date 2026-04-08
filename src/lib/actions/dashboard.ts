'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'
import { clerkClient } from '@clerk/nextjs/server'


export async function getDashboardSummary() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [
    athletesResult,
    paymentsResult,
    attendanceTodayResult,
    overdueResult,
    topAttendanceResult,
    activeSubsResult,
    cancelledResult,
  ] = await Promise.all([
    // Athletes by health/status
    supabase
      .from('athletes')
      .select('id, status, health_status, created_at')
      .eq('club_id', clubId)
      .is('archived_at', null),

    // All payments for MRR + monthly income
    supabase
      .from('payments')
      .select('status, amount, paid_at, athlete_id, athletes(id, name)')
      .eq('club_id', clubId),

    // Today's attendance
    supabase
      .from('attendance')
      .select('id, is_valid')
      .eq('club_id', clubId)
      .gte('checked_in_at', today.toISOString())
      .lt('checked_in_at', tomorrow.toISOString()),

    // Overdue athletes (for semáforo)
    supabase
      .from('payments')
      .select('athlete_id')
      .eq('club_id', clubId)
      .eq('status', 'overdue'),

    // Top attendance this month
    supabase
      .from('attendance')
      .select('athlete_id, athletes(id, name, health_status)')
      .eq('club_id', clubId)
      .eq('is_valid', true)
      .gte('checked_in_at', monthStart),

    // Active subscriptions
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact' })
      .eq('club_id', clubId)
      .eq('status', 'active'),

    // Cancelled this month (for churn)
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact' })
      .eq('club_id', clubId)
      .eq('status', 'cancelled')
      .gte('updated_at', monthStart),
  ])

  const athletes = athletesResult.data ?? []
  const payments = paymentsResult.data ?? []
  const attendanceToday = attendanceTodayResult.data ?? []
  const overdueAthleteIds = new Set((overdueResult.data ?? []).map((p) => p.athlete_id))
  const activeSubscriptions = activeSubsResult.count ?? 0
  const cancelledThisMonth = cancelledResult.count ?? 0

  // KPIs
  const totalAllAthletes = athletes.length
  const totalAthletes = athletes.filter((a) => a.status === 'active').length

  const mrr = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const monthlyIncome = payments
    .filter((p) => p.status === 'paid' && p.paid_at && p.paid_at >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const pendingAmount = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const overdueAmount = payments
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const todayCheckIns = attendanceToday.filter((a) => a.is_valid).length

  // Semáforo
  const semaforo = athletes
    .filter((a) => a.status === 'active')
    .map((a) => {
      const isOverdue = overdueAthleteIds.has(a.id)
      const isInjured = a.health_status === 'injured'
      const isObservation = a.health_status === 'observation'

      if (isInjured || isOverdue) return 'red'
      if (isObservation) return 'yellow'
      return 'green'
    })

  const semaforoCount = {
    green: semaforo.filter((s) => s === 'green').length,
    yellow: semaforo.filter((s) => s === 'yellow').length,
    red: semaforo.filter((s) => s === 'red').length,
  }

  // Top 3 athletes by overdue debt
  const topDebtors = Object.values(
    payments
      .filter((p) => p.status === 'overdue')
      .reduce<Record<string, { id: string; name: string; debt: number }>>((acc, p) => {
        const raw = (p as unknown as { athletes?: { id: string; name: string } | { id: string; name: string }[] | null }).athletes
        const ath = Array.isArray(raw) ? raw[0] ?? null : raw
        if (!ath) return acc
        if (!acc[ath.id]) acc[ath.id] = { id: ath.id, name: ath.name, debt: 0 }
        acc[ath.id].debt += Number(p.amount)
        return acc
      }, {})
  ).sort((a, b) => b.debt - a.debt).slice(0, 3)

  const curMonth = new Date().toISOString().slice(0, 7)
  const newThisMonth = athletes.filter((a) => (a.created_at ?? '').startsWith(curMonth)).length

  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
  const prevMonthIncome = payments
    .filter((p) => p.status === 'paid' && p.paid_at && p.paid_at.startsWith(prevMonth))
    .reduce((sum, p) => sum + Number(p.amount), 0)

  // Top 3 athletes by attendance this month
  const attRows = topAttendanceResult.data ?? []
  const attByAthlete = attRows.reduce<Record<string, { id: string; name: string; count: number; health_status: string }>>((acc, r) => {
    const ath = r.athletes as unknown as { id: string; name: string; health_status: string } | null
    if (!ath) return acc
    if (!acc[ath.id]) acc[ath.id] = { id: ath.id, name: ath.name, count: 0, health_status: ath.health_status ?? 'healthy' }
    acc[ath.id].count++
    return acc
  }, {})
  const topAthletes = Object.values(attByAthlete)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return {
    totalAthletes,
    totalAllAthletes,
    mrr,
    monthlyIncome,
    pendingAmount,
    overdueAmount,
    todayCheckIns,
    semaforoCount,
    topAthletes,
    activeSubscriptions,
    topDebtors,
    newThisMonth,
    cancelledThisMonth,
    prevMonthIncome,
  }
}

export async function getCoachDashboard() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const todayStr = today.toISOString().split('T')[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const todayDow = today.getDay()

  const [athletesRes, overdueRes, attendanceTodayRes, sessionsRes, monthAttRes] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, name, health_status, status, photo_url, notes, birth_date')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .is('archived_at', null)
      .order('name'),

    supabase
      .from('payments')
      .select('athlete_id')
      .eq('club_id', clubId)
      .eq('status', 'overdue'),

    supabase
      .from('attendance')
      .select('id, athlete_id, is_valid, checked_in_at, schedule_id, athletes(id, name, health_status, photo_url)')
      .eq('club_id', clubId)
      .gte('checked_in_at', today.toISOString())
      .lt('checked_in_at', tomorrow.toISOString())
      .order('checked_in_at', { ascending: false }),

    supabase
      .from('schedules')
      .select('id, name, start_time, end_time, capacity, coach_id')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .contains('day_of_week', [todayDow])
      .order('start_time'),

    supabase
      .from('attendance')
      .select('athlete_id')
      .eq('club_id', clubId)
      .eq('is_valid', true)
      .gte('checked_in_at', monthStart),
  ])

  const overdueIds = new Set((overdueRes.data ?? []).map((p) => p.athlete_id))
  const monthAttCounts = (monthAttRes.data ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.athlete_id] = (acc[r.athlete_id] ?? 0) + 1
    return acc
  }, {})

  const athletes = (athletesRes.data ?? []).map((a) => {
    const isOverdue = overdueIds.has(a.id)
    const isInjured = a.health_status === 'injured'
    const isObservation = a.health_status === 'observation'
    const semaforo: 'green' | 'yellow' | 'red' = isInjured || isOverdue ? 'red' : isObservation ? 'yellow' : 'green'
    return {
      ...a,
      semaforo,
      monthCheckIns: monthAttCounts[a.id] ?? 0,
    }
  })

  const checkedInTodayIds = new Set(
    (attendanceTodayRes.data ?? []).filter((a) => a.is_valid).map((a) => a.athlete_id)
  )

  const sessions = (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    start_time: s.start_time as string,
    end_time: s.end_time as string,
    capacity: s.capacity as number | null,
  }))

  const nowTime = today.toTimeString().slice(0, 5)
  const nextSession = sessions.find((s) => s.start_time >= nowTime) ?? sessions[sessions.length - 1] ?? null

  return {
    athletes,
    checkedInTodayIds: [...checkedInTodayIds],
    attendanceToday: attendanceTodayRes.data ?? [],
    sessions,
    nextSession,
    semaforoCount: {
      green: athletes.filter((a) => a.semaforo === 'green').length,
      yellow: athletes.filter((a) => a.semaforo === 'yellow').length,
      red: athletes.filter((a) => a.semaforo === 'red').length,
    },
  }
}

export async function getRecentActivity(limit = 10) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const [paymentsRes, attendanceRes, athletesRes] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, status, created_at, athletes(name)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('attendance')
      .select('id, is_valid, checked_in_at, athletes(name), schedules(name)')
      .eq('club_id', clubId)
      .order('checked_in_at', { ascending: false })
      .limit(limit),

    supabase
      .from('athletes')
      .select('id, name, created_at')
      .eq('club_id', clubId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  type ActivityItem = {
    id: string
    type: 'payment' | 'checkin' | 'athlete'
    label: string
    sublabel: string
    time: string
    badge?: string
  }

  const items: ActivityItem[] = []

  for (const p of paymentsRes.data ?? []) {
    const athlete = p.athletes as unknown as { name: string } | null
    items.push({
      id: `pay-${p.id}`,
      type: 'payment',
      label: athlete?.name ?? 'Alumno',
      sublabel: `Pago $${Number(p.amount).toLocaleString('es-CL')}`,
      time: p.created_at,
      badge: p.status,
    })
  }

  for (const a of attendanceRes.data ?? []) {
    const athlete = a.athletes as unknown as { name: string } | null
    const schedule = a.schedules as unknown as { name: string } | null
    items.push({
      id: `att-${a.id}`,
      type: 'checkin',
      label: athlete?.name ?? 'Alumno',
      sublabel: schedule?.name ? `Check-in · ${schedule.name}` : 'Check-in QR',
      time: a.checked_in_at,
      badge: a.is_valid ? 'valid' : 'invalid',
    })
  }

  for (const ath of athletesRes.data ?? []) {
    items.push({
      id: `ath-${ath.id}`,
      type: 'athlete',
      label: ath.name,
      sublabel: 'Nuevo alumno registrado',
      time: ath.created_at,
    })
  }

  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return items.slice(0, limit)
}

export async function getOverdueAlerts() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data } = await supabase
    .from('payments')
    .select('id, concept, amount, due_date, athlete_id, athletes(id, name)')
    .eq('club_id', clubId)
    .eq('status', 'overdue')
    .lte('due_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('due_date', { ascending: true })
    .limit(5)

  return (data ?? []) as unknown as Array<{
    id: string; concept: string; amount: number; due_date: string; athlete_id: string;
    athletes: { id: string; name: string } | null
  }>
}

export async function getWeeklyAttendanceRate() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [{ count: total }, { count: valid }] = await Promise.all([
    supabase.from('attendance').select('id', { count: 'exact', head: true })
      .eq('club_id', clubId).gte('checked_in_at', sevenDaysAgo.toISOString()),
    supabase.from('attendance').select('id', { count: 'exact', head: true })
      .eq('club_id', clubId).eq('is_valid', true).gte('checked_in_at', sevenDaysAgo.toISOString()),
  ])

  return {
    total: total ?? 0,
    valid: valid ?? 0,
    rate: total ? Math.round(((valid ?? 0) / total) * 100) : 0,
  }
}

export async function getExpiringSubscriptions() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = new Date().toISOString().split('T')[0]
  const inSevenDays = new Date()
  inSevenDays.setDate(inSevenDays.getDate() + 7)
  const sevenDaysLater = inSevenDays.toISOString().split('T')[0]

  const { data } = await supabase
    .from('subscriptions')
    .select('id, end_date, athlete_id, athletes(id, name), plans(name)')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .gte('end_date', today)
    .lte('end_date', sevenDaysLater)
    .order('end_date', { ascending: true })
    .limit(5)

  return (data ?? []) as unknown as Array<{
    id: string; end_date: string; athlete_id: string;
    athletes: { id: string; name: string } | null
    plans: { name: string } | null
  }>
}

export async function getUpcomingSchedules() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = new Date()
  const result: { dow: number; label: string; date: string; sessions: { id: string; name: string; start_time: string; end_time: string }[] }[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    const dateStr = d.toISOString().split('T')[0]
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })
    result.push({ dow, label, date: dateStr, sessions: [] })
  }

  const dows = [...new Set(result.map((r) => r.dow))]
  const { data } = await supabase
    .from('schedules')
    .select('id, name, start_time, end_time, day_of_week')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .overlaps('day_of_week', dows)

  for (const s of data ?? []) {
    const days: number[] = s.day_of_week ?? []
    for (const slot of result) {
      if (days.includes(slot.dow)) {
        slot.sessions.push({ id: s.id, name: s.name, start_time: s.start_time, end_time: s.end_time })
      }
    }
  }

  for (const slot of result) {
    slot.sessions.sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  return result.filter((r) => r.sessions.length > 0)
}

export async function getTodaySessions() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const todayDow = new Date().getDay()
  const todayStr = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('schedules')
    .select('id, name, start_time, end_time, capacity, attendance(id, is_valid, checked_in_at)')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .contains('day_of_week', [todayDow])

  return (data ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time)).map((s) => {
    const att = (s.attendance as Array<{ id: string; is_valid: boolean; checked_in_at: string }> | null) ?? []
    const todayAtt = att.filter((a) => a.checked_in_at.startsWith(todayStr))
    return {
      id: s.id,
      name: s.name,
      start_time: s.start_time,
      end_time: s.end_time,
      capacity: s.capacity as number | null,
      todayCheckIns: todayAtt.length,
      validCheckIns: todayAtt.filter((a) => a.is_valid).length,
    }
  })
}

export async function getMonthlyRevenue(months = 6) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const result: { month: string; label: string; amount: number }[] = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().split('T')[0]
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('payments')
      .select('amount')
      .eq('club_id', clubId)
      .eq('status', 'paid')
      .gte('paid_at', start)
      .lte('paid_at', end + 'T23:59:59')

    const amount = (data ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
    const label = d.toLocaleDateString('es-CL', { month: 'short' })
    result.push({ month: start, label, amount })
  }

  return result
}

export async function getAthletesWithoutPlan() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: withPlan } = await supabase
    .from('subscriptions')
    .select('athlete_id')
    .eq('club_id', clubId)
    .eq('status', 'active')

  const withPlanIds = (withPlan ?? []).map((s) => s.athlete_id).filter(Boolean)

  let query = supabase
    .from('athletes')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('status', 'active')
    .is('archived_at', null)

  if (withPlanIds.length > 0) query = query.not('id', 'in', `(${withPlanIds.join(',')})`)

  const { count } = await query
  return count ?? 0
}

export async function getWeeklyAttendanceByDay() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('attendance')
    .select('checked_in_at, is_valid')
    .eq('club_id', clubId)
    .gte('checked_in_at', sevenDaysAgo.toISOString())

  const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const result: { label: string; date: string; total: number; valid: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const rows = (data ?? []).filter((r) => r.checked_in_at.startsWith(dateStr))
    result.push({
      label: i === 0 ? 'Hoy' : DAYS_SHORT[d.getDay()],
      date: dateStr,
      total: rows.length,
      valid: rows.filter((r) => r.is_valid).length,
    })
  }

  return result
}

export async function getMonthlyRetentionRate() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const now = new Date()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
  const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Athletes active (with attendance) last month
  const { data: prevActive } = await supabase
    .from('attendance')
    .select('athlete_id')
    .eq('club_id', clubId)
    .eq('is_valid', true)
    .gte('checked_in_at', prevMonthStart)
    .lte('checked_in_at', prevMonthEnd)

  const prevIds = [...new Set((prevActive ?? []).map((r) => r.athlete_id).filter(Boolean))]
  if (prevIds.length === 0) return null

  // How many of those also attended this month
  const { data: currActive } = await supabase
    .from('attendance')
    .select('athlete_id')
    .eq('club_id', clubId)
    .eq('is_valid', true)
    .gte('checked_in_at', currMonthStart)
    .in('athlete_id', prevIds)

  const currIds = new Set((currActive ?? []).map((r) => r.athlete_id))
  const retained = prevIds.filter((id) => currIds.has(id)).length
  return { retained, total: prevIds.length, rate: Math.round((retained / prevIds.length) * 100) }
}

export async function getExpiredDocuments() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const today = new Date().toISOString().split('T')[0]
  const in30Days = new Date()
  in30Days.setDate(in30Days.getDate() + 30)
  const thirtyDaysLater = in30Days.toISOString().split('T')[0]

  const { data } = await supabase
    .from('documents')
    .select('id, name, category, expiry_date, status, athletes(id, name)')
    .eq('club_id', clubId)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', thirtyDaysLater)
    .order('expiry_date', { ascending: true })
    .limit(10)

  return (data ?? []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    category: d.category as string,
    expiry_date: d.expiry_date as string,
    status: d.status as string,
    isExpired: (d.expiry_date as string) < today,
    athletes: (Array.isArray(d.athletes) ? d.athletes[0] : d.athletes) as { id: string; name: string } | null,
  }))
}

export async function getAthletePortal() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const supabase = createAdminClient()

  const { data: userClub } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!userClub) throw new Error('Club no encontrado')
  const clubId = userClub.club_id as string

  // Use Clerk to get user email (consistent with enrollment)
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
  const todayDow = today.getDay()

  const { data: athletesByEmail } = email
    ? await supabase.from('athletes').select('id').eq('club_id', clubId).eq('email', email).is('archived_at', null).limit(1)
    : { data: null }

  const athleteId = athletesByEmail?.[0]?.id ?? null

  if (!athleteId) {
    const [attTodayRes, sessionsRes] = await Promise.all([
      supabase.from('attendance').select('id, is_valid, checked_in_at, athletes(id, name, health_status)').eq('club_id', clubId).gte('checked_in_at', today.toISOString()).lt('checked_in_at', tomorrow.toISOString()).order('checked_in_at', { ascending: false }).limit(20),
      supabase.from('schedules').select('id, name, start_time, end_time, capacity').eq('club_id', clubId).eq('is_active', true).contains('day_of_week', [todayDow]).order('start_time').limit(10),
    ])
    return {
      athlete: null,
      attendanceToday: attTodayRes.data ?? [],
      sessions: (sessionsRes.data ?? []).map((s) => ({ id: s.id, name: s.name, start_time: s.start_time as string, end_time: s.end_time as string, capacity: s.capacity as number | null })),
      monthCheckIns: 0,
      weeklyCheckIns: [] as number[],
      semaforo: 'green' as const,
      upcomingComps: [],
    }
  }

  const [athleteRes, attTodayRes, monthAttRes, sessionsRes, rostersRes, weeklyAttRes] = await Promise.all([
    supabase.from('athletes').select('*, subscriptions(id, status, start_date, end_date, plans(id, name, price, billing_cycle)), payments(id, concept, amount, status, due_date, paid_at), documents(id, name, status, expiry_date)').eq('id', athleteId).eq('club_id', clubId).single(),
    supabase.from('attendance').select('id, is_valid, checked_in_at').eq('club_id', clubId).eq('athlete_id', athleteId).gte('checked_in_at', today.toISOString()).lt('checked_in_at', tomorrow.toISOString()),
    supabase.from('attendance').select('id, is_valid').eq('club_id', clubId).eq('athlete_id', athleteId).gte('checked_in_at', monthStart),
    supabase.from('schedules').select('id, name, start_time, end_time, capacity').eq('club_id', clubId).eq('is_active', true).contains('day_of_week', [todayDow]).order('start_time').limit(10),
    supabase.from('rosters').select('id, competitions(id, name, type, start_date, location)').eq('athlete_id', athleteId),
    supabase.from('attendance').select('checked_in_at').eq('club_id', clubId).eq('athlete_id', athleteId).eq('is_valid', true).gte('checked_in_at', new Date(Date.now() - 56 * 86_400_000).toISOString()).order('checked_in_at'),
  ])

  const athlete = athleteRes.data
  const overduePayments = ((athlete as { payments?: { status: string }[] } | null)?.payments ?? []).filter((p) => p.status === 'overdue')
  const semaforo: 'green' | 'yellow' | 'red' =
    athlete?.health_status === 'injured' || overduePayments.length > 0 ? 'red' :
    athlete?.health_status === 'observation' ? 'yellow' : 'green'

  const monthCheckIns = (monthAttRes.data ?? []).filter((r) => r.is_valid).length

  // Weekly check-ins for last 8 weeks (index 0 = oldest, 7 = this week)
  const todayMs = new Date().setHours(23, 59, 59, 999)
  const weeklyCheckIns: number[] = Array(8).fill(0)
  for (const rec of weeklyAttRes.data ?? []) {
    const daysAgo = Math.floor((todayMs - new Date(rec.checked_in_at).getTime()) / 86_400_000)
    const weekIdx = 7 - Math.floor(daysAgo / 7)
    if (weekIdx >= 0 && weekIdx < 8) weeklyCheckIns[weekIdx]++
  }

  type RosterComp = { id: string; name: string; type: string; start_date: string; location: string | null }
  const todayISO = new Date().toISOString().split('T')[0]
  const upcomingComps = (rostersRes.data ?? []).flatMap((r) => {
    const raw = (r as unknown as { competitions: RosterComp | RosterComp[] | null }).competitions
    const comp = Array.isArray(raw) ? raw[0] ?? null : raw
    if (!comp || comp.start_date < todayISO) return []
    return [comp]
  }).sort((a, b) => a.start_date.localeCompare(b.start_date))

  return {
    athlete,
    attendanceToday: attTodayRes.data ?? [],
    sessions: (sessionsRes.data ?? []).map((s) => ({ id: s.id, name: s.name, start_time: s.start_time as string, end_time: s.end_time as string, capacity: s.capacity as number | null })),
    monthCheckIns,
    weeklyCheckIns,
    semaforo,
    upcomingComps,
  }
}

export async function getDormantAthletes(days = 30) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, name, attendance(checked_in_at)')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .is('archived_at', null)

  if (!athletes) return 0
  return athletes.filter((a) => {
    const att = (a.attendance as Array<{ checked_in_at: string }> | null) ?? []
    if (att.length === 0) return false
    const last = att.reduce((max, r) => r.checked_in_at > max ? r.checked_in_at : max, '')
    return last < cutoff
  }).length
}

/**
 * Get athlete growth over time (monthly counts for the last N months)
 */
export async function getAthleteGrowth(months = 6) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const now = new Date()

  const result: { month: string; label: string; total: number; new: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
    const monthStart = d.toISOString().split('T')[0]
    const monthEndISO = monthEnd.toISOString()

    // Count athletes created up to and including this month (cumulative)
    const { count: total } = await supabase
      .from('athletes')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .is('archived_at', null)
      .lte('created_at', monthEndISO)

    // Count athletes created in this specific month
    const { count: newCount } = await supabase
      .from('athletes')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .is('archived_at', null)
      .gte('created_at', monthStart)
      .lte('created_at', monthEndISO)

    const label = d.toLocaleDateString('es-CL', { month: 'short' })
    result.push({ month: monthStart, label, total: total ?? 0, new: newCount ?? 0 })
  }

  return result
}

/**
 * Get monthly attendance trends (check-ins per month for the last N months)
 */
export async function getMonthlyAttendance(months = 6) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const now = new Date()

  const result: { month: string; label: string; total: number; valid: number; uniqueAthletes: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().split('T')[0]
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('attendance')
      .select('id, is_valid, athlete_id')
      .eq('club_id', clubId)
      .gte('checked_in_at', start)
      .lte('checked_in_at', end + 'T23:59:59')

    const rows = data ?? []
    const uniqueAthletes = new Set(rows.map((r) => r.athlete_id)).size
    const label = d.toLocaleDateString('es-CL', { month: 'short' })
    
    result.push({
      month: start,
      label,
      total: rows.length,
      valid: rows.filter((r) => r.is_valid).length,
      uniqueAthletes,
    })
  }

  return result
}

/**
 * Get upcoming matches for team sports (next 5)
 */
export async function getUpcomingMatches(limit = 5) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('matches')
    .select('id, opponent, match_date, is_home, location, home_score, away_score, status, competition_id, competitions(name)')
    .eq('club_id', clubId)
    .gte('match_date', today)
    .neq('status', 'cancelled')
    .order('match_date', { ascending: true })
    .limit(limit)

  return (data ?? []).map((m) => ({
    id: m.id as string,
    opponent: m.opponent as string | null,
    match_date: m.match_date as string,
    is_home: m.is_home as boolean,
    location: m.location as string | null,
    home_score: m.home_score as number | null,
    away_score: m.away_score as number | null,
    status: m.status as string,
    competition: ((m.competitions as { name: string } | null)?.name) ?? null,
  }))
}

/**
 * Get season record for team sports
 */
export async function getSeasonRecord() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('matches')
    .select('id, is_home, home_score, away_score, status')
    .eq('club_id', clubId)
    .eq('status', 'finished')

  const matches = data ?? []
  let wins = 0, draws = 0, losses = 0

  for (const m of matches) {
    const ourScore = m.is_home ? m.home_score : m.away_score
    const theirScore = m.is_home ? m.away_score : m.home_score
    if (ourScore === null || theirScore === null) continue
    if (ourScore > theirScore) wins++
    else if (ourScore === theirScore) draws++
    else losses++
  }

  return { wins, draws, losses, total: matches.length }
}

/**
 * Get belt distribution for martial arts academies
 */
export async function getBeltDistribution() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('athletes')
    .select('id, technical_meta')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .is('archived_at', null)

  const athletes = data ?? []
  const distribution: Record<string, number> = {}

  for (const a of athletes) {
    const meta = a.technical_meta as Record<string, unknown> | null
    const belt = (meta?.belt as string | undefined)?.toLowerCase() ?? 'unassigned'
    distribution[belt] = (distribution[belt] ?? 0) + 1
  }

  return distribution
}

/**
 * Get upcoming graduations/promotions for academies
 */
export async function getUpcomingGraduations() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Athletes with 4 stripes are candidates for promotion
  const { data } = await supabase
    .from('athletes')
    .select('id, name, photo_url, technical_meta')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .is('archived_at', null)

  const candidates = (data ?? []).filter((a) => {
    const meta = a.technical_meta as Record<string, unknown> | null
    const stripes = typeof meta?.stripes === 'number' ? meta.stripes : 0
    return stripes >= 4
  }).map((a) => {
    const meta = a.technical_meta as Record<string, unknown> | null
    return {
      id: a.id as string,
      name: a.name as string,
      photo_url: a.photo_url as string | null,
      belt: (meta?.belt as string | undefined) ?? 'white',
      stripes: typeof meta?.stripes === 'number' ? meta.stripes : 0,
    }
  })

  return candidates.slice(0, 5)
}

/**
 * Get smart alerts for admin dashboard - incomplete profiles, missing data, etc.
 */
export async function getSmartAlerts() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: athletes } = await supabase
    .from('athletes')
    .select('id, name, email, phone, birth_date, emergency_contact, emergency_phone, photo_url, document_number, status, created_at')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .is('archived_at', null)

  const all = athletes ?? []

  // Athletes without emergency contact
  const noEmergencyContact = all.filter((a) => !a.emergency_contact || !a.emergency_phone)

  // Athletes without photo
  const noPhoto = all.filter((a) => !a.photo_url)

  // Athletes without birth date
  const noBirthDate = all.filter((a) => !a.birth_date)

  // Athletes without document/ID number
  const noDocumentNumber = all.filter((a) => !a.document_number)

  // Athletes without email
  const noEmail = all.filter((a) => !a.email)

  // Athletes without phone
  const noPhone = all.filter((a) => !a.phone)

  // New athletes in the last 7 days (might need attention)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const newAthletes = all.filter((a) => a.created_at && a.created_at >= sevenDaysAgo)

  // Incomplete profiles (missing 2+ critical fields)
  const incompleteProfiles = all.filter((a) => {
    let missing = 0
    if (!a.emergency_contact || !a.emergency_phone) missing++
    if (!a.photo_url) missing++
    if (!a.birth_date) missing++
    if (!a.document_number) missing++
    return missing >= 2
  })

  return {
    noEmergencyContact: noEmergencyContact.length,
    noPhoto: noPhoto.length,
    noBirthDate: noBirthDate.length,
    noDocumentNumber: noDocumentNumber.length,
    noEmail: noEmail.length,
    noPhone: noPhone.length,
    newAthletes: newAthletes.length,
    incompleteProfiles: incompleteProfiles.length,
    totalActive: all.length,
    // Sample names for display
    sampleNoEmergency: noEmergencyContact.slice(0, 3).map((a) => a.name),
    sampleIncomplete: incompleteProfiles.slice(0, 3).map((a) => a.name),
  }
}
