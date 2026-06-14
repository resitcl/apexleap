'use server'

/**
 * Enhanced Media Hub — Full multimedia platform
 * Supports: YouTube, Vimeo, direct uploads, calendar association
 */

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId, assertClubStaff } from '@/lib/actions/club-context'
import { addOneDayIso, weekOfMonthFromDate, weekOfMonthRange } from '@/lib/media-archive'

const mediaSchema = z.object({
  title:         z.string().min(2),
  type:          z.enum(['video', 'photo', 'document']).default('video'),
  category:      z.enum(['match', 'highlight', 'training', 'photo', 'technique', 'analysis', 'event', 'promo', 'other']).default('other'),
  url:           z.string().url('URL inválida'),
  thumbnail_url: z.string().url().optional().nullable(),
  description:   z.string().optional().nullable(),
  is_public:     z.boolean().default(false),
  // Enhanced fields
  source_type:   z.enum(['youtube', 'vimeo', 'upload', 'external']).default('youtube'),
  media_date:    z.string().optional().nullable(), // ISO date
  duration:      z.number().optional().nullable(),
  season_id:     z.string().uuid().optional().nullable(),
  match_id:      z.string().uuid().optional().nullable(),
  event_id:      z.string().uuid().optional().nullable(),
  tags:          z.array(z.string()).optional().default([]),
  is_featured:   z.boolean().default(false),
  visibility:    z.enum(['public', 'members', 'coaches', 'private']).default('public'),
})

export type MediaInput = z.infer<typeof mediaSchema>


export async function getMediaItems(params?: {
  type?: string
  category?: string
  search?: string
  page?: number
  limit?: number
  month?: string // YYYY-MM format for calendar filtering
  /** 1–5: segmento del mes (ej. semana 1 = días 1–7) */
  weekOfMonth?: number
  year?: number
  featured?: boolean
  visibility?: string
  /** Varias visibilidades (p. ej. público + miembros para alumnos) */
  visibilityIn?: string[]
  seasonId?: string
  matchId?: string
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const page = params?.page ?? 1
  const defaultLimit = params?.limit ?? 24
  const limit = defaultLimit
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('media_items')
    .select('*', { count: 'exact' })
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.type)     query = query.eq('type', params.type)
  if (params?.category) query = query.eq('category', params.category)
  if (params?.search) {
    const raw = params.search.trim().slice(0, 200).replace(/[%_]/g, ' ')
    if (raw.length > 0) {
      const pattern = `%${raw}%`
      query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`)
    }
  }
  if (params?.featured) query = query.eq('is_featured', true)
  if (params?.visibilityIn?.length) {
    query = query.in('visibility', params.visibilityIn)
  } else if (params?.visibility) {
    query = query.eq('visibility', params.visibility)
  }
  if (params?.seasonId) query = query.eq('season_id', params.seasonId)
  if (params?.matchId)  query = query.eq('match_id', params.matchId)

  if (params?.month && params?.weekOfMonth && params.weekOfMonth >= 1 && params.weekOfMonth <= 5) {
    const r = weekOfMonthRange(params.month, params.weekOfMonth)
    if (r) {
      const endExclusive = addOneDayIso(r.end)
      const startTs = `${r.start}T00:00:00.000Z`
      const endTs = `${endExclusive}T00:00:00.000Z`
      query = query.or(
        `and(media_date.gte.${r.start},media_date.lte.${r.end}),and(media_date.is.null,created_at.gte.${startTs},created_at.lt.${endTs})`,
      )
    }
  } else if (params?.month) {
    const [y, mo] = params.month.split('-').map(Number)
    if (y && mo >= 1 && mo <= 12) {
      const startDate = `${y}-${String(mo).padStart(2, '0')}-01`
      const nextMonthStart = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`
      const startTs = `${startDate}T00:00:00.000Z`
      const endTs = `${nextMonthStart}T00:00:00.000Z`
      query = query.or(
        `and(media_date.gte.${startDate},media_date.lt.${nextMonthStart}),and(media_date.is.null,created_at.gte.${startTs},created_at.lt.${endTs})`,
      )
    }
  } else if (params?.year) {
    const y = params.year
    const start = `${y}-01-01`
    const end = `${y + 1}-01-01`
    // Incluye ítems legacy sin media_date (solo created_at en ese año).
    query = query.or(
      `and(media_date.gte.${start},media_date.lt.${end}),and(media_date.is.null,created_at.gte.${start},created_at.lt.${end})`,
    )
  }

  const { data, error, count } = await query
  if (error) {
    if (error.code === '42P01') return { items: [], total: 0, tableExists: false }

    // If the complex OR filter caused the error, retry with a simple query (no date filter).
    console.error('[getMediaItems] query error, retrying without date filter:', error.code, error.message)
    const fallback = supabase
      .from('media_items')
      .select('*', { count: 'exact' })
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (params?.type) fallback.eq('type', params.type)
    if (params?.category) fallback.eq('category', params.category)
    const { data: fbData, error: fbErr, count: fbCount } = await fallback
    if (fbErr) {
      console.error('[getMediaItems] fallback also failed:', fbErr.code, fbErr.message)
      throw new Error(fbErr.message)
    }
    return { items: fbData ?? [], total: fbCount ?? 0, tableExists: true }
  }
  return { items: data ?? [], total: count ?? 0, tableExists: true }
}

