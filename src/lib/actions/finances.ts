'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const expenseSchema = z.object({
  concept: z.string().min(2),
  category: z.enum(['rent', 'salary', 'supplies', 'maintenance', 'marketing', 'other']).default('other'),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  paid_to: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

// ── EXPENSES ──────────────────────────────────────────────────

export async function getExpenses(params?: { month?: string; category?: string; page?: number }) {
  const clubId = await getClubId()
  const supabase = await createClient()

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
  const supabase = await createClient()

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

export async function createExpense(input: ExpenseInput) {
  const clubId = await getClubId()
  const { userId } = await auth()
  const parsed = expenseSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...parsed, club_id: clubId, created_by: userId })
    .select().single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
  return data
}

export async function deleteExpense(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
}

// ── COACHES ──────────────────────────────────────────────────

export async function getCoaches() {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coaches').select('*').eq('club_id', clubId).order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createCoach(input: CoachInput) {
  const clubId = await getClubId()
  const parsed = coachSchema.parse(input)
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coaches')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id).eq('club_id', clubId).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/finances')
  return data
}

export async function getMonthlyFinanceChart(months = 6) {
  const clubId = await getClubId()
  const supabase = await createClient()
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
