'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const venueSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  geofence_radius: z.coerce.number().int().min(10).max(5000).default(100),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
  is_home_venue: z.boolean().default(false),
  is_active: z.boolean().default(true),
  opening_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  closing_time: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
})

export type VenueInput = z.infer<typeof venueSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).limit(1).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getVenues() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('venues').select('*, schedules(id, is_active)').eq('club_id', clubId).order('is_home_venue', { ascending: false }).order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createVenue(input: VenueInput) {
  const clubId = await getClubId()
  const parsed = venueSchema.parse(input)
  const supabase = createAdminClient()
  const { name, address, city, lat, lng, geofence_radius, capacity, is_home_venue, is_active } = parsed
  const { data, error } = await supabase
    .from('venues').insert({ name, address, city, lat, lng, geofence_radius, capacity, is_home_venue, is_active, club_id: clubId }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
  return data
}

export async function updateVenue(id: string, input: Partial<VenueInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const safeUpdate = Object.fromEntries(
    Object.entries({ ...input }).filter(([, v]) => v !== undefined)
  )
  const { data, error } = await supabase
    .from('venues').update(safeUpdate)
    .eq('id', id).eq('club_id', clubId).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
  return data
}

export async function deleteVenue(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase.from('venues').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
}
