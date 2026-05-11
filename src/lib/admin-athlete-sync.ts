import { createAdminClient } from '@/lib/supabase/admin'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Asegura que exista un registro en `athletes` para un usuario con rol
 * admin_athlete. Es idempotente: si ya existe (por email o user_id),
 * no crea nada. Devuelve el id del registro de atleta (existente o nuevo).
 *
 * Se usa cuando:
 *  - Se acepta una invitación con rol `admin_athlete` (webhook de Clerk).
 *  - Se cambia el rol de un miembro existente a `admin_athlete`.
 */
export async function ensureAthleteRecordForUser(params: {
  clubId: string
  userId: string
  email: string | null
  name: string | null
}): Promise<string | null> {
  const { clubId, userId, email, name } = params

  if (!clubId || !userId) return null

  const supabase = createAdminClient()

  const { data: byUser } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle()
  if (byUser) return byUser.id as string

  if (email) {
    const normalized = email.trim().toLowerCase()
    const { data: byEmailRows } = await supabase
      .from('athletes')
      .select('id, user_id')
      .eq('club_id', clubId)
      .ilike('email', normalized)
      .limit(1)
    const byEmail = byEmailRows?.[0]
    if (byEmail) {
      const prevUid = byEmail.user_id as string | null
      if (!prevUid || prevUid === userId) {
        await supabase.from('athletes').update({ user_id: userId, updated_at: new Date().toISOString() }).eq('id', byEmail.id as string)
      }
      return byEmail.id as string
    }
  }

  const finalName = (name && name.trim()) || email || 'Atleta'

  const { data: created, error } = await supabase
    .from('athletes')
    .insert({
      club_id: clubId,
      user_id: userId,
      name: finalName,
      email: email ?? null,
      status: 'active',
      health_status: 'healthy',
      enrollment_status: 'approved',
      technical_meta: {},
      performance_meta: {},
    })
    .select('id')
    .single()

  if (error) {
    console.error('[ensureAthleteRecordForUser] insert error:', error)
    return null
  }

  return (created?.id as string) ?? null
}

/**
 * Archiva la ficha en `athletes` vinculada a un Clerk user dentro del club.
 *
 * Se llama cuando un miembro pasa de un rol con jugador (`athlete`, `admin_athlete`)
 * a uno sin jugador (`admin`, `coach`), para que deje de aparecer en la nómina
 * de jugadores, en la toma de asistencia y en estadísticas.
 *
 * Es idempotente: si no hay ficha vinculada al usuario, no hace nada.
 * Solo afecta fichas con `athletes.user_id = userId` (no toca registros sin user_id
 * que pudieran haberse creado por inscripción manual).
 */
