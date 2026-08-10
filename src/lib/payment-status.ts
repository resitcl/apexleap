/**
 * Semántica de color única para todo lo que sea "estado de pago".
 *
 * El `--primary` del dashboard se reemplaza por el color de marca del club
 * (ver `clubThemeBrandingVars`), así que un club con marca roja veía "Al día" y
 * "Pagado" en rojo — el mismo color que la mora. Los estados de cobranza usan
 * colores fijos: verde = al día, ámbar = por cobrar / esperando, rojo = vencido.
 *
 * Módulo PURO (sin dependencias de servidor): se usa en RSC y en componentes cliente.
 */

// ─────────────────────────────────────────────────────────────
// Estado de cobranza de un ALUMNO (derivado de cuotas + suscripción)
// ─────────────────────────────────────────────────────────────

export type AthletePaymentStatus = 'overdue' | 'pending' | 'due' | 'current' | 'none'

/** Orden de prioridad para chips/filtros: primero lo que exige acción. */
export const ATHLETE_PAYMENT_STATUSES: AthletePaymentStatus[] = [
  'overdue',
  'due',
  'pending',
  'current',
  'none',
]

export interface PaymentStatusTone {
  /** Etiqueta corta (fila de la tabla). */
  label: string
  /** Etiqueta larga (filtros). */
  filterLabel: string
  /** Texto secundario bajo la etiqueta. */
  hint: string
  /** Color del texto. */
  text: string
  /** Fondo del ícono/pastilla. */
  bg: string
  /** Punto de color (dot). */
  dot: string
  /** Estilo del chip de filtro cuando está activo. */
  active: string
}

export const ATHLETE_PAYMENT_STATUS_META: Record<AthletePaymentStatus, PaymentStatusTone> = {
  current: {
    label: 'Al día',
    filterLabel: 'Al día',
    hint: 'Período cubierto',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/15',
    dot: 'bg-emerald-500',
    active: 'border-emerald-500 bg-emerald-500 text-white',
  },
  due: {
    label: 'Por cobrar',
    filterLabel: 'Por cobrar',
    hint: 'Cuota del mes',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/15',
    dot: 'bg-amber-500',
    active: 'border-amber-500 bg-amber-500 text-white',
  },
  pending: {
    label: 'Pendiente',
    filterLabel: 'Pendiente de validar',
    hint: 'Esperando validación',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/15',
    dot: 'bg-amber-500',
    active: 'border-amber-500 bg-amber-500 text-white',
  },
  overdue: {
    label: 'Vencido',
    filterLabel: 'Con atraso',
    hint: 'Cobranza',
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/15',
    dot: 'bg-red-500',
    active: 'border-red-500 bg-red-500 text-white',
  },
  none: {
    label: 'Sin plan',
    filterLabel: 'Sin plan activo',
    hint: 'Sin suscripción',
    text: 'text-muted-foreground',
    bg: 'bg-muted',
    dot: 'bg-muted-foreground/40',
    active: 'border-foreground/40 bg-foreground/80 text-background',
  },
}

export function isAthletePaymentStatus(value: string | null | undefined): value is AthletePaymentStatus {
  return !!value && (ATHLETE_PAYMENT_STATUSES as string[]).includes(value)
}

interface DerivableAthlete {
  payments?: Array<{ status: string }> | null
  subscriptions?: Array<{ status: string; next_billing_date?: string | null }> | null
}

/**
 * Deriva el estado de cobranza de un alumno con la MISMA regla que muestra la tabla:
 * "Al día" solo si la suscripción activa tiene el próximo cobro en el futuro (período cubierto).
 * Sin esa condición, un alumno sin cuotas generadas aparecía "Al día" sin pagar hace meses.
 *
 * @param todayYmd fecha de hoy en formato `YYYY-MM-DD`
 */
export function deriveAthletePaymentStatus(athlete: DerivableAthlete, todayYmd: string): AthletePaymentStatus {
  const payments = athlete.payments ?? []
  if (payments.some((p) => p.status === 'overdue')) return 'overdue'
  if (payments.some((p) => p.status === 'pending')) return 'pending'

  const activeSub = (athlete.subscriptions ?? []).find((s) => s.status === 'active')
  if (!activeSub) return 'none'

  const nextBilling = activeSub.next_billing_date ?? null
  return nextBilling && nextBilling > todayYmd ? 'current' : 'due'
}

// ─────────────────────────────────────────────────────────────
// Estado de una CUOTA individual (payments.status)
// ─────────────────────────────────────────────────────────────

export interface PaymentRowTone {
  label: string
  text: string
  dot: string
  bg: string
}

export const PAYMENT_ROW_STATUS_META: Record<string, PaymentRowTone> = {
  paid: {
    label: 'Pagado',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500/15',
  },
  pending: {
    label: 'Pendiente',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    bg: 'bg-amber-500/15',
  },
  overdue: {
    label: 'Vencido',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    bg: 'bg-red-500/15',
  },
  failed: {
    label: 'Fallido',
    text: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-600',
    bg: 'bg-red-500/15',
  },
  cancelled: {
    label: 'Cancelado',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground/40',
    bg: 'bg-muted',
  },
}

export function paymentRowTone(status: string): PaymentRowTone {
  return (
    PAYMENT_ROW_STATUS_META[status] ?? {
      label: status,
      text: 'text-muted-foreground',
      dot: 'bg-muted-foreground/40',
      bg: 'bg-muted',
    }
  )
}
