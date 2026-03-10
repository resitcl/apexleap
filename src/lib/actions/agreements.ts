'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'

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
  status: 'pending' | 'sent_to_sign' | 'signed' | 'rejected' | 'expired' | 'cancelled'
  gestdoc_document_id: string | null
  gestdoc_signing_url: string | null
  gestdoc_signed_document_url: string | null
  gestdoc_transaction_id: string | null
  signed_at: string | null
  signer_rut: string | null
  signer_name: string | null
  signer_ip: string | null
  document_content: string
  document_variables: Record<string, string> | null
  valid_until: string | null
  sent_at: string | null
  reminder_sent_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  template?: AgreementTemplate
  athletes?: { id: string; name: string; document_number: string | null }
}

// ============ TEMPLATES ============

export async function getAgreementTemplates(activeOnly = true) {
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
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // If content changed, increment version
  const { data: current } = await supabase
    .from('agreement_templates')
    .select('content, version')
    .eq('id', id)
    .single()

  const updates: Record<string, unknown> = { ...params }
  if (params.content && current && params.content !== current.content) {
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

// ============ ATHLETE AGREEMENTS ============

export async function getAthleteAgreements(athleteId: string) {
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

export async function getPendingAgreements(athleteId: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Get all required templates
  const { data: templates } = await supabase
    .from('agreement_templates')
    .select('id, name, description, content')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .eq('is_required_for_enrollment', true)

  if (!templates || templates.length === 0) return []

  // Get athlete's signed agreements
  const { data: signed } = await supabase
    .from('athlete_agreements')
    .select('template_id, valid_until')
    .eq('athlete_id', athleteId)
    .eq('status', 'signed')

  const signedMap = new Map(
    (signed ?? []).map(s => [s.template_id, s.valid_until])
  )

  // Filter templates that need signing
  const now = new Date().toISOString()
  return templates.filter(t => {
    const validUntil = signedMap.get(t.id)
    if (!validUntil) return true // Never signed
    if (validUntil && validUntil < now) return true // Expired
    return false
  })
}

export async function checkAthleteHasValidAgreements(athleteId: string): Promise<boolean> {
  const pending = await getPendingAgreements(athleteId)
  return pending.length === 0
}

export async function createAthleteAgreement(params: {
  athleteId: string
  templateId: string
  variables?: Record<string, string>
}) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Get template
  const { data: template, error: templateError } = await supabase
    .from('agreement_templates')
    .select('*')
    .eq('id', params.templateId)
    .eq('club_id', clubId)
    .single()

  if (templateError || !template) {
    throw new Error('Template no encontrado')
  }

  // Get athlete info for variables
  const { data: athlete } = await supabase
    .from('athletes')
    .select('name, document_number, email, phone, birth_date, address')
    .eq('id', params.athleteId)
    .single()

  // Get club info for variables
  const { data: club } = await supabase
    .from('clubs')
    .select('name, slug, address, phone, email')
    .eq('id', clubId)
    .single()

  // Build variables
  const variables: Record<string, string> = {
    ...params.variables,
    athlete_name: athlete?.name ?? '',
    athlete_rut: athlete?.document_number ?? '',
    athlete_email: athlete?.email ?? '',
    athlete_phone: athlete?.phone ?? '',
    athlete_address: athlete?.address ?? '',
    athlete_birth_date: athlete?.birth_date ?? '',
    club_name: club?.name ?? '',
    club_address: club?.address ?? '',
    club_phone: club?.phone ?? '',
    club_email: club?.email ?? '',
    current_date: new Date().toLocaleDateString('es-CL'),
    current_year: new Date().getFullYear().toString(),
  }

  // Render content with variables
  let renderedContent = template.content
  for (const [key, value] of Object.entries(variables)) {
    renderedContent = renderedContent.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  // Calculate valid_until if template has valid_months
  let validUntil: string | null = null
  if (template.valid_months) {
    const date = new Date()
    date.setMonth(date.getMonth() + template.valid_months)
    validUntil = date.toISOString()
  }

  // Check for existing pending agreement
  const { data: existing } = await supabase
    .from('athlete_agreements')
    .select('id')
    .eq('athlete_id', params.athleteId)
    .eq('template_id', params.templateId)
    .in('status', ['pending', 'sent_to_sign'])
    .single()

  if (existing) {
    throw new Error('Ya existe un acuerdo pendiente para este template')
  }

  const { data, error } = await supabase
    .from('athlete_agreements')
    .insert({
      club_id: clubId,
      athlete_id: params.athleteId,
      template_id: params.templateId,
      status: 'pending',
      document_content: renderedContent,
      document_variables: variables,
      valid_until: validUntil,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/dashboard/athletes/${params.athleteId}`)
  return data as AthleteAgreement
}

export async function updateAgreementStatus(
  agreementId: string,
  status: AthleteAgreement['status'],
  extra?: Partial<AthleteAgreement>
) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('athlete_agreements')
    .update({ status, ...extra })
    .eq('id', agreementId)
    .eq('club_id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/athletes')
  return data as AthleteAgreement
}

// ============ GESTDOC INTEGRATION ============

export async function sendAgreementToGestdoc(agreementId: string) {
  const clubId = await getClubId()
  const supabase = createAdminClient()

  // Get agreement with athlete and club info
  const { data: agreement, error } = await supabase
    .from('athlete_agreements')
    .select(`
      *,
      athletes(id, name, document_number, email),
      template:agreement_templates(name)
    `)
    .eq('id', agreementId)
    .eq('club_id', clubId)
    .single()

  if (error || !agreement) {
    throw new Error('Acuerdo no encontrado')
  }

  // Get club's GESTDOC credentials
  const { data: club } = await supabase
    .from('clubs')
    .select('gestdoc_api_key, gestdoc_enabled, name')
    .eq('id', clubId)
    .single()

  if (!club?.gestdoc_enabled || !club?.gestdoc_api_key) {
    throw new Error('GESTDOC no está configurado para este club')
  }

  // TODO: Call GESTDOC API here
  // This will be implemented once we have the API documentation
  // For now, we'll create a placeholder that simulates the flow

  const gestdocResponse = await callGestdocAPI({
    apiKey: club.gestdoc_api_key,
    action: 'create_document',
    data: {
      title: `${agreement.template?.name} - ${agreement.athletes?.name}`,
      content: agreement.document_content,
      signerRut: agreement.athletes?.document_number,
      signerEmail: agreement.athletes?.email,
      signerName: agreement.athletes?.name,
      clubName: club.name,
    },
  })

  // Update agreement with GESTDOC info
  const { data: updated } = await supabase
    .from('athlete_agreements')
    .update({
      status: 'sent_to_sign',
      gestdoc_document_id: gestdocResponse.documentId,
      gestdoc_signing_url: gestdocResponse.signingUrl,
      sent_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select()
    .single()

  revalidatePath('/dashboard/athletes')
  return updated as AthleteAgreement
}

// Placeholder for GESTDOC API call - will be replaced with actual implementation
async function callGestdocAPI(params: {
  apiKey: string
  action: string
  data: Record<string, unknown>
}): Promise<{ documentId: string; signingUrl: string; transactionId: string }> {
  // TODO: Replace with actual GESTDOC API call
  // This is a placeholder that simulates the response
  
  console.log('GESTDOC API call:', params.action, params.data)
  
  // Simulate API response
  return {
    documentId: `GESTDOC-${Date.now()}`,
    signingUrl: `https://gestdoc.example.com/sign/${Date.now()}`,
    transactionId: `TXN-${Date.now()}`,
  }
}

// Webhook handler for GESTDOC callbacks
export async function handleGestdocWebhook(payload: {
  documentId: string
  status: 'signed' | 'rejected'
  signerRut?: string
  signerName?: string
  signedDocumentUrl?: string
  transactionId?: string
  signedAt?: string
}) {
  const supabase = createAdminClient()

  const { data: agreement, error } = await supabase
    .from('athlete_agreements')
    .select('id, club_id, athlete_id')
    .eq('gestdoc_document_id', payload.documentId)
    .single()

  if (error || !agreement) {
    throw new Error('Acuerdo no encontrado para este documento')
  }

  const updates: Partial<AthleteAgreement> = {
    status: payload.status,
  }

  if (payload.status === 'signed') {
    updates.signed_at = payload.signedAt ?? new Date().toISOString()
    updates.signer_rut = payload.signerRut ?? null
    updates.signer_name = payload.signerName ?? null
    updates.gestdoc_signed_document_url = payload.signedDocumentUrl ?? null
    updates.gestdoc_transaction_id = payload.transactionId ?? null
  }

  await supabase
    .from('athlete_agreements')
    .update(updates)
    .eq('id', agreement.id)

  revalidatePath(`/dashboard/athletes/${agreement.athlete_id}`)
  return { success: true }
}
