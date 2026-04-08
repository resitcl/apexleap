import { NextResponse } from 'next/server'
import { reconcileFlowPaymentByToken } from '@/lib/flow-payment-reconcile'

function appBaseUrl(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envBase) return envBase.replace(/\/$/, '')
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

async function handleReturn(req: Request) {
  const url = new URL(req.url)
  let token = url.searchParams.get('token') ?? ''

  if (!token) {
    try {
      const contentType = req.headers.get('content-type') || ''
      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const form = await req.formData()
        token = String(form.get('token') ?? '')
      } else {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
        token = typeof body.token === 'string' ? body.token : ''
      }
    } catch { /* use empty token */ }
  }

  let paid = false
  try {
    const result = await reconcileFlowPaymentByToken(token)
    paid = Boolean(result && 'paid' in result && result.paid)
  } catch {
    paid = false
  }

  const target = new URL('/dashboard/athlete/payments', appBaseUrl(req))
  target.searchParams.set('flow', paid ? 'paid' : 'failed')
  if (token) target.searchParams.set('token', token)
  return NextResponse.redirect(target, { status: 303 })
}

export async function GET(req: Request) {
  return handleReturn(req)
}

export async function POST(req: Request) {
  return handleReturn(req)
}
