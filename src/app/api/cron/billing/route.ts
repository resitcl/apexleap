import { NextResponse } from 'next/server'
import { runBillingCronForAllClubs } from '@/lib/billing-cron'

/**
 * Cron diario de facturación: emite cuotas, sincroniza vencidos,
 * cierra intentos de pasarela abandonados y expira suscripciones.
 *
 * Proteger con CRON_SECRET en Authorization: Bearer <secret>
 * o header x-cron-secret.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization') ?? ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const headerSecret = req.headers.get('x-cron-secret') ?? ''
    if (bearer !== secret && headerSecret !== secret) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await runBillingCronForAllClubs()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'cron_failed'
    return NextResponse.json({ ok: false, reason: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
