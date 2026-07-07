'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, getClubMembershipRole } from '@/lib/actions/club-context'
import { sendBroadcastEmail } from '@/lib/email'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

export type MessageTemplate = { id: string; name: string; subject: string; body: string }

export type MessageAudience =
  | { type: 'all' }
  | { type: 'filter'; status?: string | null; subscriptionStatus?: string | null; planId?: string | null; categoryId?: string | null }
  | { type: 'selection'; athleteIds: string[] }

export type CommunicationsAthlete = {
  id: string
  name: string
  email: string | null
  status: string
  categoryId: string | null
  planId: string | null
  planName: string | null
  debt: number
}

async function assertAdmin() {
  const role = await getClubMembershipRole()
  if (role !== 'admin' && role !== 'admin_athlete') {
    throw new Error('Solo un administrador del club puede gestionar comunicaciones.')
  }
}

/** Lista de alumnos enriquecida para el selector de audiencia y la resolución de destinatarios. */
export async function getCommunicationsAthletes(): Promise<CommunicationsAthlete[]> {
  await assertAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('athletes')
    .select('id, name, email, status, category_id, subscriptions(status, plan_id, plans(name)), payments(status, amount)')
    .eq('club_id', clubId)
    .is('archived_at', null)
    .order('name', { ascending: true })

  type Row = {
    id: string; name: string; email: string | null; status: string; category_id: string | null
    subscriptions: Array<{ status: string; plan_id: string | null; plans: { name: string } | { name: string }[] | null }> | null
    payments: Array<{ status: string; amount: number }> | null
  }

  return ((data ?? []) as unknown as Row[]).map((a) => {
    const activeSub = (a.subscriptions ?? []).find((s) => s.status === 'active')
    const plansData = activeSub?.plans
    const plan = Array.isArray(plansData) ? plansData[0] : plansData
    const debt = (a.payments ?? []).filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      status: a.status,
      categoryId: a.category_id,
      planId: activeSub?.plan_id ?? null,
      planName: plan?.name ?? null,
      debt,
    }
  })
}

function matchesAudience(a: CommunicationsAthlete, audience: MessageAudience): boolean {
  if (audience.type === 'all') return true
  if (audience.type === 'selection') return audience.athleteIds.includes(a.id)
  // filter
  if (audience.status && a.status !== audience.status) return false
  if (audience.planId && a.planId !== audience.planId) return false
  if (audience.categoryId && a.categoryId !== audience.categoryId) return false
  if (audience.subscriptionStatus) {
    if (audience.subscriptionStatus === 'overdue' && a.debt <= 0) return false
    if (audience.subscriptionStatus === 'active' && !a.planId) return false
    if (audience.subscriptionStatus === 'none' && a.planId) return false
  }
  return true
}

/** Plantillas de mensajes (guardadas en clubs.settings.message_templates → sin migración). */
export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  await assertAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('settings').eq('id', clubId).single()
  const settings = (club?.settings ?? {}) as Record<string, unknown>
  const list = settings.message_templates
  return Array.isArray(list) ? (list as MessageTemplate[]) : []
}

export async function saveMessageTemplate(input: {
  id?: string
  name: string
  subject: string
  body: string
}): Promise<MessageTemplate> {
  await assertAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const name = input.name.trim()
  if (!name) throw new Error('La plantilla necesita un nombre.')

  const { data: club } = await supabase.from('clubs').select('settings').eq('id', clubId).single()
  const settings = (club?.settings ?? {}) as Record<string, unknown>
  const list = (Array.isArray(settings.message_templates) ? settings.message_templates : []) as MessageTemplate[]

  let saved: MessageTemplate
  if (input.id) {
    saved = { id: input.id, name, subject: input.subject, body: input.body }
    const idx = list.findIndex((t) => t.id === input.id)
    if (idx >= 0) list[idx] = saved
    else list.push(saved)
  } else {
    saved = { id: randomUUID(), name, subject: input.subject, body: input.body }
    list.push(saved)
  }

  const { error } = await supabase
    .from('clubs')
    .update({ settings: { ...settings, message_templates: list }, updated_at: new Date().toISOString() })
    .eq('id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/communications')
  return saved
}

export async function deleteMessageTemplate(id: string): Promise<void> {
  await assertAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data: club } = await supabase.from('clubs').select('settings').eq('id', clubId).single()
  const settings = (club?.settings ?? {}) as Record<string, unknown>
  const list = (Array.isArray(settings.message_templates) ? settings.message_templates : []) as MessageTemplate[]
  const next = list.filter((t) => t.id !== id)
  const { error } = await supabase
    .from('clubs')
    .update({ settings: { ...settings, message_templates: next }, updated_at: new Date().toISOString() })
    .eq('id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/communications')
}

function applyVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? '')
}

/**
 * Envía el mensaje a la audiencia (resuelta en el SERVIDOR, no confía en una lista del cliente).
 * Best-effort: personaliza variables por alumno y devuelve conteos.
 */
export async function sendBulkMessage(input: {
  subject: string
  body: string
  audience: MessageAudience
}): Promise<{ total: number; sent: number; failed: number; skippedNoEmail: number }> {
  await assertAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject) throw new Error('El asunto no puede estar vacío.')
  if (!body) throw new Error('El mensaje no puede estar vacío.')

  const all = await getCommunicationsAthletes()
  const matched = all.filter((a) => matchesAudience(a, input.audience))
  const skippedNoEmail = matched.filter((a) => !a.email?.trim()).length
  const recipients = matched.filter((a) => a.email?.trim())

  const { data: club } = await supabase
    .from('clubs')
    .select('name, logo_url, primary_color, settings')
    .eq('id', clubId)
    .single()
  const clubName = club?.name ?? 'tu academia'
  const settings = (club?.settings ?? {}) as Record<string, unknown>
  const replyTo =
    ((settings.payment_settings as { bank_info?: { email?: string } } | undefined)?.bank_info?.email) ?? null

  let sent = 0
  let failed = 0
  const chunkSize = 10
  for (let i = 0; i < recipients.length; i += chunkSize) {
    const chunk = recipients.slice(i, i + chunkSize)
    const results = await Promise.allSettled(
      chunk.map((r) => {
        const firstName = (r.name ?? '').trim().split(/\s+/)[0] || r.name || 'alumno'
        const vars: Record<string, string> = {
          nombre: firstName,
          nombre_completo: r.name ?? '',
          plan: r.planName ?? '',
          deuda: r.debt > 0 ? `$${r.debt.toLocaleString('es-CL')}` : '$0',
          club: clubName,
        }
        return sendBroadcastEmail({
          to: r.email!.trim(),
          subject: applyVars(subject, vars),
          bodyText: applyVars(body, vars),
          clubName,
          logoUrl: club?.logo_url ?? null,
          brandColor: club?.primary_color ?? null,
          replyTo,
        })
      }),
    )
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.success) sent++
      else failed++
    }
  }

  return { total: matched.length, sent, failed, skippedNoEmail }
}
