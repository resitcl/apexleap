import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ClerkEvent = {
  type: string
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    first_name: string | null
    last_name: string | null
    image_url: string | null
    created_at: number
    public_metadata?: Record<string, unknown>
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing CLERK_WEBHOOK_SECRET' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: ClerkEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data
    const email = email_addresses[0]?.email_address ?? null
    const name = [first_name, last_name].filter(Boolean).join(' ') || email || id

    await supabase.from('users').upsert({
      clerk_id: id,
      email,
      name,
      avatar_url: image_url ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'clerk_id' })

    // Auto-link user to club if there's a pending invitation for their email
    if (evt.type === 'user.created' && email) {
      const { data: invitation } = await supabase
        .from('club_invitations')
        .select('id, club_id, role')
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle()

      if (invitation) {
        await supabase.from('user_clubs').upsert({
          user_id: id,
          club_id: invitation.club_id,
          role: invitation.role,
          is_active: true,
        }, { onConflict: 'user_id,club_id' })

        await supabase
          .from('club_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitation.id)
      }
    }
  }

  if (evt.type === 'user.deleted') {
    const { id } = evt.data
    await supabase
      .from('user_clubs')
      .update({ is_active: false })
      .eq('user_id', id)
  }

  return NextResponse.json({ received: true })
}
