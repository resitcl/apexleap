'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId } from '@/lib/actions/club-context'

const expenseSchema = z.object({
  concept: z.string().min(2),
  category: z.enum(['rent', 'salary', 'supplies', 'maintenance', 'marketing', 'other']).default('other'),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  paid_to: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
})

const coachSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  salary_type: z.enum(['fixed', 'per_session', 'percentage']).default('fixed'),
  salary_amount: z.coerce.number().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
export type CoachInput = z.infer<typeof coachSchema>


// ── EXPENSES ──────────────────────────────────────────────────

export async function getExpenses(params?: { month?: string; category?: string; page?: number }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const page = params?.page ?? 1
  const limit = 25
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('club_id', clubId)
    .order('date', { ascending: false })
    .range(from, to)

  if (params?.category) query = query.eq('category', params.category)
  if (params?.month) {
    const [year, month] = params.month.split('-')
    const start = `${year}-${month}-01`
    const end = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]
    query = query.gte('date', start).lte('date', end)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { expenses: data ?? [], total: count ?? 0 }
}

export async function getFinanceSummary(month?: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const now = new Date()
  const y = month ? month.split('-')[0] : String(now.getFullYear())
  const m = month ? month.split('-')[1] : String(now.getMonth() + 1).padStart(2, '0')
  const start = `${y}-${m}-01`
  const end = new Date(Number(y), Number(m), 0).toISOString().split('T')[0]

  const [expensesRes, paymentsRes] = await Promise.all([
    supabase.from('expenses').select('amount, category').eq('club_id', clubId).gte('date', start).lte('date', end),
    supabase.from('payments').select('amount, status').eq('club_id', clubId).gte('due_date', start).lte('due_date', end),
  ])

  const totalExpenses = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const totalIncome = (paymentsRes.data ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount), 0)
  const pendingIncome = (paymentsRes.data ?? [])
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((s, p) => s + Number(p.amount), 0)

  const byCategory: Record<string, number> = {}
  for (const e of expensesRes.data ?? []) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount)
  }

  return {
    totalIncome,
    totalExpenses,
    pendingIncome,
    netBalance: totalIncome - totalExpenses,
    byCategory,
    month: `${y}-${m}`,
  }
}

/** Ingresos aún no cobrados que se esperan en el mes (cuotas con vencimiento en el mes + próxima facturación de suscripción si no hay fila en el mes). */
export async function getExpectedMonthIncome(monthIso: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const parts = monthIso.split('-')
  const y = Number(parts[0])
  const mo = Number(parts[1])
  if (!y || !mo) {
    return { month: monthIso, fromScheduled: 0, fromSubscriptions: 0, total: 0 }
  }
  const start = `${y}-${String(mo).padStart(2, '0')}-01`
  const end = new Date(y, mo, 0).toISOString().split('T')[0]

  const { data: pendingRows } = await supabase
    .from('payments')
    .select('amount, athlete_id')
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])
    .gte('due_date', start)
    .lte('due_date', end)

  const fromScheduled = (pendingRows ?? []).reduce((s, p) => s + Number(p.amount), 0)

  const { data: dueInMonth } = await supabase
    .from('payments')
    .select('athlete_id')
    .eq('club_id', clubId)
    .gte('due_date', start)
    .lte('due_date', end)

  const athletesWithAnyDueInMonth = new Set(
    (dueInMonth ?? []).map((p) => p.athlete_id).filter(Boolean) as string[],
  )

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('athlete_id, next_billing_date, plans(price), athletes(archived_at)')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .gte('next_billing_date', start)
    .lte('next_billing_date', end)

  let fromSubscriptions = 0
  for (const s of subs ?? []) {
    const rawAth = s.athletes as { archived_at: string | null } | { archived_at: string | null }[] | null
    const ath = Array.isArray(rawAth) ? rawAth[0] : rawAth
    if (ath?.archived_at) continue
    const aid = s.athlete_id as string
    if (!aid) continue
    if (athletesWithAnyDueInMonth.has(aid)) continue
    const plan = s.plans as { price: number } | null
    fromSubscriptions += Number(plan?.price ?? 0)
  }

  return {
    month: monthIso,
    fromScheduled,
    fromSubscriptions,
    total: fromScheduled + fromSubscriptions,
  }
}

export async function createExpense(input: ExpenseInput) {
  const clubId = await getClubId()
  const { userId } = await auth()
  const parsed = expenseSchema.parse(input)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...parsed, club_id: clubId, created_by: userId })
    .select().single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
  return data
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  const { error } = await supabase.from('expenses')
    .update(safeUpdate)
    .eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
}

export async function deleteExpense(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
}

// ── COACHES ──────────────────────────────────────────────────

export async function getCoaches() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('coaches').select('*').eq('club_id', clubId).order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCoach(input: CoachInput) {
  const clubId = await getClubId()
  const parsed = coachSchema.parse(input)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('coaches')
    .insert({ ...parsed, club_id: clubId, email: parsed.email || null })
    .select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
  return data
}

export async function updateCoach(id: string, input: Partial<CoachInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const safeUpdateCoach = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  const { data, error } = await supabase
    .from('coaches')
    .update(safeUpdateCoach)
    .eq('id', id).eq('club_id', clubId).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
  return data
}

export async function getMonthlyFinanceChart(months = 6) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const now = new Date()

  const result: { label: string; income: number; expenses: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString().split('T')[0]
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    const label = d.toLocaleDateString('es-CL', { month: 'short' })

    const [incomeRes, expensesRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount')
        .eq('club_id', clubId)
        .eq('status', 'paid')
        .gte('paid_at', start)
        .lte('paid_at', end + 'T23:59:59'),
      supabase
        .from('expenses')
        .select('amount')
        .eq('club_id', clubId)
        .gte('date', start)
        .lte('date', end),
    ])

    const income   = (incomeRes.data   ?? []).reduce((s, r) => s + Number(r.amount), 0)
    const expenses = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0)
    result.push({ label, income, expenses })
  }

  return result
}
