'use server'

/**
 * Enhanced Media Hub — Full multimedia platform
 * Supports: YouTube, Vimeo, direct uploads, calendar association
 */

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { getClubId } from '@/lib/actions/club-context'

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
  year?: number
  featured?: boolean
  visibility?: string
  seasonId?: string
  matchId?: string
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const page = params?.page ?? 1
  const limit = params?.limit ?? 24
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('media_items')
    .select('*', { count: 'exact' })
    .eq('club_id', clubId)
    .order('media_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params?.type)     query = query.eq('type', params.type)
  if (params?.category) query = query.eq('category', params.category)
  if (params?.search)   query = query.ilike('title', `%${params.search}%`)
  if (params?.featured) query = query.eq('is_featured', true)
  if (params?.visibility) query = query.eq('visibility', params.visibility)
  if (params?.seasonId) query = query.eq('season_id', params.seasonId)
  if (params?.matchId)  query = query.eq('match_id', params.matchId)
  
  // Calendar filtering by month
  if (params?.month) {
    const [year, month] = params.month.split('-').map(Number)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month + 1 > 12 ? 1 : month + 1).padStart(2, '0')}-01`
    query = query.gte('media_date', startDate).lt('media_date', endDate)
  } else if (params?.year) {
    query = query.gte('media_date', `${params.year}-01-01`).lt('media_date', `${params.year + 1}-01-01`)
  }

  const { data, error, count } = await query
  if (error) {
    if (error.code === '42P01') return { items: [], total: 0, tableExists: false }
    throw new Error(error.message)
  }
  return { items: data ?? [], total: count ?? 0, tableExists: true }
}

/**
 * Get media items grouped by month for calendar view
 */
export async function getMediaByMonth(year?: number) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const targetYear = year ?? new Date().getFullYear()

  const { data, error } = await supabase
    .from('media_items')
    .select('id, media_date, type, category')
    .eq('club_id', clubId)
    .gte('media_date', `${targetYear}-01-01`)
    .lt('media_date', `${targetYear + 1}-01-01`)
    .not('media_date', 'is', null)

  if (error) return {}

  const grouped: Record<string, { videos: number; photos: number; total: number }> = {}
  for (const item of data ?? []) {
    if (!item.media_date) continue
    const month = (item.media_date as string).slice(0, 7) // YYYY-MM
    if (!grouped[month]) grouped[month] = { videos: 0, photos: 0, total: 0 }
    grouped[month].total++
    if (item.type === 'video') grouped[month].videos++
    if (item.type === 'photo') grouped[month].photos++
  }
  return grouped
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
  const clubId = await getClubId()
  const { userId } = await auth()
  const parsed = mediaSchema.parse(input)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('media_items')
    .insert({ ...parsed, club_id: clubId, created_by: userId ?? null })
    .select().single()
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/media')
  return data
}

export async function deleteMediaItem(id: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('media_items').delete().eq('id', id).eq('club_id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/media')
}

export async function toggleMediaLandingFeatured(id: string, featured: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
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
  const { data, error } = await supabase
    .from('media_items').select('type, category, is_featured, visibility, views_count').eq('club_id', clubId)
  if (error) return null
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

/**
 * Get available years with content (for year selector)
 */
export async function getMediaYears(): Promise<number[]> {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('media_items')
    .select('media_date')
    .eq('club_id', clubId)
    .not('media_date', 'is', null)
  
  if (error || !data) return [new Date().getFullYear()]
  
  const years = new Set<number>()
  for (const item of data) {
    if (item.media_date) {
      years.add(new Date(item.media_date as string).getFullYear())
    }
  }
  
  // Always include current year
  years.add(new Date().getFullYear())
  
  return Array.from(years).sort((a, b) => b - a)
}
