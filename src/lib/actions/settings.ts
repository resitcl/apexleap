'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { CLUB_LOGO_MAX_BYTES } from '@/lib/constants'
import { getClubId, getClubMembershipRole, assertClubAdmin, assertClubCapability, type CoachPermissions } from '@/lib/actions/club-context'

const clubSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
  sport_type: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().or(z.literal('')),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  timezone: z.string().default('America/Santiago'),
  use_brand_primary_for_ui: z.boolean().optional(),
})

export type ClubInput = z.infer<typeof clubSchema>


export async function getClubSettings() {
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Sube un logo del club a Storage y actualiza `logo_url`.
 */
export async function uploadClubLogo(formData: FormData) {
  const membership = await getClubMembershipRole()
  if (membership !== 'admin' && membership !== 'admin_athlete') {
    throw new Error('Solo un administrador del club puede cambiar el logo.')
  }

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) throw new Error('Selecciona un archivo de imagen')

  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen (PNG, JPEG, WebP, etc.)')
  }
  if (file.size > CLUB_LOGO_MAX_BYTES) {
    throw new Error(`La imagen no puede superar ${Math.round(CLUB_LOGO_MAX_BYTES / (1024 * 1024))} MB`)
  }

  const extFromType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const ext = extFromType[file.type] ?? (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 4)
  const path = `${clubId}/logo-${Date.now()}.${ext}`

  const bucket = 'club-assets'
  await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: CLUB_LOGO_MAX_BYTES,
  })

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) throw new Error('Error al subir el logo: ' + upErr.message)

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
  const publicUrl = urlData.publicUrl

  const { error: dbErr } = await supabase
    .from('clubs')
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', clubId)

  if (dbErr) throw new Error(dbErr.message)

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  const { data: clubRow } = await supabase.from('clubs').select('slug').eq('id', clubId).single()
  const slug = (clubRow as { slug?: string } | null)?.slug
  if (slug) {
    revalidatePath(`/${slug}/signin`)
    revalidatePath(`/${slug}/signup`)
  }

  return publicUrl
}

export async function updateClubSettings(input: Partial<ClubInput>) {
  await assertClubCapability('club_config')
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { use_brand_primary_for_ui: brandUiFlag, ...rest } = input

  const columnUpdate: Record<string, unknown> = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined)
  )
  columnUpdate.updated_at = new Date().toISOString()

  // Persistido en JSON para no requerir migración SQL en `clubs`.
  if (brandUiFlag !== undefined) {
    const { data: club } = await supabase.from('clubs').select('settings').eq('id', clubId).single()
    const currentSettings = (club?.settings ?? {}) as Record<string, unknown>
    columnUpdate.settings = { ...currentSettings, use_brand_primary_for_ui: brandUiFlag }
  }

  const { data, error } = await supabase
    .from('clubs')
    .update(columnUpdate)
    .eq('id', clubId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  const slug = (data as { slug?: string })?.slug
  if (slug) {
    revalidatePath(`/${slug}/signin`)
    revalidatePath(`/${slug}/signup`)
  }
  return data
}

export async function updatePaymentSettings(paymentSettings: {
  enabled_methods: string[]
  bank_info: {
    bank_name: string; account_type: string; account_number: string
    account_holder: string; rut: string; email: string
    /** Ej. +56912345678 — para que el atleta envíe el comprobante por WhatsApp */
    whatsapp_phone?: string
  }
  flow: { enabled: boolean; sandbox: boolean; api_key: string; secret_key: string; commerce_code: string; checkout_url?: string }
  webpay: { enabled: boolean; sandbox: boolean; api_key: string; secret_key: string; commerce_code: string; checkout_url?: string }
  mercadopago: { enabled: boolean; sandbox: boolean; api_key: string; secret_key: string; commerce_code: string; checkout_url?: string }
  khipu: { enabled: boolean; sandbox: boolean; api_key: string; secret_key: string; commerce_code: string; checkout_url?: string }
  cash_instructions: string
  billing_policy?: 'accumulate' | 'suspend'
  reminders_enabled?: boolean
}) {
  const membership = await getClubMembershipRole()
  if (membership !== 'admin' && membership !== 'admin_athlete') {
    throw new Error('Solo un administrador del club puede configurar medios de pago y credenciales.')
  }

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: club } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', clubId)
    .single()

  const currentSettings = (club?.settings ?? {}) as Record<string, unknown>

  const updatedSettings = {
    ...currentSettings,
    payment_settings: paymentSettings,
    bank_info: paymentSettings.bank_info,
  }

  const { error } = await supabase
    .from('clubs')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
  return { success: true }
}

/**
 * Guarda las plantillas automáticas (subject/body/enabled por caso de uso) en
 * `clubs.settings.auto_templates`. Solo admin. Merge sobre lo existente.
 */
export async function saveAutoTemplates(
  templates: Record<string, { subject: string; body: string; enabled: boolean; buttonText: string; buttonUrl: string }>,
) {
  const membership = await getClubMembershipRole()
  if (membership !== 'admin' && membership !== 'admin_athlete') {
    throw new Error('Solo un administrador del club puede editar las plantillas automáticas.')
  }

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: club } = await supabase.from('clubs').select('settings').eq('id', clubId).single()
  const currentSettings = (club?.settings ?? {}) as Record<string, unknown>

  const updatedSettings = { ...currentSettings, auto_templates: templates }

  const { error } = await supabase
    .from('clubs')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', clubId)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function deleteClub(confirmName: string) {
  const membership = await getClubMembershipRole()
  if (membership !== 'admin') {
    throw new Error('Solo el administrador principal puede eliminar el club.')
  }

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: club } = await supabase
    .from('clubs').select('name').eq('id', clubId).single()

  if (!club) throw new Error('Club no encontrado')
  if (club.name.trim().toLowerCase() !== confirmName.trim().toLowerCase()) {
    throw new Error('El nombre no coincide. Escribe el nombre exacto del club para confirmar.')
  }

  const { error } = await supabase.from('clubs').delete().eq('id', clubId)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  return { deleted: true }
}

/**
 * Configura qué capacidades (normalmente solo-admin) puede ejercer un coach en este club.
 * Solo un administrador del club puede cambiar estos permisos.
 */
export async function updateCoachPermissions(perms: CoachPermissions) {
  await assertClubAdmin()
  const clubId = await getClubId()
  const supabase = createAdminClient()

  const { data: club } = await supabase.from('clubs').select('settings').eq('id', clubId).single()
  const current = (club?.settings ?? {}) as Record<string, unknown>
  const updated = {
    ...current,
    coach_permissions: {
      finances: !!perms.finances,
      rules: !!perms.rules,
      club_config: !!perms.club_config,
      team: !!perms.team,
    },
  }

  const { error } = await supabase
    .from('clubs')
    .update({ settings: updated, updated_at: new Date().toISOString() })
    .eq('id', clubId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { ok: true as const }
}
