'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId } from '@/lib/actions/club-context'

const eventSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional().nullable(),
  event_type: z.string().min(1, 'Selecciona un tipo de evento'),
  event_date: z.string().min(1, 'Fecha requerida'),
  end_date: z.string().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  is_visible_to_athletes: z.boolean().default(true),
})

export type EventInput = z.infer<typeof eventSchema>

export async function getEvents(params?: { from?: string; to?: string; type?: string }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  let query = supabase
    .from('club_events')
    .select('*')
    .eq('club_id', clubId)
    .order('event_date', { ascending: true })

  if (params?.from) query = query.gte('event_date', params.from)
  if (params?.to) query = query.lte('event_date', params.to)
  if (params?.type) query = query.eq('event_type', params.type)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getEventById(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('club_events')
    .select('*')
    .eq('id', id)
    .eq('club_id', clubId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function createEvent(input: EventInput) {
  const clubId = await getClubId()
  const parsed = eventSchema.parse(input)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('club_events')
    .insert({ ...parsed, club_id: clubId })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/calendar')
  return data
}

export async function updateEvent(id: string, input: EventInput) {
  const clubId = await getClubId()
  const parsed = eventSchema.parse(input)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('club_events')
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/calendar')
  return data
}

export async function deleteEvent(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('club_events')
    .delete()
    .eq('id', id)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/calendar')
}