export async function archiveAthleteForUser(params: {
  clubId: string
  userId: string
}): Promise<{ archived: number }> {
  const { clubId, userId } = params
  if (!clubId || !userId) return { archived: 0 }

  const supabase = createAdminClient()

  const { data: rows } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .is('archived_at', null)

  const ids = (rows ?? []).map((r) => r.id as string)
  if (ids.length === 0) return { archived: 0 }

  const { error } = await supabase
    .from('athletes')
    .update({
      archived_at: new Date().toISOString(),
      status: 'inactive',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) {
    console.error('[archiveAthleteForUser] update error:', error)
    return { archived: 0 }
  }

  return { archived: ids.length }
}

/**
 * Backfill: archiva fichas de `athletes` que pertenezcan a miembros del club
 * cuyo rol actual en `user_clubs` es `admin` o `coach` (sin jugador).
 *
 * Pensado para corregir datos previos al fix de `updateTeamMemberRole`/`linkUserToClub`
 * y no requiere ejecución manual: se llama de forma idempotente al listar atletas.
 */
export async function cleanupStaffOnlyAthletesForClub(clubId: string): Promise<number> {
  if (!clubId) return 0

  const supabase = createAdminClient()

  const { data: staffOnly } = await supabase
    .from('user_clubs')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .in('role', ['admin', 'coach'])

  const userIds = (staffOnly ?? []).map((m) => m.user_id as string).filter(Boolean)
  if (userIds.length === 0) return 0

  const { data: orphanRows } = await supabase
    .from('athletes')
    .select('id')
    .eq('club_id', clubId)
    .in('user_id', userIds)
    .is('archived_at', null)

  const ids = (orphanRows ?? []).map((r) => r.id as string)
  if (ids.length === 0) return 0

  const { error } = await supabase
    .from('athletes')
    .update({
      archived_at: new Date().toISOString(),
      status: 'inactive',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) {
    console.error('[cleanupStaffOnlyAthletesForClub] update error:', error)
    return 0
  }

  return ids.length
}

/**
 * Backfill: crea el registro en `athletes` para todos los miembros
 * `admin_athlete` activos del club que aún no lo tengan.
 * Pensada para corregir datos preexistentes sin necesidad de migración.
 */
export async function syncAdminAthletesForClub(clubId: string): Promise<number> {
  if (!clubId) return 0

  const supabase = createAdminClient()

  const { data: members } = await supabase
    .from('user_clubs')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('role', 'admin_athlete')
    .eq('is_active', true)

  if (!members || members.length === 0) return 0

  const userIds = Array.from(
    new Set(members.map((m) => m.user_id as string).filter(Boolean))
  )
  if (userIds.length === 0) return 0

  const { data: linkedRows } = await supabase
    .from('athletes')
    .select('user_id')
    .eq('club_id', clubId)
    .in('user_id', userIds)

  const linkedUserIds = new Set(
    (linkedRows ?? []).map((a) => a.user_id as string).filter(Boolean)
  )

  const missing = userIds.filter((id) => !linkedUserIds.has(id))
  if (missing.length === 0) return 0

  const { data: usersRows } = await supabase
    .from('users')
    .select('clerk_id, email, name')
    .in('clerk_id', missing)

  const usersById: Record<string, { email: string | null; name: string | null }> = {}
  for (const row of usersRows ?? []) {
    usersById[row.clerk_id as string] = {
      email: (row.email as string | null) ?? null,
      name: (row.name as string | null) ?? null,
    }
  }

  const stillMissingClerkInfo = missing.filter((id) => !usersById[id])
  if (stillMissingClerkInfo.length > 0) {
    try {
      const clerk = await clerkClient()
      const clerkUsers = await clerk.users.getUserList({
        userId: stillMissingClerkInfo,
        limit: stillMissingClerkInfo.length,
      })
      for (const u of clerkUsers.data) {
        const userEmail = u.emailAddresses?.[0]?.emailAddress ?? null
        const userName =
          [u.firstName, u.lastName].filter(Boolean).join(' ') || userEmail
        usersById[u.id] = { email: userEmail, name: userName ?? null }
      }
    } catch (e) {
      console.error('[syncAdminAthletesForClub] clerk fetch failed:', e)
    }
  }

  let mergedOrCreated = 0

  for (const userId of missing) {
    const info = usersById[userId]
    const rawEmail = info?.email?.trim() ?? ''
    const emailNorm = rawEmail.toLowerCase()

    if (emailNorm) {
      const { data: sameEmail } = await supabase
        .from('athletes')
        .select('id, user_id')
        .eq('club_id', clubId)
        .ilike('email', emailNorm)
        .limit(1)

      const row = sameEmail?.[0]
      if (row) {
        const prevUid = row.user_id as string | null
        if (!prevUid || prevUid === userId) {
          const { error: upErr } = await supabase
            .from('athletes')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq('id', row.id as string)
          if (!upErr) mergedOrCreated++
        }
        continue
      }
    }

    const { error: insErr } = await supabase.from('athletes').insert({
      club_id: clubId,
      user_id: userId,
      name: (info?.name && info.name.trim()) || rawEmail || 'Atleta',
      email: rawEmail || null,
      status: 'active',
      health_status: 'healthy',
      enrollment_status: 'approved',
      technical_meta: {},
      performance_meta: {},
    })
    if (!insErr) mergedOrCreated++
    else console.error('[syncAdminAthletesForClub] insert error:', insErr)
  }

  return mergedOrCreated
}
