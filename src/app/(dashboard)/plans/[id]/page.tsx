import Link from "next/link"
import { notFound } from "next/navigation"
import { getPlanById } from "@/lib/actions/plans"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ChevronLeft, Pencil, Users, Clock, Building2,
  DollarSign, Eye, EyeOff, CheckCircle2, XCircle
} from "lucide-react"

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Mensual', quarterly: 'Trimestral',
  semiannual: 'Semestral', annual: 'Anual', single: 'Pago único',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PlanDetailPage({ params }: PageProps) {
  const { id } = await params

  let plan
  try {
    plan = await getPlanById(id)
  } catch {
    notFound()
  }

  const subscriptions = (plan.subscriptions ?? []) as Array<{
    id: string; status: string; athlete_id: string;
    athletes: { name: string } | null
  }>
  const activeSubs = subscriptions.filter((s) => s.status === 'active')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/plans">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Planes
          </Button>
        </Link>
        <div className="flex-1" />
        <Link href={`/dashboard/plans/${id}/edit`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="w-4 h-4" />
            Editar
          </Button>
        </Link>
      </div>

      {/* Plan header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{plan.name}</h1>
                {!plan.is_active && <Badge variant="secondary">Inactivo</Badge>}
                {!plan.is_visible ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <EyeOff className="w-3 h-3" /> Oculto
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Eye className="w-3 h-3" /> Visible
                  </Badge>
                )}
              </div>
              {plan.description && (
                <p className="text-muted-foreground">{plan.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                ${Number(plan.price).toLocaleString('es-CL')}
              </p>
              <p className="text-sm text-muted-foreground">
                / {CYCLE_LABELS[plan.billing_cycle] ?? plan.billing_cycle}
              </p>
              {plan.enrollment_fee > 0 && (
                <p className="text-sm text-muted-foreground">
                  + ${Number(plan.enrollment_fee).toLocaleString('es-CL')} matrícula
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Config */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" /> Sesiones
              </span>
              <span className="font-medium">
                {plan.session_limit ? `${plan.session_limit} / ${CYCLE_LABELS[plan.billing_cycle]?.toLowerCase()}` : 'Ilimitadas'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Multisede
              </span>
              {plan.multi_sede
                ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                : <XCircle className="w-4 h-4 text-muted-foreground" />}
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Días de gracia</span>
              <span className="font-medium">{plan.grace_period_days} días</span>
            </div>
            {plan.content_level && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nivel contenido</span>
                  <Badge variant="outline" className="capitalize">{plan.content_level}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Suscriptores activos ({activeSubs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin suscriptores activos</p>
            ) : (
              <div className="space-y-2">
                {activeSubs.slice(0, 8).map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="text-xs">
                        {sub.athletes?.name?.slice(0, 2).toUpperCase() ?? '??'}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/dashboard/athletes/${sub.athlete_id}`}
                      className="text-sm hover:underline"
                    >
                      {sub.athletes?.name ?? 'Alumno'}
                    </Link>
                  </div>
                ))}
                {activeSubs.length > 8 && (
                  <p className="text-xs text-muted-foreground">
                    +{activeSubs.length - 8} más...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue estimate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ingresos estimados este ciclo</p>
              <p className="text-2xl font-bold">
                ${(activeSubs.length * Number(plan.price)).toLocaleString('es-CL')}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeSubs.length} suscriptores × ${Number(plan.price).toLocaleString('es-CL')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
