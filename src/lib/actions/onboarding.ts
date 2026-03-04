'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const createClubSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  sport_type: z.string().optional(),
  country: z.string().default('Chile'),
  city: z.string().optional(),
  timezone: z.string().default('America/Santiago'),
})

export type CreateClubInput = z.infer<typeof createClubSchema>

export async function checkUserHasClub() {
  const { userId } = await auth()
  if (!userId) return false

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()

  return !!data
}

export async function createClubForUser(input: CreateClubInput) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const parsed = createClubSchema.parse(input)
  const supabase = createAdminClient()

  // Create the club
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({
      name: parsed.name,
      slug: parsed.slug,
      sport_type: parsed.sport_type ?? null,
      country: parsed.country,
      city: parsed.city ?? null,
      timezone: parsed.timezone,
      is_active: true,
    })
    .select()
    .single()

  if (clubError) {
    if (clubError.code === '23505') throw new Error('Ya existe un club con ese identificador URL. Elige otro.')
    throw new Error(clubError.message)
  }

  // Link user to club as admin
  const { error: linkError } = await supabase
    .from('user_clubs')
    .insert({
      user_id: userId,
      club_id: club.id,
      role: 'admin',
      is_active: true,
    })

  if (linkError) throw new Error(linkError.message)

  // Create default rules for the club
  const defaultRules = [
    {
      club_id: club.id,
      name: 'Bloqueo por mora',
      description: 'Bloquea el acceso a alumnos con pagos vencidos de más de 3 días',
      type: 'financial',
      trigger_condition: { overdue_days: 3 },
      action: 'block',
      severity: 'high',
      is_active: true,
    },
    {
      club_id: club.id,
      name: 'Advertencia de mora',
      description: 'Advierte cuando un pago está por vencer en 3 días',
      type: 'financial',
      trigger_condition: { due_in_days: 3 },
      action: 'warn',
      severity: 'medium',
      is_active: true,
    },
    {
      club_id: club.id,
      name: 'Bloqueo por lesión',
      description: 'Bloquea la participación de atletas con lesión activa',
      type: 'discipline',
      trigger_condition: { health_status: 'injured' },
      action: 'block',
      severity: 'high',
      is_active: true,
    },
    {
      club_id: club.id,
      name: 'Alerta baja asistencia',
      description: 'Notifica cuando un alumno tiene menos del 50% de asistencia en 30 días',
      type: 'attendance',
      trigger_condition: { attendance_rate_below: 50, period_days: 30 },
      action: 'notify',
      severity: 'low',
      is_active: true,
    },
  ]

  await supabase.from('rules').insert(defaultRules)

  redirect('/dashboard')
}

export async function joinClubBySlug(slug: string, role: 'admin' | 'coach' | 'athlete' = 'admin') {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const supabase = createAdminClient()

  // Find club by slug
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('id, name, is_active')
    .eq('slug', slug.trim().toLowerCase())
    .single()

  if (clubErr || !club) throw new Error('No se encontró un club con ese identificador. Verifica el slug.')
  if (!club.is_active) throw new Error('Este club está desactivado. Contacta al administrador.')

  // Check not already linked
  const { data: existing } = await supabase
    .from('user_clubs')
    .select('id, is_active')
    .eq('user_id', userId)
    .eq('club_id', club.id)
    .single()

  if (existing) {
    if (existing.is_active) throw new Error(`Ya tienes acceso al club "${club.name}".`)
    // Reactivate
    await supabase.from('user_clubs').update({ is_active: true, role }).eq('id', existing.id)
    redirect('/dashboard')
  }

  const { error: linkErr } = await supabase
    .from('user_clubs')
    .insert({ user_id: userId, club_id: club.id, role, is_active: true })

  if (linkErr) throw new Error(linkErr.message)

  redirect('/dashboard')
}
