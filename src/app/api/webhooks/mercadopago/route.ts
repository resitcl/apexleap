import { NextResponse } from 'next/server'
import { reconcileMercadoPagoPayment, parsePaymentIdFromExternalReference } from '@/lib/mercadopago-reconcile'

function extractMpPaymentId(url: URL, body: Record<string, unknown> | null): string | null {
  const fromQuery = url.searchParams.get('data.id') || url.searchParams.get('id')
  if (fromQuery) return fromQuery
  const data = (body?.data ?? null) as { id?: unknown } | null
  if (data && (typeof data.id === 'string' || typeof data.id === 'number')) return String(data.id)
  return null
}

async function handle(req: Request) {
  try {
    const url = new URL(req.url)
    // `ext` (pay_<ourPaymentId>) lo embebimos nosotros en notification_url al crear la preferencia.
    const ourPaymentId = parsePaymentIdFromExternalReference(url.searchParams.get('ext'))

    let body: Record<string, unknown> | null = null
    try { body = (await req.json()) as Record<string, unknown> } catch { body = null }

    const type =
      url.searchParams.get('type') ||
      url.searchParams.get('topic') ||
      (typeof body?.type === 'string' ? body.type : '')

    const mpPaymentId = extractMpPaymentId(url, body)

    // Solo notificaciones de pago; la confirmación real es autoritativa vía getPayment.
    if (ourPaymentId && mpPaymentId && (type === 'payment' || type === '')) {
      await reconcileMercadoPagoPayment({ ourPaymentId, mpPaymentId })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

export async function POST(req: Request) { return handle(req) }
export async function GET(req: Request) { return handle(req) }
