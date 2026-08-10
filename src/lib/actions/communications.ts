'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, getClubMembershipRole } from '@/lib/actions/club-context'
import { sendBroadcastEmail, sendPaymentReminderEmail } from '@/lib/email'
import { getAutoTemplate, renderTemplateVars } from '@/lib/auto-templates'
import { getLastRemindersByAthlete, logPaymentReminder, type LastReminder } from '@/lib/payment-reminders'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

export type CommunicationLog = {
  id: string
  kind: string
  channel: string
  subject: string | null
  audience_type: string | null
  recipient_count: number
  sent_count: number
  failed_count: number
  created_at: string
}

/** Registra un envío en el historial. Best-effort: si la tabla aún no está migrada, no rompe. */
async function logCommunication(
  supabase: ReturnType<typeof createAdminClient>,
  clubId: string,
  entry: {
    kind: 'broadcast' | 'individual' | 'payment_request'
    subject?: string | null
    audienceType?: string | null
    recipientCount: number
    sentCount: number
    failedCount: number
  },
) {
  try {
    const { userId } = await auth()
    await supabase.from('communication_logs').insert({
      club_id: clubId,
      kind: entry.kind,
      channel: 'email',
      subject: entry.subject ?? null,
      audience_type: entry.audienceType ?? null,
      recipient_count: entry.recipientCount,
      sent_count: entry.sentCount,
      failed_count: entry.failedCount,
      sent_by: userId ?? null,
    })
  } catch {
    // best-effort
  }
}

/** Historial reciente de comunicaciones enviadas del club. */
export async function getCommunicationLogs(limit = 30): Promise<CommunicationLog[]> {
  await assertAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()
  try {
    const { data } = await supabase
      .from('communication_logs')
      .select('id, kind, channel, subject, audience_type, recipient_count, sent_count, failed_count, created_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data ?? []) as CommunicationLog[]
  } catch {
    return []
  }
}

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

  await logCommunication(supabase, clubId, {
    kind: 'broadcast',
    subject,
    audienceType: input.audience.type,
    recipientCount: matched.length,
    sentCount: sent,
    failedCount: failed,
  })

  return { total: matched.length, sent, failed, skippedNoEmail }
}

/** Envía un mensaje personalizado a UN alumno (desde su ficha). */
export async function sendMessageToAthlete(
  athleteId: string,
  input: { subject: string; body: string },
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject || !body) return { ok: false, error: 'Asunto y mensaje son obligatorios.' }

  const { data: a } = await supabase
    .from('athletes')
    .select('name, email, subscriptions(status, plans(name)), payments(status, amount)')
    .eq('club_id', clubId)
    .eq('id', athleteId)
    .maybeSingle()
  if (!a) return { ok: false, error: 'Alumno no encontrado.' }
  const to = a.email?.trim()
  if (!to) return { ok: false, error: 'El alumno no tiene email registrado.' }

  const { data: club } = await supabase
    .from('clubs').select('name, logo_url, primary_color, settings').eq('id', clubId).single()
  const clubName = club?.name ?? 'tu academia'
  const settings = (club?.settings ?? {}) as Record<string, unknown>
  const replyTo = ((settings.payment_settings as { bank_info?: { email?: string } } | undefined)?.bank_info?.email) ?? null

  const subs = (a.subscriptions ?? []) as Array<{ status: string; plans: { name: string } | { name: string }[] | null }>
  const activeSub = subs.find((s) => s.status === 'active')
  const plan = Array.isArray(activeSub?.plans) ? activeSub?.plans[0] : activeSub?.plans
  const debt = ((a.payments ?? []) as Array<{ status: string; amount: number }>)
    .filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
  const firstName = (a.name ?? '').trim().split(/\s+/)[0] || a.name || 'alumno'
  const vars: Record<string, string> = {
    nombre: firstName, nombre_completo: a.name ?? '', plan: plan?.name ?? '',
    deuda: debt > 0 ? `$${debt.toLocaleString('es-CL')}` : '$0', club: clubName,
  }

  const res = await sendBroadcastEmail({
    to,
    subject: applyVars(subject, vars),
    bodyText: applyVars(body, vars),
    clubName,
    logoUrl: club?.logo_url ?? null,
    brandColor: club?.primary_color ?? null,
    replyTo,
  })
  await logCommunication(supabase, clubId, {
    kind: 'individual',
    subject,
    audienceType: 'athlete',
    recipientCount: 1,
    sentCount: res.success ? 1 : 0,
    failedCount: res.success ? 0 : 1,
  })
  return res.success ? { ok: true } : { ok: false, error: res.error ?? 'No se pudo enviar.' }
}

