import { NextResponse } from 'next/server'
import { reconcileFlowPaymentByToken } from '@/lib/flow-payment-reconcile'

function appBaseUrl(req: Request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envBase) return envBase.replace(/\/$/, '')
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  let paid = false
  try {
    const result = await reconcileFlowPaymentByToken(token)
    paid = Boolean(result && 'paid' in result && result.paid)
  } catch {
    paid = false
  }

  const target = new URL('/dashboard/athlete/payments', appBaseUrl(req))
  target.searchParams.set('flow', paid ? 'paid' : 'pending')
  return NextResponse.redirect(target)
}

