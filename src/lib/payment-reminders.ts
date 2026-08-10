/**
 * Registro por alumno de los cobros enviados (tabla `payment_reminder_logs`, migración 038).
 *
 * Todo es best-effort: si la migración todavía no corrió en la base, escribir no rompe el envío
 * (el correo ya salió) y leer devuelve vacío (la UI simplemente no muestra el dato). Así el
 * deploy del código no queda acoplado al momento en que se aplica la migración.
 */

import { createAdminClient } from '@/lib/supabase/admin'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

export type ReminderSource = 'manual' | 'cron'

export interface PaymentReminderEntry {
  athleteId: string
  paymentId?: string | null
  source: ReminderSource
  status: 'sent' | 'failed'
  amount?: number | null
  dueDate?: string | null
  error?: string | null
  sentBy?: string | null
}

/** Último cobro enviado a un alumno. */
export interface LastReminder {
  sentAt: string
  source: ReminderSource
  status: 'sent' | 'failed'
  /** Envíos exitosos acumulados para la cuota/deuda vigente (cuántas veces se insistió). */
  sentCount: number
}

/** Guarda un envío de cobro. Nunca lanza: el correo ya se envió, esto es solo la bitácora. */
export async function logPaymentReminder(
  supabase: SupabaseAdmin,
  clubId: string,
  entry: PaymentReminderEntry,
): Promise<void> {
  try {
    await supabase.from('payment_reminder_logs').insert({
      club_id: clubId,
      athlete_id: entry.athleteId,
      payment_id: entry.paymentId ?? null,
      channel: 'email',
      source: entry.source,
      status: entry.status,
      amount: entry.amount ?? null,
      due_date: entry.dueDate ?? null,
      error: entry.error ?? null,
      sent_by: entry.sentBy ?? null,
    })
  } catch {
    // Tabla aún no migrada u otro fallo: no bloquea el flujo de cobranza.
  }
}

/**
 * Último cobro enviado a cada alumno del club, indexado por `athlete_id`.
 * Devuelve `{}` si la tabla todavía no existe.
 */
export async function getLastRemindersByAthlete(
  supabase: SupabaseAdmin,
  clubId: string,
  athleteIds?: string[],
): Promise<Record<string, LastReminder>> {
  try {
    let query = supabase
      .from('payment_reminder_logs')
      .select('athlete_id, source, status, created_at')
      .eq('club_id', clubId)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (athleteIds && athleteIds.length > 0) {
      const unique = [...new Set(athleteIds.filter(Boolean))]
      if (unique.length === 0) return {}
      query = query.in('athlete_id', unique)
    }

    const { data, error } = await query
    if (error || !data) return {}

    // Las filas vienen de la más reciente a la más antigua: la primera de cada alumno es la
    // última enviada, y el resto solo suma al contador de insistencias.
    const out: Record<string, LastReminder> = {}
    for (const row of data) {
      const id = row.athlete_id as string
      if (!id) continue
      const existing = out[id]
      if (existing) {
        existing.sentCount += 1
        continue
      }
      out[id] = {
        sentAt: row.created_at as string,
        source: ((row.source as string) === 'cron' ? 'cron' : 'manual') as ReminderSource,
        status: 'sent',
        sentCount: 1,
      }
    }
    return out
  } catch {
    return {}
  }
}

/** Días completos transcurridos desde un envío, respecto de `nowMs`. */
export function daysSince(iso: string, nowMs: number): number {
  return Math.floor((nowMs - new Date(iso).getTime()) / 86400000)
}

/** Texto corto para la fila: "Cobro hoy", "Cobro hace 3d", "Cobro 12 ago". */
export function formatReminderAge(iso: string, nowMs: number): string {
  const days = daysSince(iso, nowMs)
  if (days <= 0) return 'Cobro hoy'
  if (days === 1) return 'Cobro ayer'
  if (days < 30) return `Cobro hace ${days}d`
  return `Cobro ${new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`
}
