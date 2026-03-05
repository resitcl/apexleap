'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'
import { z } from 'zod'

const CLUB_LANDING_FIELDS = [
  'id','name','slug','sport_type','logo_url','primary_color','secondary_color',
  'city','country','address','phone','email','website','description',
  'landing_enabled','landing_headline','landing_description','landing_cta_label',
  'landing_show_team','landing_trial_enabled','landing_trial_description','landing_trial_contact',
  'landing_show_media','landing_show_results','landing_show_schedule','landing_show_stats',
  'analytics_ga4_id',
].join(', ')

const landingSchema = z.object({
  landing_enabled:           z.boolean().default(false),
  landing_headline:          z.string().max(120).optional().nullable(),
  landing_description:       z.string().max(1000).optional().nullable(),
  landing_cta_label:         z.string().max(40).optional().nullable(),
  landing_show_team:         z.boolean().default(true),
  landing_show_media:        z.boolean().default(false),
  landing_show_results:      z.boolean().default(false),
  landing_show_schedule:     z.boolean().default(false),
  landing_show_stats:        z.boolean().default(false),
  landing_trial_enabled:     z.boolean().default(false),
  landing_trial_description: z.string().max(500).optional().nullable(),
  landing_trial_contact:     z.string().max(200).optional().nullable(),
  analytics_ga4_id:          z.string().max(30).optional().nullable(),
})

export type LandingInput = z.infer<typeof landingSchema>

export async function getLandingSettings() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clubs')
    .select(CLUB_LANDING_FIELDS)
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
    .select(CLUB_LANDING_FIELDS)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (error || !data) return null
  const club = data as unknown as Record<string, unknown> & { landing_enabled: boolean }
  if (!club.landing_enabled) return null
  return club
}

export async function getPublicFeaturedMedia(clubId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('media_items')
    .select('id, title, type, category, url, thumbnail_url, description')
    .eq('club_id', clubId)
    .eq('landing_featured', true)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(6)
  return data ?? []
}

export async function getPublicRecentResults(clubId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('matches')
    .select('id, opponent, match_date, is_home, home_score, away_score, location, competition_id')
    .eq('club_id', clubId)
    .eq('status', 'finished')
    .not('home_score', 'is', null)
    .order('match_date', { ascending: false })
    .limit(5)
  return data ?? []
}

export async function getPublicUpcomingSchedule(clubId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('matches')
    .select('id, opponent, match_date, is_home, location, competition_id')
    .eq('club_id', clubId)
    .eq('status', 'scheduled')
    .gte('match_date', today)
    .order('match_date', { ascending: true })
    .limit(5)
  return data ?? []
}

export async function getPublicClubStats(clubId: string) {
  const supabase = createAdminClient()
  const [athletesRes, matchesRes] = await Promise.all([
    supabase.from('athletes').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('status', 'active'),
    supabase.from('matches').select('id, is_home, home_score, away_score').eq('club_id', clubId).eq('status', 'finished').not('home_score', 'is', null),
  ])
  const athletes = athletesRes.count ?? 0
  const matches  = matchesRes.data ?? []
  const played   = matches.length
  const wins     = matches.filter(m =>
    m.is_home ? (m.home_score ?? 0) > (m.away_score ?? 0) : (m.away_score ?? 0) > (m.home_score ?? 0)
  ).length
  return { athletes, played, wins }
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
