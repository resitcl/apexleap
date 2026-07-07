/**
 * Servicio de emails de ApexLeap usando Resend.
 * Documentación: https://resend.com/docs
 *
 * Cada email incluye el logo, nombre y color de marca del club correspondiente.
 * Sin dominio propio: los correos salen desde onboarding@resend.dev
 */

import { Resend } from 'resend'
import { normalizeClubPrimary, primaryForegroundForHex } from '@/lib/club-branding'

let resendClient: Resend | null = null

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY no configurada')
  if (!resendClient) resendClient = new Resend(key)
  return resendClient
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'ApexLeap <onboarding@resend.dev>'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://apexleap.vercel.app'

/**
 * Resuelve el reply-to para un correo.
 * Prioridad: email del club → variable global RESEND_REPLY_TO → sin reply-to
 */
function resolveReplyTo(clubEmail: string | null | undefined): string | undefined {
  if (clubEmail && clubEmail.trim()) return clubEmail.trim()
  if (process.env.RESEND_REPLY_TO?.trim()) return process.env.RESEND_REPLY_TO.trim()
  return undefined
}

// ---------------------------------------------------------------------------
// Tipos compartidos
// ---------------------------------------------------------------------------

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers de branding
// ---------------------------------------------------------------------------

function getClubBranding(primaryColor: string | null | undefined) {
  const bg = normalizeClubPrimary(primaryColor)        // color de marca del club
  const fg = primaryForegroundForHex(bg)               // blanco o negro según contraste
  return { bg, fg }
}

function buildHeader(clubName: string, logoUrl: string | null | undefined, brandBg: string, brandFg: string) {
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${clubName}" style="max-height:48px;max-width:160px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />`
    : ''

  return `
  <tr>
    <td style="background:${brandBg};padding:28px 40px;text-align:center;">
      ${logoHtml}
      <p style="margin:0;color:${brandFg};font-size:20px;font-weight:700;letter-spacing:-0.3px;">
        🥋 ${clubName}
      </p>
    </td>
  </tr>`
}

function buildFooter(clubName: string) {
  return `
  <tr>
    <td style="background:#f4f4f5;padding:20px 40px;border-top:1px solid #e4e4e7;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
        Este correo fue enviado automáticamente por <strong>${clubName}</strong> · ApexLeap
      </p>
    </td>
  </tr>`
}

/**
 * Convierte el texto de introducción personalizado (plantillas automáticas) en HTML:
 * el primer bloque es el encabezado y el resto párrafos. Escapa HTML y respeta saltos de línea.
 */
function renderIntroHtml(text: string): string {
  const blocks = text.split(/\n{2,}/).map((b) => escapeHtml(b.trim()).replace(/\n/g, "<br/>")).filter(Boolean)
  if (blocks.length === 0) return ""
  const [head, ...rest] = blocks
  return (
    `<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">${head}</h1>` +
    rest.map((p) => `<p style="margin:0 0 16px;font-size:16px;color:#52525b;line-height:1.6;">${p}</p>`).join("")
  )
}

// ---------------------------------------------------------------------------
// Template: Bienvenida / Invitación al alumno
// ---------------------------------------------------------------------------

