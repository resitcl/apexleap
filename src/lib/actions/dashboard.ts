'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getDashboardSummary() {
  const clubId = await getClubId()
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    athletesResult,
    paymentsResult,
    attendanceTodayResult,
    overdueResult,
  ] = await Promise.all([
    // Athletes by health/status
    supabase
      .from('athletes')
      .select('id, status, health_status')
      .eq('club_id', clubId),

    // All payments for MRR + monthly income
    supabase
      .from('payments')
      .select('status, amount, paid_at')
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
  ])

  const athletes = athletesResult.data ?? []
  const payments = paymentsResult.data ?? []
  const attendanceToday = attendanceTodayResult.data ?? []
  const overdueAthleteIds = new Set((overdueResult.data ?? []).map((p) => p.athlete_id))

  // KPIs
  const totalAthletes = athletes.filter((a) => a.status === 'active').length

  const mrr = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
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

  return {
    totalAthletes,
    mrr,
    monthlyIncome,
    pendingAmount,
    overdueAmount,
    todayCheckIns,
    semaforoCount,
  }
}

export async function getRecentActivity(limit = 10) {
  const clubId = await getClubId()
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()

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
  const supabase = await createClient()
  const todayDow = new Date().getDay()

  const { data } = await supabase
    .from('schedules')
    .select('id, name, start_time, end_time')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .contains('day_of_week', [todayDow])

  return (data ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time))
}

export async function getMonthlyRevenue(months = 6) {
  const clubId = await getClubId()
  const supabase = await createClient()

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
  const supabase = await createClient()

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

  if (withPlanIds.length > 0) query = query.not('id', 'in', `(${withPlanIds.join(',')})`)

  const { count } = await query
  return count ?? 0
}

export async function getExpiredDocuments() {
  const clubId = await getClubId()
  const supabase = await createClient()

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
