export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import Link from "next/link"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Repeat2, Calendar, CreditCard } from "lucide-react"

const BILLING_LABEL: Record<string, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  single: "Pago único",
}

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Activa",    variant: "default" },
  paused:    { label: "Pausada",   variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  expired:   { label: "Expirada",  variant: "outline" },
}

export default async function AthleteSubscriptionPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const subStatus = await getMySubscriptionStatus().catch(() => null)

  if (!subStatus?.hasAthleteProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tu perfil de atleta aún no ha sido vinculado.</p>
      </div>
    )
  }

  if (!subStatus.hasActiveSubscription || !subStatus.subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mi Suscripción</h1>
          <p className="text-muted-foreground">Gestiona tu plan y suscripción</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <Repeat2 className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No tienes una suscripción activa.</p>
            <Link href="/dashboard/athlete/select-plan">
              <Button>Elegir un plan</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sub = subStatus.subscription
  const plan = sub.plans as unknown as { id: string; name: string; price: number; billing_cycle: string } | null
  const statusCfg = STATUS_LABEL[sub.status] ?? STATUS_LABEL.active

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi Suscripción</h1>
        <p className="text-muted-foreground">Gestiona tu plan y suscripción</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{plan?.name ?? 'Plan'}</CardTitle>
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Precio</p>
                <p className="font-semibold">
                  ${plan?.price?.toLocaleString('es-CL') ?? '—'} / {BILLING_LABEL[plan?.billing_cycle ?? ''] ?? plan?.billing_cycle ?? '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="font-semibold">
                  {sub.start_date ? new Date(sub.start_date).toLocaleDateString('es-CL') : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Vencimiento</p>
                <p className="font-semibold">
                  {sub.end_date ? new Date(sub.end_date).toLocaleDateString('es-CL') : 'Sin vencimiento'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Repeat2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Ciclo</p>
                <p className="font-semibold">{BILLING_LABEL[plan?.billing_cycle ?? ''] ?? '—'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
