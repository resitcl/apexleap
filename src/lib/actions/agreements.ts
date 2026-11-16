'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getClubId,
  getClubMembershipRole,
  assertClubStaff,
  resolveCurrentAthleteIdInClub,
} from '@/lib/actions/club-context'
import { renderAgreementDocument } from '@/lib/agreement-document'
import { nowInTimeZone } from '@/lib/billing-utils'
import { pickFields } from '@/lib/safe-update'

/**
 * Acuerdos del club (términos y condiciones, reglamentos, autorizaciones).
 *
 * El alumno los ACEPTA con un clic, como unos términos y condiciones: lee el documento y presiona
 * "Acepto". No hay firma electrónica ni proveedor externo. De cada aceptación se guarda la
 * evidencia: quién, cuándo, desde qué IP y el texto exacto que tenía a la vista (el documento ya
 * con sus datos, por si la plantilla cambia después).
 */

type SupabaseAdmin = ReturnType<typeof createAdminClient>

// Types
export interface AgreementTemplate {
  id: string
  club_id: string
  name: string
  description: string | null
  content: string
  version: number
  is_active: boolean
  is_required_for_enrollment: boolean
  valid_months: number | null
  created_at: string
  updated_at: string
}

export interface AthleteAgreement {
  id: string
  club_id: string
  athlete_id: string
  template_id: string
  /** `signed` = aceptado por el alumno. Los demás estados son históricos. */
  status: 'pending' | 'sent_to_sign' | 'signed' | 'rejected' | 'expired' | 'cancelled'
  signed_at: string | null
  signer_rut: string | null
  signer_name: string | null
  signer_ip: string | null
  document_content: string
  document_variables: Record<string, string> | null
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
  template?: AgreementTemplate
  athletes?: { id: string; name: string; document_number: string | null }
}

// ============ TEMPLATES (staff) ============

export async function getAgreementTemplates(activeOnly = true) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  let query = supabase
    .from('agreement_templates')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as AgreementTemplate[]
}

export async function getAgreementTemplate(id: string) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('agreement_templates')
    .select('*')
    .eq('id', id)
    .eq('club_id', clubId)
    .single()

  if (error) throw new Error(error.message)
  return data as AgreementTemplate
}

export async function createAgreementTemplate(params: {
  name: string
  description?: string
  content: string
  is_required_for_enrollment?: boolean
  valid_months?: number | null
}) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('agreement_templates')
    .insert({
      club_id: clubId,
      name: params.name,
      description: params.description ?? null,
      content: params.content,
      is_required_for_enrollment: params.is_required_for_enrollment ?? true,
      valid_months: params.valid_months ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings/agreements')
  return data as AgreementTemplate
}

export async function updateAgreementTemplate(
  id: string,
  params: Partial<{
    name: string
    description: string | null
    content: string
    is_active: boolean
    is_required_for_enrollment: boolean
    valid_months: number | null
  }>
) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // If content changed, increment version
  const { data: current } = await supabase
    .from('agreement_templates')
    .select('content, version')
    .eq('id', id)
    .eq('club_id', clubId)
    .maybeSingle()

  // Lista blanca de columnas editables (nunca `club_id`, `version`, etc. desde el cliente).
  const updates: Record<string, unknown> = pickFields(params, [
    'name',
    'description',
    'content',
    'is_active',
    'is_required_for_enrollment',
    'valid_months',
  ])
  if (typeof updates.content === 'string' && current && updates.content !== current.content) {
    updates.version = (current.version ?? 1) + 1
  }

  const { data, error } = await supabase
    .from('agreement_templates')
    .update(updates)
    .eq('id', id)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings/agreements')
  return data as AgreementTemplate
}

// ============ ACEPTACIONES (staff) ============

/** Acuerdos de un alumno (aceptados e históricos). Solo staff. */
export async function getAthleteAgreements(athleteId: string) {
  await assertClubStaff()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('athlete_agreements')
    .select('*, template:agreement_templates(*)')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as (AthleteAgreement & { template: AgreementTemplate })[]
}

// ============ DOCUMENTO ============

type DocumentContext = {
  athlete: {
    name: string | null
    document_number: string | null
    email: string | null
    phone: string | null
    birth_date: string | null
  }
  club: {
    name: string | null
    address: string | null
    phone: string | null
    email: string | null
    timezone: string | null
  }
}