/**
 * Get media items grouped by month for calendar view
 */
export async function getMediaByMonth(year?: number, options?: { visibilityIn?: string[] }) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const targetYear = year ?? new Date().getFullYear()

  let q = supabase
    .from('media_items')
    .select('id, media_date, type, category')
    .eq('club_id', clubId)
    .gte('media_date', `${targetYear}-01-01`)
    .lt('media_date', `${targetYear + 1}-01-01`)
    .not('media_date', 'is', null)
  if (options?.visibilityIn?.length) {
    q = q.in('visibility', options.visibilityIn)
  }
  const { data, error } = await q

  if (error) return {}

  let qNull = supabase
    .from('media_items')
    .select('id, media_date, type, category, created_at')
    .eq('club_id', clubId)
    .is('media_date', null)
    .gte('created_at', `${targetYear}-01-01T00:00:00.000Z`)
    .lt('created_at', `${targetYear + 1}-01-01T00:00:00.000Z`)
  if (options?.visibilityIn?.length) {
    qNull = qNull.in('visibility', options.visibilityIn)
  }
  const { data: dataNull } = await qNull

  const grouped: Record<string, { videos: number; photos: number; total: number }> = {}
  for (const item of data ?? []) {
    if (!item.media_date) continue
    const month = (item.media_date as string).slice(0, 7) // YYYY-MM
    if (!grouped[month]) grouped[month] = { videos: 0, photos: 0, total: 0 }
    grouped[month].total++
    if (item.type === 'video') grouped[month].videos++
    if (item.type === 'photo') grouped[month].photos++
  }
  for (const item of dataNull ?? []) {
    const ca = item.created_at as string | null
    if (!ca || ca.length < 7) continue
    const month = ca.slice(0, 7)
    if (!grouped[month]) grouped[month] = { videos: 0, photos: 0, total: 0 }
    grouped[month].total++
    if (item.type === 'video') grouped[month].videos++
    if (item.type === 'photo') grouped[month].photos++
  }
  return grouped
}

/** Años con al menos un ítem (media_date o created_at si no hay fecha de archivo) */
export async function getMediaYears(): Promise<number[]> {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('media_items')
    .select('media_date, created_at')
    .eq('club_id', clubId)

  const current = new Date().getFullYear()
  if (error || !data?.length) return [current]

  const years = new Set<number>()
  for (const row of data) {
    const md = row.media_date as string | null
    if (md && md.length >= 4) {
      years.add(parseInt(md.slice(0, 4), 10))
      continue
    }
    const ca = row.created_at as string | null
    if (ca && ca.length >= 4) years.add(parseInt(ca.slice(0, 4), 10))
  }
  years.add(current)
  return [...years].sort((a, b) => b - a)
}

