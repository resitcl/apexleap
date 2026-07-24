import { NextRequest, NextResponse } from 'next/server'

/**
 * Recibe reportes de errores client-side y los escribe a los logs del servidor
 * (Vercel → Logs, filtrar por "[client-error]"). Siempre responde 204 sin cuerpo:
 * es telemetría best-effort, no debe reintentarse ni filtrar información.
 */

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 30 // best-effort por instancia serverless; suficiente para diagnóstico

let windowStart = 0
let count = 0

export async function POST(req: NextRequest) {
  try {
    const now = Date.now()
    if (now - windowStart > WINDOW_MS) {
      windowStart = now
      count = 0
    }
    if (++count > MAX_PER_WINDOW) return new NextResponse(null, { status: 204 })

    const raw = (await req.text()).slice(0, 10_000)
    let data: Record<string, unknown>
    try {
      data = JSON.parse(raw) as Record<string, unknown>
    } catch {
      data = { message: raw }
    }

    const s = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined)
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

    console.error(
      '[client-error]',
      JSON.stringify({
        message: s(data.message, 500),
        stack: s(data.stack, 4000),
        digest: s(data.digest, 100),
        boundary: s(data.boundary, 50),
        type: s(data.type, 50),
        source: s(data.source, 300),
        line: num(data.line),
        col: num(data.col),
        url: s(data.url, 300),
        ua: s(data.ua, 300),
        ts: s(data.ts, 40),
      }),
    )
  } catch {
    /* la telemetría nunca debe fallar la request */
  }
  return new NextResponse(null, { status: 204 })
}
