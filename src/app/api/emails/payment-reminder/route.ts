/**
 * POST /api/emails/payment-reminder
 *
 * Envía un recordatorio de pago a uno o varios alumnos con pagos pendientes.
 * Solo puede ser llamado por admins del club.
 *
 * Body (JSON):
 *   - paymentIds: string[]   → IDs de pagos específicos a notificar
 *   - athleteId?: string     → Alternativa: notificar todos los pagos pendientes de un alumno
 *   - sendAll?: boolean      → Alternativa: notificar todos los pagos pendientes/vencidos del club
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPaymentReminderEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  // 1. Autenticación
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 2. Obtener el club del usuario autenticado
  const { data: userClub, error: clubErr } = await supabase
    .from('user_clubs')
    .select('club_id, role, clubs(id, name, slug, logo_url, primary_color, settings)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['admin', 'coach', 'admin_athlete'])
    .limit(1)
    .single()

  if (clubErr || !userClub) {
    return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
  }

  const clubId = userClub.club_id
  const club = userClub.clubs as {
    id: string
    name: string
    slug: string
    logo_url?: string | null
    primary_color?: string | null
    settings?: Record<string, unknown>
  }
  const clubName = club.name
  const clubSlug = club.slug
  const clubLogoUrl = club.logo_url ?? null
  const clubBrandColor = club.primary_color ?? null

  // Instrucciones de pago del club (si están configuradas)
  const paymentInstructions =
    (club.settings?.payment_instructions as string | undefined) ?? undefined

  // 3. Parsear el body
  let body: { paymentIds?: string[]; athleteId?: string; sendAll?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  // 4. Construir la consulta de pagos a notificar
  let paymentsQuery = supabase
    .from('payments')
    .select('id, amount, due_date, athlete_id, athletes(id, name, email), plans(name)')
    .eq('club_id', clubId)
    .in('status', ['pending', 'overdue'])

  if (body.paymentIds && body.paymentIds.length > 0) {
    paymentsQuery = paymentsQuery.in('id', body.paymentIds)
  } else if (body.athleteId) {
    paymentsQuery = paymentsQuery.eq('athlete_id', body.athleteId)
  } else if (body.sendAll) {
    // Solo los del mes actual + vencidos, máx 100 para evitar abusos
    paymentsQuery = paymentsQuery.limit(100)
  } else {
    return NextResponse.json(
      { error: 'Debes indicar paymentIds, athleteId o sendAll: true' },
      { status: 400 },
    )
  }

  const { data: payments, error: paymentsErr } = await paymentsQuery
  if (paymentsErr) {
    return NextResponse.json({ error: paymentsErr.message }, { status: 500 })
  }

  if (!payments || payments.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, message: 'No hay pagos pendientes' })
  }

  // 5. Enviar emails
  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const payment of payments) {
    // El join devuelve el objeto athlete dentro del payment
    const athlete = payment.athletes as { id: string; name: string; email: string | null } | null
    const plan = payment.plans as { name: string } | null

    if (!athlete?.email) {
      skipped++
      continue
    }

    const result = await sendPaymentReminderEmail({
      to: athlete.email,
      athleteName: athlete.name,
      clubName,
      clubSlug,
      amount: payment.amount,
      dueDate: payment.due_date ?? undefined,
      planName: plan?.name ?? undefined,
      paymentInstructions,
      logoUrl: clubLogoUrl,
      brandColor: clubBrandColor,
    })

    if (result.success) {
      sent++
    } else {
      skipped++
      errors.push(`${athlete.name}: ${result.error}`)
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total: payments.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `${sent} recordatorio(s) enviado(s)`,
  })
}
