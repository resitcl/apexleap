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

    // All payments for MRR
    supabase
      .from('payments')
      .select('status, amount')
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
    pendingAmount,
    overdueAmount,
    todayCheckIns,
    semaforoCount,
  }
}
