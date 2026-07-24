/**
 * Reporte de errores client-side a /api/client-errors (visible en Vercel Logs).
 *
 * Sin dependencias, nunca lanza, anti-loop. Usa navigator.sendBeacon primero porque el
 * crash típico ocurre con la página descargándose por una navegación pendiente (checkout
 * MercadoPago): un fetch normal se cancela, el beacon sobrevive al unload.
 *
 * No envía PII: solo mensaje, stack, ruta (sin origin) y user-agent.
 */

const ENDPOINT = '/api/client-errors'
const MAX_PER_LOAD = 5

let sent = 0
const seen = new Set<string>()

export interface ClientErrorPayload {
  message?: unknown
  stack?: string
  digest?: string
  boundary?: string
  type?: string
  source?: string
  line?: number
  col?: number
}

export function reportClientError(p: ClientErrorPayload): void {
  try {
    if (typeof window === 'undefined') return

    const message = String(p.message ?? '').slice(0, 500)
    if (!message) return

    const stack = (p.stack ?? '').slice(0, 4000)
    // Anti-loop: jamás reportar fallos del propio reporter/endpoint.
    if (message.includes('client-errors') || stack.includes('client-errors')) return

    const key = `${p.type ?? ''}|${message}`
    if (seen.has(key) || sent >= MAX_PER_LOAD) return
    seen.add(key)
    sent++

    const body = JSON.stringify({
      message,
      stack,
      digest: p.digest,
      boundary: p.boundary,
      type: p.type,
      source: p.source,
      line: p.line,
      col: p.col,
      url: location.pathname + location.search, // sin origin, sin PII
      ua: navigator.userAgent.slice(0, 300),
      ts: new Date().toISOString(),
    })

    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return

    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* el reporter nunca debe lanzar */
  }
}
