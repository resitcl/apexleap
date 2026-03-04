'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId } from '@/lib/actions/club-context'

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


export async function getSchedules(filters?: { venueId?: string }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  let q = supabase
    .from('schedules')
    .select('*, venues(id, name), attendance(id, checked_in_at, athletes(id, name))')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('start_time', { ascending: true })

  if (filters?.venueId) q = q.eq('venue_id', filters.venueId)

  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createSchedule(input: ScheduleInput) {
  const clubId = await getClubId()
  const parsed = scheduleSchema.parse(input)
  const supabase = createAdminClient()

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
  const supabase = createAdminClient()

  const safeUpdate = Object.fromEntries(Object.entries({ ...input }).filter(([, v]) => v !== undefined))
  const { data, error } = await supabase
    .from('schedules')
    .update(safeUpdate)
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
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('schedules')
    .update({ is_active: false })
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/calendar')
}
