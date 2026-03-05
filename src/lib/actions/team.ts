'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'

export async function inviteUserToClub(email: string, role: 'admin' | 'coach' | 'athlete') {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: club } = await supabase
    .from('clubs')
    .select('name, slug')
    .eq('id', clubId)
    .single()

  if (!club) throw new Error('Club no encontrado')

  // Check for existing pending invitation
  const { data: existing } = await supabase
    .from('club_invitations')
    .select('id, status')
    .eq('club_id', clubId)
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (existing?.status === 'pending') {
    throw new Error('Ya existe una invitación pendiente para ese email.')
  }

  // Check if user already has access (by searching user_clubs via Clerk lookup)
  const clerk = await clerkClient()

  // Create Clerk invitation
  let clerkInvitationId: string | null = null
  try {
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email.toLowerCase().trim(),
      publicMetadata: {
        pendingClubId: clubId,
        pendingRole: role,
        clubName: club.name,
      },
    })
    clerkInvitationId = invitation.id
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('already')) {
      throw new Error('Este email ya tiene una cuenta en ApexLeap. Pídele que use el onboarding para unirse al club.')
    }
    throw new Error(`Error al enviar invitación: ${msg}`)
  }

  // Upsert invitation record in DB
  const { error } = await supabase
    .from('club_invitations')
    .upsert({
      club_id: clubId,
      email: email.toLowerCase().trim(),
      role,
      clerk_invitation_id: clerkInvitationId,
      invited_by: userId,
      status: 'pending',
      accepted_at: null,
    }, { onConflict: 'club_id,email' })

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/team')
  return { ok: true }
}

export async function revokeInvitation(invitationId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: inv } = await supabase
    .from('club_invitations')
    .select('id, clerk_invitation_id, club_id')
    .eq('id', invitationId)
    .eq('club_id', clubId)
    .maybeSingle()

  if (!inv) throw new Error('Invitación no encontrada')

  if (inv.clerk_invitation_id) {
    try {
      const clerk = await clerkClient()
      await clerk.invitations.revokeInvitation(inv.clerk_invitation_id)
    } catch { /* already revoked or expired */ }
  }

  await supabase
    .from('club_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)

  revalidatePath('/dashboard/settings/team')
  return { ok: true }
}

export async function removeTeamMember(clerkUserId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  if (userId === clerkUserId) throw new Error('No puedes removerte a ti mismo')

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('user_clubs')
    .update({ is_active: false })
    .eq('user_id', clerkUserId)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings/team')
  return { ok: true }
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

  return {
    members: membersRes.data ?? [],
    invitations: invitationsRes.data ?? [],
    clubSlug: clubRes.data?.slug ?? '',
  }
}