/** Datos del alumno y del club con que se rellena el documento. Lanza si el alumno no es del club. */
async function loadDocumentContext(
  supabase: SupabaseAdmin,
  clubId: string,
  athleteId: string,
): Promise<DocumentContext> {
  const [{ data: athlete, error: athleteErr }, { data: club, error: clubErr }] = await Promise.all([
    supabase
      .from('athletes')
      .select('name, document_number, email, phone, birth_date')
      .eq('id', athleteId)
      .eq('club_id', clubId)
      .maybeSingle(),
    supabase.from('clubs').select('name, address, phone, email, timezone').eq('id', clubId).maybeSingle(),
  ])
  // Sin esto un fallo de lectura producía un documento con el nombre y el RUT en blanco.
  if (athleteErr || !athlete) throw new Error('No se pudieron cargar los datos del alumno')
  if (clubErr || !club) throw new Error('No se pudieron cargar los datos del club')
  return { athlete, club } as DocumentContext
}

function buildDocumentVariables(ctx: DocumentContext): Record<string, string> {
  const today = nowInTimeZone(ctx.club.timezone)
  return {
    athlete_name: ctx.athlete.name ?? '',
    athlete_rut: ctx.athlete.document_number ?? '',
    athlete_email: ctx.athlete.email ?? '',
    athlete_phone: ctx.athlete.phone ?? '',
    athlete_address: '',
    athlete_birth_date: ctx.athlete.birth_date ?? '',
    club_name: ctx.club.name ?? '',
    club_address: ctx.club.address ?? '',
    club_phone: ctx.club.phone ?? '',
    club_email: ctx.club.email ?? '',
    current_date: today.toLocaleDateString('es-CL'),
    current_year: String(today.getFullYear()),
  }
}

// ============ ALUMNO: PENDIENTES Y ACEPTACIÓN ============

export type PendingAgreement = {
  templateId: string
  templateName: string
  templateDescription: string | null
  /** Versión de la plantilla que se le muestra; se valida al aceptar. */
  version: number
  /** `expired`: lo aceptó antes, pero la vigencia terminó y debe aceptarlo de nuevo. */
  status: 'not_accepted' | 'expired'
  /** Documento con los datos del alumno. Solo viene con `withContent`. */
  content: string | null
}

export type PendingAgreementsResult = {
  hasPending: boolean
  agreements: PendingAgreement[]
  athleteId: string | null
  athleteName: string | null
}

const NO_PENDING: PendingAgreementsResult = {
  hasPending: false,
  agreements: [],
  athleteId: null,
  athleteName: null,
}

/**
 * Acuerdos obligatorios que el alumno de la sesión todavía no acepta (o cuya vigencia venció).
 *
 * Lo consulta el layout en cada navegación, así que sale barato para casi todos: si el club no
 * tiene acuerdos obligatorios termina en una consulta. El staff puro (admin/coach) nunca queda
 * retenido: el panel de gestión no depende de un acuerdo de alumno.
 */
export async function getCurrentUserPendingAgreements(options?: {
  withContent?: boolean
}): Promise<PendingAgreementsResult> {
  let clubId: string
  try {
    clubId = await getClubId()
  } catch {
    return NO_PENDING
  }
  const supabase = createAdminClient()

  const { data: templates } = await supabase
    .from('agreement_templates')
    .select('id, name, description, content, version')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .eq('is_required_for_enrollment', true)
    .order('created_at', { ascending: true })

  if (!templates || templates.length === 0) return NO_PENDING

  const role = await getClubMembershipRole()
  if (role === 'admin' || role === 'coach') return NO_PENDING

  const athleteId = await resolveCurrentAthleteIdInClub()
  if (!athleteId) return NO_PENDING

  const { data: accepted } = await supabase
    .from('athlete_agreements')
    .select('template_id, valid_until')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .eq('status', 'signed')

  const acceptedByTemplate = new Map((accepted ?? []).map((a) => [a.template_id as string, a]))
  const nowIso = new Date().toISOString()

  const pending = templates.flatMap((t) => {
    const row = acceptedByTemplate.get(t.id as string)
    const validUntil = (row?.valid_until as string | null | undefined) ?? null
    if (row && (!validUntil || validUntil > nowIso)) return [] // aceptado y vigente
    return [{ template: t, status: row ? ('expired' as const) : ('not_accepted' as const) }]
  })

  if (pending.length === 0) return { ...NO_PENDING, athleteId }

  let ctx: DocumentContext | null = null
  if (options?.withContent) ctx = await loadDocumentContext(supabase, clubId, athleteId)
  const variables = ctx ? buildDocumentVariables(ctx) : null

  return {
    hasPending: true,
    athleteId,
    athleteName: ctx?.athlete.name ?? null,
    agreements: pending.map(({ template, status }) => ({
      templateId: template.id as string,
      templateName: template.name as string,
      templateDescription: (template.description as string | null) ?? null,
      version: Number(template.version ?? 1),
      status,
      content: variables ? renderAgreementDocument(template.content as string, variables) : null,
    })),
  }
}

export type AcceptAgreementResult = { ok: true } | { ok: false; error: string; outdated?: boolean }

