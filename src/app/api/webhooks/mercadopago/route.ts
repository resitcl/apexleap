import { NextResponse } from 'next/server'
import { reconcileMercadoPagoPayment, parsePaymentIdFromExternalReference } from '@/lib/mercadopago-reconcile'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMercadoPagoConfigFromSettings, verifyMercadoPagoSignature } from '@/lib/mercadopago'

function extractMpPaymentId(url: URL, body: Record<string, unknown> | null): string | null {
  const fromQuery = url.searchParams.get('data.id') || url.searchParams.get('id')
  if (fromQuery) return fromQuery
  const data = (body?.data ?? null) as { id?: unknown } | null
  if (data && (typeof data.id === 'string' || typeof data.id === 'number')) return String(data.id)
  return null
}

function isInternalError(result: { ok: boolean; reason?: string; internalError?: boolean }): boolean {
  return !result.ok && (result.internalError === true || result.reason === 'update_failed')
}

async function handle(req: Request) {
  const url = new URL(req.url)
  const ourPaymentId = parsePaymentIdFromExternalReference(url.searchParams.get('ext'))

  let body: Record<string, unknown> | null = null
  try { body = (await req.json()) as Record<string, unknown> } catch { body = null }

  const type =
    url.searchParams.get('type') ||
    url.searchParams.get('topic') ||
    (typeof body?.type === 'string' ? body.type : '')

  const mpPaymentId = extractMpPaymentId(url, body)

  if (ourPaymentId && mpPaymentId && (type === 'payment' || type === '')) {
    const supabase = createAdminClient()
    const { data: payment } = await supabase
      .from('payments')
      .select('club_id')
      .eq('id', ourPaymentId)
      .maybeSingle()

    if (payment) {
      const { data: clubRow } = await supabase
        .from('clubs')
        .select('settings')
        .eq('id', payment.club_id)
        .single()
      const mpConfig = resolveMercadoPagoConfigFromSettings((clubRow?.settings ?? {}) as Record<string, unknown>)
      if (mpConfig?.webhookSecret) {
        const dataId = mpPaymentId || url.searchParams.get('data.id') || ''
        const valid = verifyMercadoPagoSignature(mpConfig.webhookSecret, {
          xSignature: req.headers.get('x-signature'),
          xRequestId: req.headers.get('x-request-id'),
          dataId,
        })
        if (!valid) {
          return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 401 })
        }
      }
    }

    const result = await reconcileMercadoPagoPayment({ ourPaymentId, mpPaymentId })
    if (!result.ok && isInternalError(result)) {
      return NextResponse.json({ ok: false, reason: result.reason ?? 'internal_error' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  try {
    return await handle(req)
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    return await handle(req)
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
