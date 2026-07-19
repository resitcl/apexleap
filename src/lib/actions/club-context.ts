import { auth, clerkClient } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLUB_COOKIE } from '@/lib/constants'
import { getSportVocab, type SportVocab } from '@/lib/sport-vocab'


export async function getClubId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const supabase = createAdminClient()

  try {
    const cookieStore = await cookies()
    const preferred = cookieStore.get(CLUB_COOKIE)?.value
    if (preferred) {
      const { data } = await supabase
        .from('user_clubs')
        .select('club_id')
        .eq('user_id', userId)
        .eq('club_id', preferred)
        .eq('is_active', true)
        .maybeSingle()
      if (data) return data.club_id as string
    }
  } catch {
    // cookies() not available in this context — fall through to DB
  }

  const { data, error } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

/** Rol en `user_clubs` (incluye admin que también entrena como jugador). */
export type UserRole = 'admin' | 'admin_athlete' | 'coach' | 'athlete'

/** Rol tal como está en `user_clubs.role` (incluye admin_athlete). */
export async function getClubMembershipRole(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const supabase = createAdminClient()
  const clubId = await getClubId()

  const { data } = await supabase
    .from('user_clubs')
    .select('role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .single()

  return (data?.role as string) ?? 'athlete'
}

export async function getUserRole(): Promise<UserRole> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const supabase = createAdminClient()
  const clubId = await getClubId()

  const { data } = await supabase
    .from('user_clubs')
    .select('role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .single()

  const raw = (data?.role as string) ?? 'athlete'
  if (raw === 'admin' || raw === 'admin_athlete' || raw === 'coach' || raw === 'athlete') {
    return raw
  }
  return 'athlete'
}

/** Rol de staff que puede usar el asistente IA del club (no atletas). */
export async function canAccessClubAiChat(): Promise<boolean> {
  const role = await getClubMembershipRole()
  return role === 'admin' || role === 'admin_athlete' || role === 'coach'
}

/** Redirige al portal del atleta si el rol en `user_clubs` es solo `athlete` (sin staff). */
export async function requireClubStaffPage() {
  const role = await getClubMembershipRole()
  if (role === 'athlete') redirect('/dashboard/athlete')
}

/**
 * Throw si el usuario actual no es staff del club (admin, admin_athlete o coach).
 * Pensado para server actions. No redirige; lanza para que el caller maneje el error.
 */
export async function assertClubStaff(): Promise<void> {
  const role = await getClubMembershipRole()
  if (role !== 'admin' && role !== 'admin_athlete' && role !== 'coach') {
    throw new Error('No tienes permisos para realizar esta acción')
  }
}

export function isClubStaffRole(role: string): boolean {
  return role === 'admin' || role === 'admin_athlete' || role === 'coach'
}

/**
 * Throw si el usuario actual no es administrador del club (admin o admin_athlete).
 * Más restrictivo que `assertClubStaff` — excluye a `coach`. Pensado para acciones
 * financieras, de configuración del club, de equipo y de gobernanza (reglas).
 */
export async function assertClubAdmin(): Promise<void> {
  const role = await getClubMembershipRole()
  if (role !== 'admin' && role !== 'admin_athlete') {
    throw new Error('Solo administradores pueden realizar esta acción')
  }
}

export function isClubAdminRole(role: string): boolean {
  return role === 'admin' || role === 'admin_athlete'
}

/** Capacidades que el admin del club puede delegar a los coaches. */
export type CoachCapability = 'finances' | 'rules' | 'club_config' | 'team'

export const COACH_CAPABILITIES: CoachCapability[] = ['finances', 'rules', 'club_config', 'team']

export type CoachPermissions = Record<CoachCapability, boolean>

/** Lee los permisos de coach del club actual (clubs.settings.coach_permissions). Default: todo en false. */
export async function getCoachPermissions(): Promise<CoachPermissions> {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data } = await supabase.from('clubs').select('settings').eq('id', clubId).single()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  const raw = (settings.coach_permissions ?? {}) as Record<string, unknown>
  const out = {} as CoachPermissions
  for (const cap of COACH_CAPABILITIES) out[cap] = raw[cap] === true
  return out
}

/**
 * Autoriza una acción que por defecto es solo-admin pero que el admin del club puede
 * delegar a coaches por capacidad. Admin/admin_athlete siempre pasan; coach pasa solo
 * si el club habilitó esa capacidad en `clubs.settings.coach_permissions`.
 */
export async function assertClubCapability(cap: CoachCapability): Promise<void> {
  const role = await getClubMembershipRole()
  if (role === 'admin' || role === 'admin_athlete') return
  if (role === 'coach') {
    const perms = await getCoachPermissions()
    if (perms[cap]) return
  }
  throw new Error('No tienes permisos para realizar esta acción')
}

/**
 * ID del perfil atleta vinculado al usuario actual en el club (por `user_id` o email).
 * Útil para resaltar al jugador en convocatorias. No lanza si no hay perfil.
 */
export async function resolveCurrentAthleteIdInClub(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const supabase = createAdminClient()
  const clubId = await getClubId()

  const { data: byUserId } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .is('archived_at', null)
    .limit(1)

  if (byUserId?.[0]?.id) return String(byUserId[0].id)

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)
  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  if (!email) return null

  const { data } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .ilike('email', email)
    .is('archived_at', null)
    .maybeSingle()

  return data?.id ? String(data.id) : null
}

export async function getClubSportType(): Promise<string | null> {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clubs')
    .select('sport_type')
    .eq('id', clubId)
    .single()
  return data?.sport_type ?? null
}

/**
 * Vocabulario del club activo según su deporte (p. ej. "Jugadores" vs
 * "Alumnos"). Úsalo en las páginas para que los labels visibles coincidan con
 * el menú lateral. Ante error devuelve el vocabulario por defecto.
 */
export async function getClubVocab(): Promise<SportVocab> {
  try {
    return getSportVocab(await getClubSportType())
  } catch {
    return getSportVocab(null)
  }
}

export async function getClubInfo(): Promise<{
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
  /** Email de contacto del club — se usa como reply-to en correos salientes */
  email: string | null
}> {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clubs')
    .select('id, name, slug, logo_url, primary_color, email')
    .eq('id', clubId)
    .single()
  return {
    id: clubId,
    name: data?.name ?? 'Club',
    slug: data?.slug ?? 'club',
    logo_url: (data?.logo_url as string | null) ?? null,
    primary_color: (data?.primary_color as string | null) ?? null,
    email: (data?.email as string | null) ?? null,
  }
}

export async function switchToClub(clubId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) throw new Error('No tienes acceso a este club')

  const cookieStore = await cookies()
  cookieStore.set(CLUB_COOKIE, clubId, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
}
