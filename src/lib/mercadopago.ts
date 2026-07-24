import crypto from 'crypto'

/**
 * Integración server-to-server con MercadoPago (Checkout Pro).
 * La confirmación de pago es autoritativa vía GET /v1/payments/{id} con el Access Token
 * del club (un atacante no puede falsificarla); la firma del webhook es defensa en profundidad.
 */

const MP_API_BASE = 'https://api.mercadopago.com'

export type MercadoPagoConfig = {
  /** Access Token (secreto) — credencial usada para todas las llamadas server-to-server. */
  accessToken: string
  /** Public Key (no secreta). */
  publicKey: string
  sandbox: boolean
  /** Secreto opcional para validar la firma del webhook (configurado en el panel de MP). */
  webhookSecret: string | null
}

type MpGatewayCfg = {
  enabled?: boolean
  sandbox?: boolean
  api_key?: string
  secret_key?: string
  webhook_secret?: string
}

function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

/** Resuelve la config de MercadoPago desde `clubs.settings`. Null si no está habilitado o sin Access Token. */
export function resolveMercadoPagoConfigFromSettings(
  settings: Record<string, unknown> | null | undefined,
): MercadoPagoConfig | null {
  const ps = (settings?.payment_settings ?? null) as { mercadopago?: MpGatewayCfg } | null
  const mp = ps?.mercadopago ?? {}
  if (mp.enabled !== true) return null
  const accessToken = nonEmpty(mp.secret_key) ? mp.secret_key.trim() : ''
  if (!accessToken) return null
  return {
    accessToken,
    publicKey: nonEmpty(mp.api_key) ? mp.api_key.trim() : '',
    sandbox: mp.sandbox !== false,
    webhookSecret: nonEmpty(mp.webhook_secret) ? mp.webhook_secret.trim() : null,
  }
}

type CreatePreferenceInput = {
  externalReference: string
  title: string
  amount: number
  payerEmail: string
  backUrl: string
  notificationUrl: string
}

/** Crea una preferencia de Checkout Pro y devuelve el id + URL de checkout (init_point). */
export async function createMercadoPagoPreference(config: MercadoPagoConfig, input: CreatePreferenceInput) {
  const res = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      items: [
        {
          title: input.title.slice(0, 250),
          quantity: 1,
          unit_price: Math.round(input.amount),
          currency_id: 'CLP',
        },
      ],
      external_reference: input.externalReference,
      payer: { email: input.payerEmail },
      back_urls: {
        success: input.backUrl,
        failure: input.backUrl,
        pending: input.backUrl,
      },
      auto_return: 'approved',
      notification_url: input.notificationUrl,
    }),
  })
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok || !json) {
    const message =
      (json && typeof json.message === 'string' && json.message) || `MercadoPago respondió ${res.status}`
    throw new Error(message)
  }
  const id = typeof json.id === 'string' ? json.id : String(json.id ?? '')
  // Usar SIEMPRE init_point. El ambiente (prueba vs producción) lo determinan las credenciales
  // (TEST-… vs APP_USR-…), no la URL. sandbox_init_point es legacy y, con credenciales
  // productivas, redirige a un checkout de prueba que queda colgado en mercadopago.cl.
  // Guía oficial: https://github.com/mercadopago/sdk-js/discussions/60
  const initPoint = typeof json.init_point === 'string' ? json.init_point : ''
  if (!id || !initPoint) throw new Error('MercadoPago no devolvió init_point de checkout')
  return { id, initPoint, raw: json }
}

/** Consulta autoritativa del estado de un pago en MercadoPago. */
export async function getMercadoPagoPayment(config: MercadoPagoConfig, mpPaymentId: string) {
  const res = await fetch(`${MP_API_BASE}/v1/payments/${encodeURIComponent(mpPaymentId)}`, {
    headers: { Authorization: `Bearer ${config.accessToken}` },
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok || !json) {
    throw new Error(`MercadoPago getPayment respondió ${res.status}`)
  }
  return json
}

export function mpStatusIsApproved(status: unknown): boolean {
  return typeof status === 'string' && status.trim().toLowerCase() === 'approved'
}

/**
 * Verifica la firma del webhook de MercadoPago (header `x-signature`: "ts=..,v1=..").
 * Manifest: `id:<dataId>;request-id:<xRequestId>;ts:<ts>;`. HMAC-SHA256 hex con el webhook secret.
 */
export function verifyMercadoPagoSignature(
  secret: string,
  params: { xSignature: string | null; xRequestId: string | null; dataId: string | null },
): boolean {
  const { xSignature, xRequestId, dataId } = params
  if (!xSignature || !dataId) return false
  let ts = ''
  let v1 = ''
  for (const part of xSignature.split(',')) {
    const [k, val] = part.split('=').map((s) => s?.trim())
    if (k === 'ts') ts = val ?? ''
    else if (k === 'v1') v1 = val ?? ''
  }
  if (!ts || !v1) return false
  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId ?? ''};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(v1, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}
