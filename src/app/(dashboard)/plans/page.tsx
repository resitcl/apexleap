export const dynamic = "force-dynamic"

import Link from "next/link"
import { getPlans } from "@/lib/actions/plans"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Clock, Building2, Eye, EyeOff } from "lucide-react"

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
  single: 'Pago único',
}

export default async function PlansPage() {
  let plans: Awaited<ReturnType<typeof getPlans>> = []
  let error: string | null = null

  try {
    plans = await getPlans()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error al cargar planes'
  }

  const activePlans = plans.filter((p) => p.is_active)
  const totalSubscribers = plans.reduce((acc, p) => {
    const subs = (p.subscriptions ?? []) as Array<{ status: string }>
    return acc + subs.filter((s) => s.status === 'active').length
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planes</h1>
          <p className="text-muted-foreground">
            {activePlans.length} plan{activePlans.length !== 1 ? 'es' : ''} activo{activePlans.length !== 1 ? 's' : ''} · {totalSubscribers} suscriptores
          </p>
        </div>
        <Link href="/dashboard/plans/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Plan
          </Button>
        </Link>
      </div>

      {/* Plans Grid */}
      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
        </Card>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Sin planes creados</h3>
            <p className="text-muted-foreground mb-4">Crea el primer plan de membresía de tu club</p>
            <Link href="/dashboard/plans/new">
              <Button>Crear Plan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const activeSubs = ((plan.subscriptions ?? []) as Array<{ status: string }>)
              .filter((s) => s.status === 'active').length

            return (
              <Card key={plan.id} className={`flex flex-col ${!plan.is_active ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="flex gap-1">
                      {!plan.is_visible && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <EyeOff className="w-3 h-3" />
                          Oculto
                        </Badge>
                      )}
                      {!plan.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className="text-3xl font-bold">
                      ${Number(plan.price).toLocaleString('es-CL')}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">
                      / {CYCLE_LABELS[plan.billing_cycle] ?? plan.billing_cycle}
                    </span>
                  </div>
                  {plan.enrollment_fee > 0 && (
                    <p className="text-sm text-muted-foreground">
                      + ${Number(plan.enrollment_fee).toLocaleString('es-CL')} matrícula
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex-1 space-y-3">
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{activeSubs} suscriptores activos</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {plan.session_limit
                          ? `${plan.session_limit} sesiones/${CYCLE_LABELS[plan.billing_cycle]?.toLowerCase() ?? 'ciclo'}`
                          : 'Sesiones ilimitadas'}
                      </span>
                    </div>

                    {plan.multi_sede && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>Acceso multisede</span>
                      </div>
                    )}

                    {plan.grace_period_days > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{plan.grace_period_days} días de gracia post-vencimiento</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="gap-2">
                  <Link href={`/dashboard/plans/${plan.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">Ver detalle</Button>
                  </Link>
                  <Link href={`/dashboard/plans/${plan.id}/edit`}>
                    <Button variant="ghost" size="sm">Editar</Button>
                  </Link>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
