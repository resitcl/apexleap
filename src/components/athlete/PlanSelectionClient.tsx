'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader2, Zap } from 'lucide-react'
import { enrollInPlan } from '@/lib/actions/athlete-enrollment'

const BILLING_LABEL: Record<string, string> = {
  monthly: 'mes',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  annual: 'año',
  single: 'pago único',
}

interface Plan {
  id: string
  name: string
  description: string | null
  price: number
  billing_cycle: string
  session_limit: number | null
  enrollment_fee: number | null
  is_visible: boolean
}

interface Props {
  plans: Plan[]
}

export function PlanSelectionClient({ plans }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSelect(planId: string) {
    setLoading(planId)
    try {
      await enrollInPlan(planId)
      toast.success('¡Inscripción exitosa! Bienvenido al club.')
      router.push('/dashboard/athlete')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al inscribirse')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan, i) => {
        const isPopular = i === Math.floor(plans.length / 2)
        const isLoading = loading === plan.id

        return (
          <Card
            key={plan.id}
            className={`relative flex flex-col transition-all hover:shadow-md ${
              isPopular ? 'border-primary shadow-sm ring-1 ring-primary/20' : ''
            }`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground gap-1">
                  <Zap className="w-3 h-3" />
                  Popular
                </Badge>
              </div>
            )}

            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  ${plan.price.toLocaleString('es-CL')}
                </span>
                <span className="text-muted-foreground text-sm ml-1">
                  / {BILLING_LABEL[plan.billing_cycle] ?? plan.billing_cycle}
                </span>
              </div>

              {plan.enrollment_fee && plan.enrollment_fee > 0 ? (
                <p className="text-xs text-muted-foreground mb-3">
                  + ${plan.enrollment_fee.toLocaleString('es-CL')} matrícula
                </p>
              ) : null}

              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  Acceso a entrenamientos
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  Check-in QR de asistencia
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  Portal personal
                </li>
                {plan.session_limit ? (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    {plan.session_limit} sesiones por ciclo
                  </li>
                ) : (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    Sesiones ilimitadas
                  </li>
                )}
              </ul>

              <Button
                onClick={() => handleSelect(plan.id)}
                disabled={!!loading}
                className="w-full"
                variant={isPopular ? 'default' : 'outline'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Inscribiendo...
                  </>
                ) : (
                  'Seleccionar plan'
                )}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
