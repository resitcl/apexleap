'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, assertClubCapability } from '@/lib/actions/club-context'
import { ensureAthleteRecordForUser, archiveAthleteForUser } from '@/lib/admin-athlete-sync'

function clerkErrMsg(err: unknown): string {
  if (!err) return 'Error desconocido'
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    // ClerkAPIResponseError shape
    if (Array.isArray(e.errors) && (e.errors as Array<{message?: string}>)[0]?.message) {
      return (e.errors as Array<{message: string}>)[0].message
    }
    if (typeof e.message === 'string') return e.message
    if (typeof e.longMessage === 'string') return e.longMessage
  }
  return String(err)
}

export async function inviteUserToClub(
  email: string,
  role: 'admin' | 'admin_athlete' | 'coach' | 'athlete'
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertClubCapability('team')
    const { userId } = await auth()
    if (!userId) return { ok: false, error: 'No autorizado' }

    const clubId = await getClubId()
    const supabase = createAdminClient()

    const { data: club } = await supabase
      .from('clubs').select('name, slug').eq('id', clubId).single()
    if (!club) return { ok: false, error: 'Club no encontrado' }

    const { data: existing } = await supabase
      .from('club_invitations').select('id, status')
      .eq('club_id', clubId).eq('email', email.toLowerCase().trim()).maybeSingle()
    if (existing?.status === 'pending')
      return { ok: false, error: 'Ya existe una invitación pendiente para ese email.' }

    const clerk = await clerkClient()
    let clerkInvitationId: string | null = null
    try {
      const inv = await clerk.invitations.createInvitation({
        emailAddress: email.toLowerCase().trim(),
        publicMetadata: { pendingClubId: clubId, pendingRole: role, clubName: club.name },
      })
      clerkInvitationId = inv.id
    } catch (err: unknown) {
      const msg = clerkErrMsg(err)
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
        return { ok: false, error: 'Este email ya tiene una cuenta. Pídele que se una desde el onboarding del club.' }
      }
      return { ok: false, error: `Error al crear invitación en Clerk: ${msg}` }
    }

    const { error: dbErr } = await supabase
      .from('club_invitations')
      .upsert({
        club_id: clubId, email: email.toLowerCase().trim(), role,
        clerk_invitation_id: clerkInvitationId, invited_by: userId,
        status: 'pending', accepted_at: null,
      }, { onConflict: 'club_id,email' })
    if (dbErr) return { ok: false, error: `Error al guardar invitación: ${dbErr.message}` }

    revalidatePath('/dashboard/settings/team')
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: clerkErrMsg(err) }
  }
}

export async function revokeInvitation(invitationId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertClubCapability('team')
    const { userId } = await auth()
    if (!userId) return { ok: false, error: 'No autorizado' }

    const clubId = await getClubId()
    const supabase = createAdminClient()

    const { data: inv } = await supabase
      .from('club_invitations').select('id, clerk_invitation_id, club_id')
      .eq('id', invitationId).eq('club_id', clubId).maybeSingle()
    if (!inv) return { ok: false, error: 'Invitación no encontrada' }

    if (inv.clerk_invitation_id) {
      try {
        const clerk = await clerkClient()
        await clerk.invitations.revokeInvitation(inv.clerk_invitation_id)
      } catch { /* already revoked or expired */ }
    }

    await supabase.from('club_invitations').update({ status: 'revoked' }).eq('id', invitationId)
    revalidatePath('/dashboard/settings/team')
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: clerkErrMsg(err) }
  }
}

export async function removeTeamMember(clerkUserId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertClubCapability('team')
    const { userId } = await auth()
    if (!userId) return { ok: false, error: 'No autorizado' }
    if (userId === clerkUserId) return { ok: false, error: 'No puedes removerte a ti mismo' }

    const clubId = await getClubId()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('user_clubs').update({ is_active: false })
      .eq('user_id', clerkUserId).eq('club_id', clubId)
    if (error) return { ok: false, error: error.message }

    revalidatePath('/dashboard/settings/team')
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: clerkErrMsg(err) }
  }
}