/** Conteos por semana del mes (1–5) para la barra de archivo */
export async function getMediaWeekBuckets(
  monthKey: string,
  options?: { visibilityIn?: string[] }
): Promise<number[]> {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return [0, 0, 0, 0, 0]
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const endExclusive = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  let q = supabase
    .from('media_items')
    .select('media_date')
    .eq('club_id', clubId)
    .gte('media_date', start)
    .lt('media_date', endExclusive)
    .not('media_date', 'is', null)
  if (options?.visibilityIn?.length) {
    q = q.in('visibility', options.visibilityIn)
  }
  const { data, error } = await q

  if (error) return [0, 0, 0, 0, 0]
  const counts = [0, 0, 0, 0, 0]
  for (const row of data ?? []) {
    const md = row.media_date as string | null
    if (!md) continue
    const w = weekOfMonthFromDate(md) - 1
    if (w >= 0 && w < 5) counts[w]++
  }

  let qNull = supabase
    .from('media_items')
    .select('media_date, created_at')
    .eq('club_id', clubId)
    .is('media_date', null)
    .gte('created_at', `${start}T00:00:00.000Z`)
    .lt('created_at', `${endExclusive}T00:00:00.000Z`)
  if (options?.visibilityIn?.length) {
    qNull = qNull.in('visibility', options.visibilityIn)
  }
  const { data: rowsNull } = await qNull
  for (const row of rowsNull ?? []) {
    const ca = row.created_at as string | null
    if (!ca || ca.length < 10) continue
    const day = ca.slice(0, 10)
    const w = weekOfMonthFromDate(day) - 1
    if (w >= 0 && w < 5) counts[w]++
  }
  return counts
}

/**
 * Get featured media for athlete dashboard/landing
 */
export async function getFeaturedMedia(limit = 6) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_featured', true)
    .in('visibility', ['public', 'members'])
    .order('media_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data ?? []
}

/**
 * Get recent media for a specific category (e.g., last matches, recent training)
 */
export async function getRecentMediaByCategory(category: string, limit = 8) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('club_id', clubId)
    .eq('category', category)
    .in('visibility', ['public', 'members'])
    .order('media_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data ?? []
}

export async function createMediaItem(input: MediaInput) {
  await assertClubStaff()
  const clubId = await getClubId()
  const { userId } = await auth()
  const parsed = mediaSchema.parse(input)
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const fullPayload = { ...parsed, club_id: clubId, created_by: userId ?? null, created_at: now }
  const { data, error } = await supabase
    .from('media_items')
    .insert(fullPayload)
    .select()
    .single()

  if (!error) {
    revalidatePath('/dashboard/media')
    return data
  }

  console.error('[createMediaItem] full insert failed:', error.code, error.message)

  // Fallback: catch ANY insert error (not just missing-column) so we always try legacy.
  const legacyBase = {
    title: parsed.title,
    type: parsed.type,
    category: parsed.category,
    url: parsed.url,
    thumbnail_url: parsed.thumbnail_url ?? null,
    description: parsed.description ?? null,
    is_public: parsed.is_public,
    club_id: clubId,
    created_by: userId ?? null,
    created_at: now,
  }
  /** Con fecha el ítem entra en el archivo por año; sin columna en BD se omite abajo. */
  const legacyPayload = {
    ...legacyBase,
    ...(parsed.media_date ? { media_date: parsed.media_date } : {}),
  }

  async function insertLegacy(payload: Record<string, unknown>) {
    return supabase.from('media_items').insert(payload).select().single()
  }

  // Progressive fallback: try with more columns → fewer columns until one works.
  const attempts: { label: string; payload: Record<string, unknown> }[] = [
    { label: 'legacy+date', payload: legacyPayload },
    { label: 'legacy-base', payload: legacyBase },
  ]

  const sanitizedType = parsed.type === 'document' ? 'video' : parsed.type
  const sanitizedCategory = (['match', 'highlight', 'training', 'photo', 'other'] as const).includes(
    parsed.category as 'match' | 'highlight' | 'training' | 'photo' | 'other'
  )
    ? parsed.category
    : 'other'

  if (sanitizedType !== parsed.type || sanitizedCategory !== parsed.category) {
    attempts.push(
      { label: 'sanitized+date', payload: { ...legacyPayload, type: sanitizedType, category: sanitizedCategory } },
      { label: 'sanitized-base', payload: { ...legacyBase, type: sanitizedType, category: sanitizedCategory } },
    )
  }

  // Also try without created_at in case column doesn't exist or has DB default
  for (const a of [...attempts]) {
    const { created_at: _ca, ...withoutCa } = a.payload
    if (_ca) attempts.push({ label: `${a.label}/noCa`, payload: withoutCa })
  }

  for (const { label, payload } of attempts) {
    const { data: d, error: e } = await supabase.from('media_items').insert(payload).select().single()
    if (!e) {
      console.log('[createMediaItem] success via:', label)
      revalidatePath('/dashboard/media')
      return d
    }
    console.error(`[createMediaItem] ${label} failed:`, e.code, e.message)
  }

  throw new Error('No se pudo insertar el contenido en ninguna variante del esquema.')
}