function buildInvitationHtml(opts: {
  athleteName: string
  clubName: string
  clubSlug: string
  adminName?: string
  logoUrl?: string | null
  brandColor?: string | null
  introOverride?: string
  buttonOverride?: { text: string; url: string }
}) {
  const signInUrl = `${APP_URL}/${opts.clubSlug}/signin`
  const { bg, fg } = getClubBranding(opts.brandColor)
  const ctaUrl = opts.buttonOverride?.url || signInUrl
  const ctaText = opts.buttonOverride?.text || 'Acceder a mi cuenta →'

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a ${opts.clubName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          ${buildHeader(opts.clubName, opts.logoUrl, bg, fg)}

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${opts.introOverride ? renderIntroHtml(opts.introOverride) : `<h1 style="margin:0 0 16px;font-size:24px;color:#18181b;">
                ¡Bienvenido/a, ${opts.athleteName}!
              </h1>
              <p style="margin:0 0 16px;font-size:16px;color:#52525b;line-height:1.6;">
                ${opts.adminName ? `${opts.adminName} te` : 'Te'} ha registrado como alumno/a en <strong>${opts.clubName}</strong>.
              </p>
              <p style="margin:0 0 32px;font-size:16px;color:#52525b;line-height:1.6;">
                Entra a tu cuenta para ver tu plan de entrenamiento, estado de pagos y más.
              </p>`}

              <!-- CTA Button con color de marca -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${bg};border-radius:8px;text-align:center;">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:14px 28px;color:${fg};font-size:15px;font-weight:600;text-decoration:none;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:32px 0 0;font-size:13px;color:#a1a1aa;">
                Si el botón no funciona, copia este link en tu navegador:<br />
                <a href="${ctaUrl}" style="color:${bg};">${ctaUrl}</a>
              </p>
            </td>
          </tr>

          ${buildFooter(opts.clubName)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// ---------------------------------------------------------------------------
// Template: Recordatorio de pago
// ---------------------------------------------------------------------------

function buildPaymentReminderHtml(opts: {
  athleteName: string
  clubName: string
  clubSlug: string
  amount: number
  currency?: string
  dueDate?: string
  planName?: string
  paymentInstructions?: string
  logoUrl?: string | null
  brandColor?: string | null
  introOverride?: string
  buttonOverride?: { text: string; url: string }
}) {
  const currency = opts.currency ?? 'CLP'
  const formattedAmount = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(opts.amount)

  const paymentUrl = `${APP_URL}/${opts.clubSlug}/athlete`
  const ctaUrl = opts.buttonOverride?.url || paymentUrl
  const ctaText = opts.buttonOverride?.text || 'Ver mi cuenta →'
  const { bg, fg } = getClubBranding(opts.brandColor)

  const dueDateText = opts.dueDate
    ? `Fecha de vencimiento: <strong>${new Date(`${opts.dueDate}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>`
    : ''

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de pago – ${opts.clubName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          ${buildHeader(opts.clubName, opts.logoUrl, bg, fg)}

          <!-- Alert banner -->
          <tr>
            <td style="background:#fef3c7;padding:12px 40px;border-bottom:1px solid #fde68a;">
              <p style="margin:0;font-size:14px;color:#92400e;text-align:center;font-weight:600;">
                ⚠️ Tienes un pago pendiente
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${opts.introOverride ? renderIntroHtml(opts.introOverride) : `<h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">
                Hola, ${opts.athleteName}
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#52525b;line-height:1.6;">
                Te recordamos que tienes un pago pendiente en <strong>${opts.clubName}</strong>.
              </p>`}

              <!-- Payment card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    ${opts.planName ? `<p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Plan</p>
                    <p style="margin:0 0 16px;font-size:16px;color:#18181b;font-weight:600;">${opts.planName}</p>` : ''}
                    <p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Monto</p>
                    <p style="margin:0 0 ${opts.dueDate ? '16px' : '0'};font-size:28px;color:#18181b;font-weight:700;">${formattedAmount}</p>
                    ${dueDateText ? `<p style="margin:0;font-size:14px;color:#71717a;">${dueDateText}</p>` : ''}
                  </td>
                </tr>
              </table>

              ${opts.paymentInstructions ? `
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#1d4ed8;font-weight:600;">📋 Instrucciones de pago</p>
                <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.5;">${opts.paymentInstructions.replace(/\n/g, '<br/>')}</p>
              </div>
              ` : ''}

              <!-- CTA Button con color de marca -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${bg};border-radius:8px;text-align:center;">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:14px 28px;color:${fg};font-size:15px;font-weight:600;text-decoration:none;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:14px;color:#52525b;line-height:1.6;">
                Si ya realizaste el pago, puedes ignorar este correo. Si tienes alguna duda,
                contacta directamente a tu academia.
              </p>
            </td>
          </tr>

          ${buildFooter(opts.clubName)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// ---------------------------------------------------------------------------
// Template: Confirmación de pago
// ---------------------------------------------------------------------------

function buildPaymentConfirmationHtml(opts: {
  athleteName: string
  clubName: string
  clubSlug: string
  amount: number
  currency?: string
  planName?: string
  periodStart?: string
  periodEnd?: string
  nextBilling?: string
  logoUrl?: string | null
  brandColor?: string | null
  introOverride?: string
  buttonOverride?: { text: string; url: string }
}) {
  const currency = opts.currency ?? 'CLP'
  const formattedAmount = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(opts.amount)

  const paymentUrl = `${APP_URL}/${opts.clubSlug}/athlete`
  const ctaUrl = opts.buttonOverride?.url || paymentUrl
  const ctaText = opts.buttonOverride?.text || 'Ver mis pagos →'
  const { bg, fg } = getClubBranding(opts.brandColor)
  // DATE anclado a mediodía local para no correr el día por zona horaria.
  const fmt = (d?: string) =>
    d ? new Date(`${d}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const periodText = opts.periodStart && opts.periodEnd ? `${fmt(opts.periodStart)} — ${fmt(opts.periodEnd)}` : ''
  const nextText = fmt(opts.nextBilling)

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pago confirmado – ${opts.clubName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          ${buildHeader(opts.clubName, opts.logoUrl, bg, fg)}

          <!-- Success banner -->
          <tr>
            <td style="background:#dcfce7;padding:12px 40px;border-bottom:1px solid #bbf7d0;">
              <p style="margin:0;font-size:14px;color:#166534;text-align:center;font-weight:600;">
                ✅ Pago confirmado
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${opts.introOverride ? renderIntroHtml(opts.introOverride) : `<h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">
                ¡Gracias, ${opts.athleteName}!
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#52525b;line-height:1.6;">
                Recibimos tu pago en <strong>${opts.clubName}</strong>. Tu membresía está al día.
              </p>`}

              <!-- Payment card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    ${opts.planName ? `<p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Plan</p>
                    <p style="margin:0 0 16px;font-size:16px;color:#18181b;font-weight:600;">${opts.planName}</p>` : ''}
                    <p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Monto pagado</p>
                    <p style="margin:0 0 ${periodText || nextText ? '16px' : '0'};font-size:28px;color:#166534;font-weight:700;">${formattedAmount}</p>
                    ${periodText ? `<p style="margin:0 0 ${nextText ? '8px' : '0'};font-size:14px;color:#71717a;">Período cubierto: <strong style="color:#3f3f46;">${periodText}</strong></p>` : ''}
                    ${nextText ? `<p style="margin:0;font-size:14px;color:#71717a;">Próximo cobro: <strong style="color:#3f3f46;">${nextText}</strong></p>` : ''}
                  </td>
                </tr>
              </table>

              <!-- CTA Button con color de marca -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${bg};border-radius:8px;text-align:center;">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:14px 28px;color:${fg};font-size:15px;font-weight:600;text-decoration:none;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:14px;color:#52525b;line-height:1.6;">
                Este comprobante confirma tu pago. Si tienes alguna duda, contacta directamente a tu academia.
              </p>
            </td>
          </tr>

          ${buildFooter(opts.clubName)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// ---------------------------------------------------------------------------
// Template: Pago rechazado / no completado
// ---------------------------------------------------------------------------

function buildPaymentFailedHtml(opts: {
  athleteName: string
  clubName: string
  clubSlug: string
  amount: number
  currency?: string
  planName?: string
  logoUrl?: string | null
  brandColor?: string | null
  introOverride?: string
  buttonOverride?: { text: string; url: string }
}) {
  const currency = opts.currency ?? 'CLP'
  const formattedAmount = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(opts.amount)

  const paymentUrl = `${APP_URL}/${opts.clubSlug}/athlete`
  const ctaUrl = opts.buttonOverride?.url || paymentUrl
  const ctaText = opts.buttonOverride?.text || 'Reintentar pago →'
  const { bg, fg } = getClubBranding(opts.brandColor)

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pago no procesado – ${opts.clubName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          ${buildHeader(opts.clubName, opts.logoUrl, bg, fg)}

          <!-- Error banner -->
          <tr>
            <td style="background:#fee2e2;padding:12px 40px;border-bottom:1px solid #fecaca;">
              <p style="margin:0;font-size:14px;color:#991b1b;text-align:center;font-weight:600;">
                ⚠️ Tu pago no se pudo procesar
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${opts.introOverride ? renderIntroHtml(opts.introOverride) : `<h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">
                Hola, ${opts.athleteName}
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#52525b;line-height:1.6;">
                Intentamos procesar tu pago en <strong>${opts.clubName}</strong>, pero fue rechazado o no se completó.
              </p>`}

              <!-- Payment card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    ${opts.planName ? `<p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Plan</p>
                    <p style="margin:0 0 16px;font-size:16px;color:#18181b;font-weight:600;">${opts.planName}</p>` : ''}
                    <p style="margin:0 0 8px;font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Monto</p>
                    <p style="margin:0;font-size:28px;color:#18181b;font-weight:700;">${formattedAmount}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button con color de marca -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${bg};border-radius:8px;text-align:center;">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:14px 28px;color:${fg};font-size:15px;font-weight:600;text-decoration:none;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:14px;color:#52525b;line-height:1.6;">
                Puedes reintentar el pago desde tu cuenta. Si el problema persiste, contacta directamente a tu academia.
              </p>
            </td>
          </tr>

          ${buildFooter(opts.clubName)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// ---------------------------------------------------------------------------
// Funciones de envío públicas
// ---------------------------------------------------------------------------

/**
 * Envía un email de bienvenida/invitación a un alumno recién creado.
 */
export async function sendInvitationEmail(opts: {
  to: string
  athleteName: string
  clubName: string
  clubSlug: string
  adminName?: string
  logoUrl?: string | null
  brandColor?: string | null
  replyTo?: string | null
  subjectOverride?: string
  introOverride?: string
  buttonOverride?: { text: string; url: string }
}): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — email de invitación no enviado')
    return { success: false, error: 'RESEND_API_KEY no configurada' }
  }

  try {
    const replyTo = resolveReplyTo(opts.replyTo)
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: opts.subjectOverride?.trim() || `¡Bienvenido/a a ${opts.clubName}! 🥋`,
      html: buildInvitationHtml(opts),
    })

    if (error) {
      console.error('[email] Error al enviar invitación:', error)
      return { success: false, error: error.message }
    }

    console.log(`[email] Invitación enviada a ${opts.to} (id: ${data?.id})`)
    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[email] Excepción al enviar invitación:', message)
    return { success: false, error: message }
  }
}

/**
 * Envía un recordatorio de pago pendiente a un alumno.
 */
export async function sendPaymentReminderEmail(opts: {
  to: string
  athleteName: string
  clubName: string
  clubSlug: string
  amount: number
  currency?: string
  dueDate?: string
  planName?: string
  paymentInstructions?: string
  logoUrl?: string | null
  brandColor?: string | null
  replyTo?: string | null
  subjectOverride?: string
  introOverride?: string
  buttonOverride?: { text: string; url: string }
}): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — recordatorio de pago no enviado')
    return { success: false, error: 'RESEND_API_KEY no configurada' }
  }

  try {
    const replyTo = resolveReplyTo(opts.replyTo)
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: opts.subjectOverride?.trim() || `Recordatorio de pago – ${opts.clubName}`,
      html: buildPaymentReminderHtml(opts),
    })

    if (error) {
      console.error('[email] Error al enviar recordatorio:', error)
      return { success: false, error: error.message }
    }

    console.log(`[email] Recordatorio enviado a ${opts.to} (id: ${data?.id})`)
    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[email] Excepción al enviar recordatorio:', message)
    return { success: false, error: message }
  }
}

/**
 * Envía la confirmación de un pago recibido a un alumno.
 */
export async function sendPaymentConfirmationEmail(opts: {
  to: string
  athleteName: string
  clubName: string
  clubSlug: string
  amount: number
  currency?: string
  planName?: string
  periodStart?: string
  periodEnd?: string
  nextBilling?: string
  logoUrl?: string | null
  brandColor?: string | null
  replyTo?: string | null
  subjectOverride?: string
  introOverride?: string
  buttonOverride?: { text: string; url: string }
}): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — confirmación de pago no enviada')
    return { success: false, error: 'RESEND_API_KEY no configurada' }
  }

  try {
    const replyTo = resolveReplyTo(opts.replyTo)
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: opts.subjectOverride?.trim() || `Pago confirmado – ${opts.clubName}`,
      html: buildPaymentConfirmationHtml(opts),
    })

    if (error) {
      console.error('[email] Error al enviar confirmación:', error)
      return { success: false, error: error.message }
    }

    console.log(`[email] Confirmación enviada a ${opts.to} (id: ${data?.id})`)
    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[email] Excepción al enviar confirmación:', message)
    return { success: false, error: message }
  }
}

