'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'
import { z } from 'zod'

const landingSchema = z.object({
  landing_enabled:          z.boolean().default(false),
  landing_headline:         z.string().max(120).optional().nullable(),
  landing_description:      z.string().max(1000).optional().nullable(),
  landing_show_team:        z.boolean().default(true),
  landing_trial_enabled:    z.boolean().default(false),
  landing_trial_description:z.string().max(500).optional().nullable(),
  landing_trial_contact:    z.string().max(200).optional().nullable(),
  landing_cta_label:        z.string().max(40).optional().nullable(),
})

export type LandingInput = z.infer<typeof landingSchema>

export async function getLandingSettings() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('slug, name, sport_type, logo_url, primary_color, secondary_color, city, country, address, phone, email, website, description, landing_enabled, landing_headline, landing_description, landing_show_team, landing_trial_enabled, landing_trial_description, landing_trial_contact, landing_cta_label')
    .eq('id', clubId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateLandingSettings(input: LandingInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const clubId = await getClubId()
    const parsed = landingSchema.parse(input)
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('clubs')
      .update({ ...parsed, updated_at: new Date().toISOString() })
      .eq('id', clubId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/dashboard/settings/landing')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── Public (no auth) ────────────────────────────────────────────────────────
export async function getPublicClubLanding(slug: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, slug, sport_type, logo_url, primary_color, secondary_color, city, country, address, phone, email, website, description, landing_enabled, landing_headline, landing_description, landing_show_team, landing_trial_enabled, landing_trial_description, landing_trial_contact, landing_cta_label')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (error || !data) return null
  if (!data.landing_enabled) return null
  return data
}

export async function getPublicClubCoaches(clubId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('coaches')
    .select('id, name, specialty, bio, photo_url')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function submitTrialRequest(
  clubId: string,
  name: string,
  email: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!name.trim() || !email.includes('@')) {
    return { ok: false, error: 'Nombre y email válido requeridos' }
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('trial_requests')
    .insert({ club_id: clubId, name: name.trim(), email: email.trim().toLowerCase(), message: message.trim() })
  if (error) {
    // Table might not exist yet — fail gracefully
    console.error('[trial_requests] insert error:', error.message)
    return { ok: false, error: 'No se pudo enviar la solicitud. Contacta al club directamente.' }
  }
  return { ok: true }
}
