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
      <div className="space-y-8 pb-12 pt-1">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-3">
            <Repeat2 className="w-10 h-10 text-primary" /> Mi Suscripción
          </h1>
          <p className="text-sm md:text-base text-muted-foreground/80 mt-3 max-w-xl font-medium">
            Gestiona tu plan activo y detalles de facturación en la plataforma.
          </p>
        </div>
        <Card className="rounded-2xl border-dashed border-white/[0.05] bg-muted/5">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
              <Repeat2 className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium text-lg">No tienes una suscripción activa.</p>
            <Link href="/dashboard/athlete/select-plan">
              <Button className="font-bold tracking-widest uppercase text-xs">Elegir un plan</Button>
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
    <div className="space-y-8 pb-12 pt-1">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-3">
          <Repeat2 className="w-10 h-10 text-primary" /> Mi Suscripción
        </h1>
        <p className="text-sm md:text-base text-muted-foreground/80 mt-3 max-w-xl font-medium">
          Gestiona tu plan y suscripción principal del club.
        </p>
      </div>

      <Card className="rounded-2xl border border-white/[0.04] bg-card shadow-sm overflow-hidden relative">
        <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-primary/80 to-primary/20" />
        <CardHeader className="pb-6 border-b border-border/30 bg-muted/10 px-6 sm:px-8 pt-8 flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-2xl font-black tracking-tight uppercase flex items-center gap-3 text-foreground">
            {plan?.name ?? 'Plan Personal'}
          </CardTitle>
          <Badge className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 ${statusCfg.variant === "default" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {statusCfg.label}
          </Badge>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Precio</span>
              </div>
              <p className="text-2xl font-black tracking-tight text-foreground">
                ${plan?.price?.toLocaleString('es-CL') ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground/60 font-medium">
                Por ciclo
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Repeat2 className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Ciclo</span>
              </div>
              <p className="text-xl font-bold tracking-tight text-foreground capitalize mt-1">
                {BILLING_LABEL[plan?.billing_cycle ?? ''] ?? '—'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Inicio</span>
              </div>
              <p className="text-lg font-bold tracking-tight text-foreground mt-1.5">
                {sub.start_date ? new Date(sub.start_date).toLocaleDateString('es-CL', { day: "numeric", month: "long", year: "numeric" }) : '—'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Vencimiento</span>
              </div>
              <p className="text-lg font-bold tracking-tight text-foreground mt-1.5">
                {sub.end_date ? new Date(sub.end_date).toLocaleDateString('es-CL', { day: "numeric", month: "long", year: "numeric" }) : 'Sin vencimiento'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
