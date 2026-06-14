import crypto from 'crypto'

export type FlowConfig = {
  apiKey: string
  secretKey: string
  sandbox: boolean
}

type FlowCreateParams = {
  commerceOrder: string
  subject: string
  currency: 'CLP'
  amount: number
  email: string
  urlConfirmation: string
  urlReturn: string
}

type FlowAnyResponse = Record<string, unknown>

function normalizeBaseUrl(sandbox: boolean): string {
  return sandbox ? 'https://sandbox.flow.cl/api' : 'https://www.flow.cl/api'
}

function nonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function resolveFlowConfigFromSettings(settings: Record<string, unknown> | null | undefined): FlowConfig | null {
  const ps = (settings?.payment_settings ?? null) as { flow?: Record<string, unknown> } | null
  const flow = ps?.flow ?? {}
  const enabled = flow.enabled === true
  const apiKey = typeof flow.api_key === 'string' ? flow.api_key.trim() : ''
  const secretKey = typeof flow.secret_key === 'string' ? flow.secret_key.trim() : ''
  const sandbox = flow.sandbox !== false
  if (!enabled || !apiKey || !secretKey) return null
  return { apiKey, secretKey, sandbox }
}

function signFlowParams(secretKey: string, params: Record<string, string>): string {
  const raw = Object.keys(params)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex')
}

/**
 * Verifica la firma HMAC (`s`) de un callback de Flow recomputándola sobre el resto de
 * parámetros y comparándola en tiempo constante. Devuelve false si falta `s` o no coincide.
 */
export function verifyFlowSignature(secretKey: string, params: Record<string, string>): boolean {
  const provided = params.s
  if (typeof provided !== 'string' || provided.length === 0) return false
  const rest: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (k === 's') continue
    rest[k] = v
  }
  const expected = signFlowParams(secretKey, rest)
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(provided, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

async function postFlow(config: FlowConfig, path: string, params: Record<string, string>): Promise<FlowAnyResponse> {
  const payload = { ...params, apiKey: config.apiKey }
  const signature = signFlowParams(config.secretKey, payload)
  const body = new URLSearchParams({ ...payload, s: signature })
  const res = await fetch(`${normalizeBaseUrl(config.sandbox)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => null)) as FlowAnyResponse | null
  if (!res.ok) {
    const message =
      (json && typeof json.message === 'string' && json.message) ||
      `Flow respondió ${res.status}`
    throw new Error(message)
  }
  return json ?? {}
}

export async function createFlowPayment(config: FlowConfig, input: FlowCreateParams) {
  const response = await postFlow(config, '/payment/create', {
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    currency: input.currency,
    amount: String(input.amount),
    email: input.email,
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
  })
  const token = typeof response.token === 'string' ? response.token : ''
  const url = typeof response.url === 'string' ? response.url : ''
  if (!token || !url) throw new Error('Flow no devolvió token/url de checkout')
  const checkoutUrl = url.includes('token=') ? url : `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  return { token, url, checkoutUrl, raw: response }
}

export async function getFlowPaymentStatus(config: FlowConfig, token: string) {
  return postFlow(config, '/payment/getStatus', { token })
}

export function flowStatusIsPaid(status: unknown): boolean {
  if (typeof status === 'number') return status === 2
  if (typeof status === 'string') {
    const s = status.trim().toLowerCase()
    return s === '2' || s === 'paid' || s === 'pagado'
  }
  return false
}

/** Estado terminal de fracaso en Flow: 3 = rechazado, 4 = anulado. */
export function flowStatusIsFailed(status: unknown): boolean {
  if (typeof status === 'number') return status === 3 || status === 4
  if (typeof status === 'string') {
    const s = status.trim().toLowerCase()
    return s === '3' || s === '4' || s === 'rejected' || s === 'rechazado' || s === 'canceled' || s === 'cancelled' || s === 'anulado'
  }
  return false
}

