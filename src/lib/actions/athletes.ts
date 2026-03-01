'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const athleteSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  document_number: z.string().optional(),
  birth_date: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  notes: z.string().optional(),
  health_status: z.enum(['healthy', 'injured', 'observation']).default('healthy'),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  technical_meta: z.record(z.unknown()).default({}),
  performance_meta: z.record(z.unknown()).default({}),
})

export type AthleteInput = z.infer<typeof athleteSchema>

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

export async function getAthletes(params?: {
  search?: string
  status?: string
  healthStatus?: string
  planId?: string
  subscriptionStatus?: string
  page?: number
  limit?: number
}) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const page = params?.page ?? 1
  const limit = params?.limit ?? 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('athletes')
    .select('*, subscriptions(id, status, plan_id, plans(name)), payments(id, status, paid_at), attendance(id, checked_in_at)', { count: 'exact' })
    .eq('club_id', clubId)
    .order('name', { ascending: true })
    .range(from, to)

  if (params?.search) {
    query = query.or(
      `name.ilike.%${params.search}%,email.ilike.%${params.search}%,document_number.ilike.%${params.search}%,phone.ilike.%${params.search}%`
    )
  }
  if (params?.status) {
    query = query.eq('status', params.status)
  }
  if (params?.healthStatus) {
    query = query.eq('health_status', params.healthStatus)
  }
  if (params?.planId || params?.subscriptionStatus) {
    let subQ = supabase.from('subscriptions').select('athlete_id').eq('club_id', clubId)
    if (params.planId)            subQ = subQ.eq('plan_id', params.planId)
    if (params.subscriptionStatus) subQ = subQ.eq('status', params.subscriptionStatus)
    const { data: subData } = await subQ
    const ids = (subData ?? []).map((s) => s.athlete_id).filter(Boolean)
    if (ids.length === 0) return { athletes: [], total: 0 }
    query = query.in('id', ids)
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)
  return { athletes: data ?? [], total: count ?? 0 }
}

export async function getAthleteById(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('athletes')
    .select(`
      *,
      subscriptions(*, plans(*)),
      payments(id, concept, amount, status, due_date, paid_at),
      attendance(id, checked_in_at, is_valid),
      injuries(id, diagnosis, severity, start_date, estimated_recovery, actual_recovery),
      documents(id, name, category, status, expiry_date)
    `)
    .eq('id', id)
    .eq('club_id', clubId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createAthlete(input: AthleteInput) {
  const clubId = await getClubId()
  const parsed = athleteSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('athletes')
    .insert({
      ...parsed,
      club_id: clubId,
      email: parsed.email || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/athletes')
  return data
}

export async function updateAthlete(id: string, input: Partial<AthleteInput>) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('athletes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/athletes')
  revalidatePath(`/dashboard/athletes/${id}`)
  return data
}

export async function deleteAthlete(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { error } = await supabase
    .from('athletes')
    .delete()
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/athletes')
}
