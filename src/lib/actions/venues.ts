'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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
})

export type VenueInput = z.infer<typeof venueSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getVenues() {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('venues').select('*').eq('club_id', clubId).order('is_home_venue', { ascending: false }).order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createVenue(input: VenueInput) {
  const clubId = await getClubId()
  const parsed = venueSchema.parse(input)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('venues').insert({ ...parsed, club_id: clubId }).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
  return data
}

export async function updateVenue(id: string, input: Partial<VenueInput>) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('venues').update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id).eq('club_id', clubId).select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
  return data
}

export async function deleteVenue(id: string) {
  const clubId = await getClubId()
  const supabase = await createClient()
  const { error } = await supabase.from('venues').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/venues')
}
