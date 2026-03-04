'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const clubSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
  sport_type: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal('')),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  timezone: z.string().default('America/Santiago'),
})

export type ClubInput = z.infer<typeof clubSchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function getClubSettings() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateClubSettings(input: Partial<ClubInput>) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const safeUpdate = Object.fromEntries(
    Object.entries({ ...input, updated_at: new Date().toISOString() })
      .filter(([, v]) => v !== undefined)
  )

  const { data, error } = await supabase
    .from('clubs')
    .update(safeUpdate)
    .eq('id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
  return data
}

export async function deleteClub(confirmName: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: club } = await supabase
    .from('clubs').select('name').eq('id', clubId).single()

  if (!club) throw new Error('Club no encontrado')
  if (club.name.trim().toLowerCase() !== confirmName.trim().toLowerCase()) {
    throw new Error('El nombre no coincide. Escribe el nombre exacto del club para confirmar.')
  }

  const { error } = await supabase.from('clubs').delete().eq('id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  return { deleted: true }
}
