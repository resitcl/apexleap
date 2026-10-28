import { NextResponse } from 'next/server'
import { runBillingCronForAllClubs } from '@/lib/billing-cron'

/**
 * Cron diario de facturación: emite cuotas, sincroniza vencidos,
 * cierra intentos de pasarela abandonados y expira suscripciones.
 *
 * La ruta es pública para Clerk (Vercel Cron no trae sesión), así que CRON_SECRET es su única
 * protección: Authorization: Bearer <secret> (lo envía Vercel Cron) o header x-cron-secret.
 * Sin CRON_SECRET configurado falla cerrado: cualquiera podría disparar cobros y reenviar
 * recordatorios por correo.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/billing] CRON_SECRET no configurado; se rechaza la ejecución')
    return NextResponse.json({ ok: false, reason: 'cron_secret_not_configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const headerSecret = req.headers.get('x-cron-secret') ?? ''
  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
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