export async function deleteMediaItem(id: string) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('media_items').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/media')
}

export async function toggleMediaLandingFeatured(id: string, featured: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertClubStaff()
    const clubId = await getClubId()
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('media_items')
      .update({ landing_featured: featured })
      .eq('id', id)
      .eq('club_id', clubId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/dashboard/media')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

export async function getMediaStats() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  // Try enhanced columns; fall back to basic ones if they don't exist.
  let { data, error } = await supabase
    .from('media_items').select('type, category, is_featured, visibility, views_count').eq('club_id', clubId)
  if (error) {
    const res2 = await supabase.from('media_items').select('type, category').eq('club_id', clubId)
    if (res2.error) return null
    data = res2.data
  }
  const items = data ?? []
  return {
    total:      items.length,
    videos:     items.filter((i) => i.type === 'video').length,
    photos:     items.filter((i) => i.type === 'photo').length,
    documents:  items.filter((i) => i.type === 'document').length,
    matches:    items.filter((i) => i.category === 'match').length,
    highlights: items.filter((i) => i.category === 'highlight').length,
    training:   items.filter((i) => i.category === 'training').length,
    technique:  items.filter((i) => i.category === 'technique').length,
    featured:   items.filter((i) => i.is_featured).length,
    public:     items.filter((i) => i.visibility === 'public').length,
    totalViews: items.reduce((acc, i) => acc + ((i.views_count as number) ?? 0), 0),
  }
}

/**
 * Update media item
 */
export async function updateMediaItem(id: string, input: Partial<MediaInput>) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('media_items')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/media')
  revalidatePath('/dashboard/athlete/content')
  return data
}

/**
 * Toggle featured status
 */
export async function toggleMediaFeatured(id: string): Promise<{ ok: true; featured: boolean } | { ok: false; error: string }> {
  try {
    await assertClubStaff()
    const clubId = await getClubId()
    const supabase = createAdminClient()
    
    // Get current state
    const { data: current } = await supabase
      .from('media_items')
      .select('is_featured')
      .eq('id', id)
      .eq('club_id', clubId)
      .single()
    
    const newFeatured = !(current?.is_featured ?? false)
    
    const { error } = await supabase
      .from('media_items')
      .update({ is_featured: newFeatured })
      .eq('id', id)
      .eq('club_id', clubId)
    
    if (error) return { ok: false, error: error.message }
    revalidatePath('/dashboard/media')
    return { ok: true, featured: newFeatured }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

/**
 * Increment view count (for analytics)
 */
export async function incrementMediaView(id: string) {
  const supabase = createAdminClient()
  try {
    // Try RPC first
    const { error } = await supabase.rpc('increment_media_views', { media_id: id })
    if (error) {
      // Fallback: manual increment
      const { data } = await supabase.from('media_items').select('views_count').eq('id', id).single()
      const currentViews = (data?.views_count as number) ?? 0
      await supabase.from('media_items').update({ views_count: currentViews + 1 }).eq('id', id)
    }
  } catch {
    // Silent fail for view tracking
  }
}
