import Image from 'next/image'
import { Clock, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  clubName: string
  primaryColor?: string | null
  logoUrl?: string | null
  planName?: string | null
}

/**
 * Pantalla completa mientras el admin no confirma transferencia o efectivo (suscripción pending_payment).
 */
export function PendingAdminPaymentScreen({ clubName, primaryColor, logoUrl, planName }: Props) {
  const brand = primaryColor ?? '#6366f1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4">
      <div className="text-center space-y-6 max-w-lg w-full">
        <div className="flex items-center justify-center gap-3 mb-2">
          {logoUrl ? (
            <Image src={logoUrl} alt={clubName} width={48} height={48} className="rounded-xl object-contain" />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: brand }}
            >
              {clubName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-lg">{clubName}</span>
        </div>

        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-amber-100 dark:bg-amber-500/20">
          <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Pago pendiente de confirmación</h2>
          <p className="text-muted-foreground">
            Tu inscripción está registrada, pero <strong>el administrador debe confirmar</strong> tu pago
            (transferencia, efectivo u otro medio que no se acredita al instante).
          </p>
        </div>

        <Card className="text-left">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Sin acceso al portal</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mientras el pago no sea confirmado, no podrás usar horarios, asistencia ni el resto de la plataforma.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{planName ? `Plan: ${planName}` : 'Plan registrado'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cuando el club confirme tu pago, entrarás automáticamente al portal. Puedes cerrar esta página y volver más tarde.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Si crees que es un error, contacta al administrador de <strong style={{ color: brand }}>{clubName}</strong>.
        </p>
      </div>
    </div>
  )
}
