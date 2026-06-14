import { NextResponse } from 'next/server'
import { reconcileFlowPaymentByToken } from '@/lib/flow-payment-reconcile'

export async function POST(req: Request) {
  try {
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
    // Pasa todos los parámetros (incl. la firma `s`) para verificar el origen Flow.
    await reconcileFlowPaymentByToken(token, { webhookParams: params })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const params: Record<string, string> = {}
    url.searchParams.forEach((v, k) => { params[k] = v })
    const token = params.token ?? ''
    await reconcileFlowPaymentByToken(token, { webhookParams: params })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