/**
 * El alumno acepta un acuerdo del club ("Acepto", como unos términos y condiciones).
 *
 * El alumno sale siempre de la sesión: no se recibe un id de alumno desde el navegador, así que
 * nadie puede aceptar a nombre de otro. `version` es la versión del documento que tenía en
 * pantalla; si el club lo editó entretanto se rechaza para que lea el texto vigente.
 *
 * Devuelve `{ ok }` en vez de lanzar: en producción Next oculta el mensaje de un error lanzado
 * en un server action y el alumno vería un texto genérico.
 */
export async function acceptMyAgreement(templateId: string, version: number): Promise<AcceptAgreementResult> {
  const genericError = 'No se pudo registrar tu aceptación. Intenta de nuevo.'
  try {
    if (typeof templateId !== 'string' || !templateId) return { ok: false, error: 'Acuerdo inválido.' }

    const clubId = await getClubId()
    const athleteId = await resolveCurrentAthleteIdInClub()
    if (!athleteId) return { ok: false, error: 'No encontramos tu ficha de alumno en este club.' }

    const supabase = createAdminClient()

    const { data: template } = await supabase
      .from('agreement_templates')
      .select('id, content, version, valid_months')
      .eq('id', templateId)
      .eq('club_id', clubId)
      .eq('is_active', true)
      .maybeSingle()
    if (!template) return { ok: false, error: 'Este acuerdo ya no está disponible.', outdated: true }

    if (Number(template.version ?? 1) !== Number(version)) {
      return {
        ok: false,
        error: 'El club actualizó este documento. Revisa la versión vigente antes de aceptar.',
        outdated: true,
      }
    }

    const { data: rows } = await supabase
      .from('athlete_agreements')
      .select('id, status, signed_at, valid_until, notes')
      .eq('club_id', clubId)
      .eq('athlete_id', athleteId)
      .eq('template_id', templateId)

    const now = new Date()
    const nowIso = now.toISOString()
    const existing = rows ?? []
    const acceptedRow = existing.find((r) => r.status === 'signed')
    const acceptedUntil = (acceptedRow?.valid_until as string | null | undefined) ?? null
    // Ya aceptado y vigente (p. ej. doble clic o dos pestañas): nada que hacer.
    if (acceptedRow && (!acceptedUntil || acceptedUntil > nowIso)) return { ok: true }

    const ctx = await loadDocumentContext(supabase, clubId, athleteId)
    const variables = buildDocumentVariables(ctx)

    let validUntil: string | null = null
    if (template.valid_months) {
      const until = new Date(now)
      until.setMonth(until.getMonth() + Number(template.valid_months))
      validUntil = until.toISOString()
    }

    const requestHeaders = await headers()
    const ip =
      (requestHeaders.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
      requestHeaders.get('x-real-ip') ||
      null
    const userAgent = requestHeaders.get('user-agent')

    const noteLines = ['Aceptado en línea por el alumno (botón "Acepto").']
    if (userAgent) noteLines.push(`Navegador: ${userAgent.slice(0, 200)}`)
    if (acceptedRow?.signed_at) {
      noteLines.push(`Aceptación anterior: ${String(acceptedRow.signed_at).slice(0, 10)} (vigencia vencida).`)
    }

    const record = {
      status: 'signed' as const,
      signed_at: nowIso,
      signer_name: ctx.athlete.name,
      signer_rut: ctx.athlete.document_number,
      signer_ip: ip,
      document_content: renderAgreementDocument(template.content as string, variables),
      document_variables: { ...variables, template_version: String(template.version ?? 1) },
      valid_until: validUntil,
      notes: noteLines.join('\n'),
    }

    // La tabla tiene UNIQUE(athlete_id, template_id, status): no pueden coexistir dos filas
    // "signed" del mismo acuerdo. Por eso una renovación actualiza la fila ya aceptada, y si
    // quedó una fila a medias de un flujo anterior se reutiliza en vez de insertar otra.
    const reusable =
      acceptedRow ??
      existing.find((r) => r.status === 'pending') ??
      existing.find((r) => r.status === 'sent_to_sign')

    const { error } = reusable
      ? await supabase.from('athlete_agreements').update(record).eq('id', reusable.id).eq('club_id', clubId)
      : await supabase
          .from('athlete_agreements')
          .insert({ club_id: clubId, athlete_id: athleteId, template_id: templateId, ...record })

    // 23505 = otra petición simultánea ya dejó la aceptación registrada.
    if (error && error.code !== '23505') {
      console.error('[acceptMyAgreement] no se pudo registrar la aceptación:', error.message)
      return { ok: false, error: genericError }
    }

    revalidatePath('/dashboard/agreements')
    revalidatePath(`/dashboard/athletes/${athleteId}`)
    return { ok: true }
  } catch (err) {
    console.error('[acceptMyAgreement] error inesperado:', err instanceof Error ? err.message : err)
    return { ok: false, error: genericError }
  }
}