/** Envía una solicitud de pago a un alumno (recordatorio con monto + link al portal de pago). */
export async function sendPaymentRequest(
  athleteId: string,
  note?: string,
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: a } = await supabase
    .from('athletes')
    .select('name, email, subscriptions(status, plans(name, price)), payments(status, amount, due_date)')
    .eq('club_id', clubId)
    .eq('id', athleteId)
    .maybeSingle()
  if (!a) return { ok: false, error: 'Alumno no encontrado.' }
  const to = a.email?.trim()
  if (!to) return { ok: false, error: 'El alumno no tiene email registrado.' }

  const { data: club } = await supabase
    .from('clubs').select('name, slug, logo_url, primary_color, settings').eq('id', clubId).single()
  const clubName = club?.name ?? 'tu academia'
  const settings = (club?.settings ?? {}) as Record<string, unknown>
  const ps = (settings.payment_settings ?? {}) as { bank_info?: { email?: string }; cash_instructions?: string }
  const replyTo = ps.bank_info?.email ?? null

  const subs = (a.subscriptions ?? []) as Array<{ status: string; plans: { name: string; price: number } | { name: string; price: number }[] | null }>
  const activeSub = subs.find((s) => s.status === 'active')
  const plan = Array.isArray(activeSub?.plans) ? activeSub?.plans[0] : activeSub?.plans
  const pmts = (a.payments ?? []) as Array<{ status: string; amount: number; due_date: string }>
  const outstanding = pmts
    .filter((p) => p.status === 'overdue' || p.status === 'pending')
    .sort((x, y) => (x.due_date ?? '').localeCompare(y.due_date ?? ''))[0]
  const debt = pmts.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
  const amount = Number(outstanding?.amount ?? (debt > 0 ? debt : plan?.price ?? 0))

  // Cobro manual: acción explícita del admin → se envía siempre, pero usando el texto/botón de la
  // plantilla "Recordatorio / atraso" del club (misma que usa el cron), para mantener consistencia.
  const reminderTpl = getAutoTemplate(settings, 'payment_reminder')
  const montoFmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount)
  const dueFmt = outstanding?.due_date
    ? new Date(`${outstanding.due_date}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const tplVars = {
    nombre: a.name ?? 'Atleta',
    club: clubName,
    plan: plan?.name ?? '',
    monto: montoFmt,
    fecha_vencimiento: dueFmt,
  }
  const btnUrl = renderTemplateVars(reminderTpl.buttonUrl, tplVars).trim()
  const buttonOverride = btnUrl
    ? { text: renderTemplateVars(reminderTpl.buttonText, tplVars).trim() || 'Ver más', url: btnUrl }
    : undefined

  const res = await sendPaymentReminderEmail({
    to,
    athleteName: a.name ?? 'Atleta',
    clubName,
    clubSlug: club?.slug ?? '',
    amount,
    dueDate: outstanding?.due_date,
    planName: plan?.name ?? undefined,
    paymentInstructions: note?.trim() || ps.cash_instructions || undefined,
    logoUrl: club?.logo_url ?? null,
    brandColor: club?.primary_color ?? null,
    replyTo,
    subjectOverride: renderTemplateVars(reminderTpl.subject, tplVars),
    introOverride: renderTemplateVars(reminderTpl.body, tplVars),
    buttonOverride,
    showDetails: reminderTpl.showDetails,
  })
  await logCommunication(supabase, clubId, {
    kind: 'payment_request',
    subject: `Solicitud de pago – ${clubName}`,
    audienceType: 'athlete',
    recipientCount: 1,
    sentCount: res.success ? 1 : 0,
    failedCount: res.success ? 0 : 1,
  })

  // Bitácora por alumno: `communication_logs` solo guarda totales, así que no sirve para
  // responder "¿a quién le mandé cobro y cuándo?".
  const { userId } = await auth()
  await logPaymentReminder(supabase, clubId, {
    athleteId,
    source: 'manual',
    status: res.success ? 'sent' : 'failed',
    amount,
    dueDate: outstanding?.due_date ?? null,
    error: res.success ? null : res.error ?? null,
    sentBy: userId ?? null,
  })

  revalidatePath('/dashboard/athletes')
  revalidatePath(`/dashboard/athletes/${athleteId}`)
  return res.success ? { ok: true } : { ok: false, error: res.error ?? 'No se pudo enviar.' }
}

/**
 * Último cobro enviado a cada alumno (para la vista de Alumnos).
 * Vacío si la migración 038 aún no corrió.
 */
export async function getPaymentReminderHistory(
  athleteIds?: string[],
): Promise<Record<string, LastReminder>> {
  const role = await getClubMembershipRole()
  if (role !== 'admin' && role !== 'admin_athlete' && role !== 'coach') return {}
  const clubId = await getClubId()
  return getLastRemindersByAthlete(createAdminClient(), clubId, athleteIds)
}
