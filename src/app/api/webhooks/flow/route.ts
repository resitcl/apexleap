import { NextResponse } from 'next/server'
import { reconcileFlowPaymentByToken } from '@/lib/flow-payment-reconcile'

export async function POST(req: Request) {
  try {
    let token = ''
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      token = String(form.get('token') ?? '')
    } else {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
      token = typeof body.token === 'string' ? body.token : ''
    }
    if (!token) {
      const url = new URL(req.url)
      token = url.searchParams.get('token') ?? ''
    }
    await reconcileFlowPaymentByToken(token, { trustWebhook: true })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token') ?? ''
    await reconcileFlowPaymentByToken(token, { trustWebhook: true })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
