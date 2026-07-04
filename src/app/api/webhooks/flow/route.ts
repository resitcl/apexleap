import { NextResponse } from 'next/server'
import { reconcileFlowPaymentByToken } from '@/lib/flow-payment-reconcile'

function isInternalError(result: { ok: boolean; reason?: string; internalError?: boolean }): boolean {
  return !result.ok && (result.internalError === true || result.reason === 'update_failed')
}

async function handle(req: Request) {
  const params: Record<string, string> = {}
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    for (const [k, v] of form.entries()) params[k] = String(v)
  } else {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    for (const [k, v] of Object.entries(body)) params[k] = String(v)
  }
  const url = new URL(req.url)
  url.searchParams.forEach((v, k) => { if (!(k in params)) params[k] = v })
  const token = params.token ?? ''

  const result = await reconcileFlowPaymentByToken(token, {
    webhookParams: params,
    requireSignature: true,
  })

  if (result.ok === false && result.reason === 'invalid_signature') {
    return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 401 })
  }
  if (!result.ok && isInternalError(result)) {
    return NextResponse.json({ ok: false, reason: result.reason ?? 'internal_error' }, { status: 500 })
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
