'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const scheduleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  day_of_week: z.array(z.number().int().min(0).max(6)).min(1, 'Selecciona al menos un día'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  start_date: z.string().min(1),
  end_date: z.string().optional().nullable(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  venue_id: z.string().uuid().optional().nullable(),
  access_rule: z.enum(['open', 'subscription', 'profile']).default('subscription'),
  is_active: z.boolean().default(true),
})

export type ScheduleInput = z.infer<typeof scheduleSchema>

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

export async function getSchedules() {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedules')
    .select('*, venues(id, name)')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('start_time', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createSchedule(input: ScheduleInput) {
  const clubId = await getClubId()
  const parsed = scheduleSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      ...parsed,
      club_id: clubId,
      end_date: parsed.end_date || null,
      capacity: parsed.capacity || null,
      venue_id: parsed.venue_id || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/calendar')
  return data
}

export async function updateSchedule(id: string, input: Partial<ScheduleInput>) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('schedules')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/calendar')
  return data
}

export async function deleteSchedule(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { error } = await supabase
    .from('schedules')
    .update({ is_active: false })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/calendar')
}
