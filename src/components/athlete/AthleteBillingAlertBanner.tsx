import Link from 'next/link'
import { AlertTriangle, CreditCard, CalendarX, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PAYMENTS_HREF = '/dashboard/athlete/payments'

type BillingAlertVariant = {
  tone: 'red' | 'amber'
  icon: typeof AlertTriangle
  title: string
  description: string
  cta: string
}

/**
 * Aviso destacado para el atleta cuando hay un pago vencido y/o su suscripción
 * está vencida o inactiva. Reutiliza el estado calculado en el dashboard a
 * partir de la suscripción activa (getMySubscriptionStatus) y los pagos
 * vencidos (getAthletePaymentStatus). Presentacional: si todo está al día,
 * no renderiza nada.
 */
export function AthleteBillingAlertBanner({
  overdueCount,
  totalOverdue,
  hasActiveSubscription,
  daysUntilExpiry,
}: {
  overdueCount: number
  totalOverdue: number
  hasActiveSubscription: boolean
  daysUntilExpiry: number | null
}) {
  const hasOverdue = overdueCount > 0
  const subExpired =
    hasActiveSubscription && daysUntilExpiry !== null && daysUntilExpiry <= 0
  const noSubscription = !hasActiveSubscription

  if (!hasOverdue && !subExpired && !noSubscription) return null

  // Prioridad: pago vencido (acción más urgente) → suscripción vencida → sin plan.
  let variant: BillingAlertVariant
  if (hasOverdue) {
    const amount = `$${Number(totalOverdue).toLocaleString('es-CL')}`
    variant = {
      tone: 'red',
      icon: AlertTriangle,
      title: `Tienes ${overdueCount} pago${overdueCount > 1 ? 's' : ''} vencido${overdueCount > 1 ? 's' : ''}`,
      description: `Regulariza ${totalOverdue > 0 ? `${amount} pendiente${overdueCount > 1 ? 's' : ''}` : 'tu situación'} para seguir entrenando sin restricciones.`,
      cta: 'Pagar ahora',
    }
  } else if (subExpired) {
    variant = {
      tone: 'red',
      icon: CalendarX,
      title: 'Tu suscripción está vencida',
      description: 'Renueva tu plan para mantener tu acceso al club y a tus entrenamientos.',
      cta: 'Renovar ahora',
    }
  } else {
    variant = {
      tone: 'amber',
      icon: CreditCard,
      title: 'No tienes una suscripción activa',
      description: 'Activa un plan para acceder a todas las funcionalidades del club.',
      cta: 'Ver planes',
    }
  }

  const Icon = variant.icon
  const isRed = variant.tone === 'red'

  return (
    <Link href={PAYMENTS_HREF} className="block group">
      <div
        role="alert"
        className={`relative rounded-2xl border px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
          isRed
            ? 'border-destructive/30 bg-destructive/10 hover:bg-destructive/[0.15]'
            : 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/[0.15]'
        }`}
      >
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isRed ? 'bg-destructive/20' : 'bg-amber-500/20'
          }`}
        >
          <Icon className={`w-6 h-6 ${isRed ? 'text-destructive' : 'text-amber-500'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-black tracking-tight uppercase ${
              isRed ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {variant.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{variant.description}</p>
        </div>

        {/* span (no <a>/<button>) para no anidar elementos interactivos dentro del Link */}
        <Button
          asChild
          size="sm"
          variant={isRed ? 'destructive' : 'default'}
          className="shrink-0 w-full sm:w-auto"
        >
          <span>
            {variant.cta}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Button>
      </div>
    </Link>
  )
}