/**
 * Avisa a un alumno que su pago fue rechazado o no se completó por la pasarela.
 */
export async function sendPaymentFailedEmail(opts: {
  to: string
  athleteName: string
  clubName: string
  clubSlug: string
  amount: number
  currency?: string
  planName?: string
  logoUrl?: string | null
  brandColor?: string | null
  replyTo?: string | null
  subjectOverride?: string
  introOverride?: string
  buttonOverride?: { text: string; url: string }
}): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — aviso de pago rechazado no enviado')
    return { success: false, error: 'RESEND_API_KEY no configurada' }
  }

  try {
    const replyTo = resolveReplyTo(opts.replyTo)
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: opts.subjectOverride?.trim() || `Tu pago no se pudo procesar – ${opts.clubName}`,
      html: buildPaymentFailedHtml(opts),
    })

    if (error) {
      console.error('[email] Error al enviar aviso de pago rechazado:', error)
      return { success: false, error: error.message }
    }

    console.log(`[email] Aviso de pago rechazado enviado a ${opts.to} (id: ${data?.id})`)
    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[email] Excepción al enviar aviso de pago rechazado:', message)
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Template: Mensaje/comunicación genérica (módulo Comunicaciones)
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildBroadcastHtml(opts: {
  clubName: string
  bodyText: string
  logoUrl?: string | null
  brandColor?: string | null
}) {
  const { bg, fg } = getClubBranding(opts.brandColor)
  const bodyHtml = opts.bodyText
    .split('\n')
    .map((line) =>
      line.trim() === ''
        ? '<div style="height:10px;"></div>'
        : `<p style="margin:0 0 12px;font-size:16px;color:#3f3f46;line-height:1.6;">${escapeHtml(line)}</p>`,
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.clubName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          ${buildHeader(opts.clubName, opts.logoUrl, bg, fg)}
          <tr>
            <td style="padding:36px 40px;">
              ${bodyHtml}
            </td>
          </tr>
          ${buildFooter(opts.clubName)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Envía un mensaje/comunicación genérica a un alumno (módulo Comunicaciones).
 */
export async function sendBroadcastEmail(opts: {
  to: string
  subject: string
  bodyText: string
  clubName: string
  logoUrl?: string | null
  brandColor?: string | null
  replyTo?: string | null
}): Promise<SendEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY no configurada' }
  }
  try {
    const replyTo = resolveReplyTo(opts.replyTo)
    const { data, error } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: opts.to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: opts.subject,
      html: buildBroadcastHtml(opts),
    })
    if (error) return { success: false, error: error.message }
    return { success: true, id: data?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
