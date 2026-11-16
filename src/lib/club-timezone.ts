import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'
import { DEFAULT_TIME_ZONE } from '@/lib/billing-utils'

/**
 * Zona horaria del club de la sesión actual (`clubs.timezone`), cacheada por request.
 *
 * Se usa para calcular "hoy" y "este mes" en hora del club y no en UTC (ver `nowInTimeZone`).
 * Nunca lanza: ante cualquier problema devuelve la zona por defecto. Solo para código con sesión
 * (páginas y server actions); el cron lee la columna directamente porque recorre todos los clubes.
 */
export const getClubTimeZone = cache(async function getClubTimeZone(): Promise<string> {
  try {
    const clubId = await getClubId()
    const { data } = await createAdminClient()
      .from('clubs')
      .select('timezone')
      .eq('id', clubId)
      .maybeSingle()
    const tz = (data?.timezone as string | null | undefined)?.trim()
    return tz || DEFAULT_TIME_ZONE
  } catch {
    return DEFAULT_TIME_ZONE
  }
})