export async function updateTeamMemberRole(
  clerkUserId: string,
  role: 'admin' | 'admin_athlete' | 'coach' | 'athlete'
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { userId } = await auth()
    if (!userId) return { ok: false, error: 'No autorizado' }

    const clubId = await getClubId()
    const supabase = createAdminClient()

    // Solo admin/admin_athlete pueden cambiar roles.
    const { data: me } = await supabase
      .from('user_clubs')
      .select('role')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .eq('is_active', true)
      .maybeSingle()

    if (!me || !['admin', 'admin_athlete'].includes(me.role)) {
      return { ok: false, error: 'No tienes permisos para cambiar roles.' }
    }

    const { error } = await supabase
      .from('user_clubs')
      .update({ role })
      .eq('user_id', clerkUserId)
      .eq('club_id', clubId)
      .eq('is_active', true)

    if (error) return { ok: false, error: error.message }

    // Si el nuevo rol es admin+atleta o atleta, asegurar registro en `athletes`.
    if (role === 'admin_athlete' || role === 'athlete') {
      const { data: userRow } = await supabase
        .from('users')
        .select('email, name')
        .eq('clerk_id', clerkUserId)
        .maybeSingle()

      let email = (userRow?.email as string | null) ?? null
      let name = (userRow?.name as string | null) ?? null

      if (!email || !name) {
        try {
          const clerk = await clerkClient()
          const u = await clerk.users.getUser(clerkUserId)
          email = email ?? (u.emailAddresses?.[0]?.emailAddress ?? null)
          name = name ?? ([u.firstName, u.lastName].filter(Boolean).join(' ') || email)
        } catch {
          /* fallback silencioso */
        }
      }

      await ensureAthleteRecordForUser({
        clubId,
        userId: clerkUserId,
        email,
        name,
      }).catch((err) => {
        console.error('[updateTeamMemberRole] ensureAthleteRecordForUser failed:', err)
      })
    } else {
      // El nuevo rol no incluye jugador (admin o coach): archivar la ficha del
      // usuario para que no aparezca en la nómina, asistencia ni estadísticas.
      await archiveAthleteForUser({ clubId, userId: clerkUserId }).catch((err) => {
        console.error('[updateTeamMemberRole] archiveAthleteForUser failed:', err)
      })
    }

    revalidatePath('/dashboard/settings/team')
    revalidatePath('/dashboard/athletes')
    revalidatePath('/dashboard/attendance')
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: clerkErrMsg(err) }
  }
}

export async function getTeamData() {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const [membersRes, invitationsRes, clubRes] = await Promise.all([
    supabase
      .from('user_clubs')
      .select('user_id, role, is_active, created_at')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('created_at'),
    supabase
      .from('club_invitations')
      .select('id, email, role, status, created_at, accepted_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false }),
    supabase
      .from('clubs')
      .select('slug')
      .eq('id', clubId)
      .single(),
  ])

  const members = membersRes.data ?? []
  const userIds = members.map((m) => m.user_id)

  let userInfoById: Record<string, { name: string | null; email: string | null }> = {}
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('users')
      .select('clerk_id, name, email')
      .in('clerk_id', userIds)

    userInfoById = Object.fromEntries(
      (usersData ?? []).map((u) => [
        u.clerk_id as string,
        { name: (u.name as string | null) ?? null, email: (u.email as string | null) ?? null },
      ]),
    )

    // Fallback: completar nombre/email directamente desde Clerk para miembros antiguos
    // que aún no tengan fila en `users`.
    const missingIds = userIds.filter((id) => {
      const info = userInfoById[id]
      return !info || (!info.name && !info.email)
    })

    if (missingIds.length > 0) {
      try {
        const clerk = await clerkClient()
        const clerkUsers = await clerk.users.getUserList({ userId: missingIds, limit: missingIds.length })
        for (const u of clerkUsers.data) {
          const email = u.emailAddresses?.[0]?.emailAddress ?? null
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || email || null
          userInfoById[u.id] = { name, email }
        }
      } catch {
        // Si Clerk falla, mantenemos fallback al user_id sin romper la vista.
      }
    }
  }

  return {
    members: members.map((m) => ({
      ...m,
      name: userInfoById[m.user_id]?.name ?? null,
      email: userInfoById[m.user_id]?.email ?? null,
    })),
    invitations: invitationsRes.data ?? [],
    clubSlug: clubRes.data?.slug ?? '',
  }
}
