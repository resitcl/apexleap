'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getClubStats() {
  const clubId = await getClubId()
  const supabase = await createClient()

  const now = new Date()
  const months: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
    months.push({ key, label })
  }
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

  const [athletesRes, attendanceRes, paymentsRes, injuriesRes] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, name, status, health_status, created_at, birth_date, performance_meta')
      .eq('club_id', clubId)
      .order('name'),

    supabase
      .from('attendance')
      .select('athlete_id, checked_in_at, is_valid, athletes(id, name)')
      .eq('club_id', clubId)
      .eq('is_valid', true)
      .gte('checked_in_at', sixMonthsAgo)
      .order('checked_in_at'),

    supabase
      .from('payments')
      .select('athlete_id, amount, status, paid_at')
      .eq('club_id', clubId)
      .gte('paid_at', sixMonthsAgo),

    supabase
      .from('injuries')
      .select('athlete_id, severity, start_date, actual_recovery')
      .eq('club_id', clubId)
      .gte('start_date', sixMonthsAgo),
  ])

  const athletes = athletesRes.data ?? []
  const attendance = attendanceRes.data ?? []
  const payments = paymentsRes.data ?? []
  const injuries = injuriesRes.data ?? []

  // Asistencia por mes (club total)
  const attendanceByMonth = months.map(({ key, label }) => ({
    label,
    count: attendance.filter((a) => a.checked_in_at.startsWith(key)).length,
  }))

  // Ingresos por mes
  const revenueByMonth = months.map(({ key, label }) => ({
    label,
    amount: payments
      .filter((p) => p.status === 'paid' && p.paid_at?.startsWith(key))
      .reduce((s, p) => s + Number(p.amount), 0),
  }))

  // Altas por mes
  const newAthletesByMonth = months.map(({ key, label }) => ({
    label,
    count: athletes.filter((a) => (a.created_at ?? '').startsWith(key)).length,
  }))

  // Top 10 atletas por asistencia (últimos 6 meses)
  const attByAthlete = attendance.reduce<Record<string, { id: string; name: string; count: number }>>((acc, r) => {
    const raw = r.athletes as unknown
    const ath = (Array.isArray(raw) ? raw[0] : raw) as { id: string; name: string } | null
    if (!ath) return acc
    if (!acc[ath.id]) acc[ath.id] = { id: ath.id, name: ath.name, count: 0 }
    acc[ath.id].count++
    return acc
  }, {})
  const topByAttendance = Object.values(attByAthlete)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Distribución por estado de salud
  const healthDist = {
    healthy:     athletes.filter((a) => a.status === 'active' && a.health_status === 'healthy').length,
    observation: athletes.filter((a) => a.status === 'active' && a.health_status === 'observation').length,
    injured:     athletes.filter((a) => a.status === 'active' && a.health_status === 'injured').length,
  }

  // Lesiones por mes
  const injuriesByMonth = months.map(({ key, label }) => ({
    label,
    count: injuries.filter((i) => (i.start_date ?? '').startsWith(key)).length,
  }))

  // Tasa de asistencia promedio (últimos 30 días)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const recentAtt = attendance.filter((a) => a.checked_in_at >= thirtyDaysAgo)
  const activeAthletes = athletes.filter((a) => a.status === 'active').length
  const avgDailyCheckIns = activeAthletes > 0 ? Math.round((recentAtt.length / 30) * 10) / 10 : 0

  return {
    months: months.map((m) => m.label),
    attendanceByMonth,
    revenueByMonth,
    newAthletesByMonth,
    injuriesByMonth,
    topByAttendance,
    healthDist,
    avgDailyCheckIns,
    totalAthletes: athletes.filter((a) => a.status === 'active').length,
    totalCheckInsLastMonth: attendanceByMonth[5]?.count ?? 0,
  }
}

export async function getAthleteStats(athleteId: string) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const now = new Date()
  const months: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-CL', { month: 'short' }),
    })
  }

  const [athleteRes, attendanceRes, paymentsRes, injuriesRes] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, name, birth_date, health_status, status, performance_meta, created_at, notes')
      .eq('id', athleteId)
      .eq('club_id', clubId)
      .single(),

    supabase
      .from('attendance')
      .select('id, checked_in_at, is_valid')
      .eq('athlete_id', athleteId)
      .eq('club_id', clubId)
      .order('checked_in_at', { ascending: false })
      .limit(200),

    supabase
      .from('payments')
      .select('id, amount, status, paid_at, due_date, concept')
      .eq('athlete_id', athleteId)
      .eq('club_id', clubId)
      .order('due_date', { ascending: false })
      .limit(50),

    supabase
      .from('injuries')
      .select('id, diagnosis, severity, start_date, estimated_recovery, actual_recovery')
      .eq('athlete_id', athleteId)
      .eq('club_id', clubId)
      .order('start_date', { ascending: false }),
  ])

  const athlete = athleteRes.data
  const attendance = attendanceRes.data ?? []
  const allPayments = paymentsRes.data ?? []
  const allInjuries = injuriesRes.data ?? []

  const validAtt = attendance.filter((a) => a.is_valid)

  // Asistencia por mes (últimos 6 meses)
  const checkInsByMonth = months.map(({ key, label }) => ({
    label,
    count: validAtt.filter((a) => a.checked_in_at.startsWith(key)).length,
  }))

  // Racha actual de asistencia
  let streak = 0
  const sortedAtt = [...validAtt].sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))
  if (sortedAtt.length > 0) {
    let prev = new Date(sortedAtt[0].checked_in_at)
    streak = 1
    for (let i = 1; i < sortedAtt.length; i++) {
      const cur = new Date(sortedAtt[i].checked_in_at)
      const diffDays = Math.round((prev.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays <= 7) { streak++; prev = cur } else break
    }
  }

  // Pagos: pagados vs pendientes vs vencidos
  const paidTotal = allPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const overdueTotal = allPayments.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)

  // Tasa de asistencia (últimos 30 días)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const recentAtt = attendance.filter((a) => a.checked_in_at >= thirtyDaysAgo)
  const attRate30 = recentAtt.length > 0 ? Math.round((recentAtt.filter((a) => a.is_valid).length / recentAtt.length) * 100) : 0

  return {
    athlete,
    checkInsByMonth,
    streak,
    totalCheckIns: validAtt.length,
    attRate30,
    paidTotal,
    overdueTotal,
    injuries: allInjuries,
    recentPayments: allPayments.slice(0, 10),
  }
}
