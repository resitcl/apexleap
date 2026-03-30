export const dynamic = "force-dynamic"

import Link from "next/link"
import { getPlans } from "@/lib/actions/plans"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Users, Clock, Building2, EyeOff, CreditCard, Sparkles, ChevronRight } from "lucide-react"
import { EditPlanButton } from "@/components/plans/EditPlanButton"
import {
  DashboardPage,
  DashboardPageHeader,
  DashboardMetricCard,
  DashboardEmptyState,
} from "@/components/ui/dashboard-kit"

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
  const totalRevenue = plans.reduce((acc, p) => {
    const subs = (p.subscriptions ?? []) as Array<{ status: string }>
    const activeCount = subs.filter((s) => s.status === 'active').length
    return acc + (activeCount * Number(p.price))
  }, 0)

  return (
    <DashboardPage>
      {/* ── PREMIUM HEADER ── */}
      <DashboardPageHeader
        icon={<CreditCard className="w-10 h-10" />}
        title="Planes"
        subtitle={`Gestiona los planes de membresía y suscripciones de tu club. ${activePlans.length} plan${activePlans.length !== 1 ? 'es' : ''} activo${activePlans.length !== 1 ? 's' : ''}.`}
        actions={
          <Link href="/dashboard/plans/new">
            <Button className="gap-2 h-11 px-5">
              <Plus className="w-4 h-4" />
              Nuevo Plan
            </Button>
          </Link>
        }
      />

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardMetricCard
          icon={<CreditCard className="w-4 h-4" />}
          label="Planes Activos"
          value={activePlans.length}
          tone="default"
        />
        <DashboardMetricCard
          icon={<Users className="w-4 h-4" />}
          label="Suscriptores"
          value={totalSubscribers}
          tone="success"
        />
        <DashboardMetricCard
          icon={<Sparkles className="w-4 h-4" />}
          label="Ingreso Recurrente"
          value={`$${totalRevenue.toLocaleString('es-CL')}`}
          description="estimado mensual"
          tone="info"
        />
        <DashboardMetricCard
          icon={<Building2 className="w-4 h-4" />}
          label="Total Planes"
          value={plans.length}
          tone="default"
        />
      </div>

      {/* ── PLANS GRID ── */}
      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-destructive font-medium">{error}</p>
        </div>
      ) : plans.length === 0 ? (
        <DashboardEmptyState
          icon={<Building2 className="w-8 h-8" />}
          title="Sin planes creados"
          description="Crea el primer plan de membresía para que tus atletas puedan suscribirse."
          action={
            <Link href="/dashboard/plans/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Crear Plan
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const allSubs = (plan.subscriptions ?? []) as Array<{ status: string; athletes: { id: string; name: string } | null }>
            const activeSubs = allSubs.filter((s) => s.status === 'active')
            const activeAthletes = activeSubs.map((s) => s.athletes).filter(Boolean) as { id: string; name: string }[]

            return (
              <div
                key={plan.id}
                className={`group rounded-2xl bg-[#111111] border border-white/[0.04] p-6 flex flex-col hover:border-primary/30 transition-all ${!plan.is_active ? 'opacity-50' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black tracking-tight truncate group-hover:text-primary transition-colors">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-3xl font-black text-primary">
                        ${Number(plan.price).toLocaleString('es-CL')}
                      </span>
                      <span className="text-sm text-muted-foreground/60 font-medium">
                        / {CYCLE_LABELS[plan.billing_cycle] ?? plan.billing_cycle}
                      </span>
                    </div>
                    {plan.enrollment_fee > 0 && (
                      <p className="text-xs text-muted-foreground/50 mt-1">
                        + ${Number(plan.enrollment_fee).toLocaleString('es-CL')} matrícula
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!plan.is_visible && (
                      <Badge className="text-[9px] uppercase font-black tracking-wider bg-white/[0.06] text-muted-foreground border-0 gap-1">
                        <EyeOff className="w-3 h-3" /> Oculto
                      </Badge>
                    )}
                    {!plan.is_active && (
                      <Badge className="text-[9px] uppercase font-black tracking-wider bg-amber-500/10 text-amber-400 border-0">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Description */}
                {plan.description && (
                  <p className="text-sm text-muted-foreground/70 font-medium mb-4 line-clamp-2">{plan.description}</p>
                )}

                {/* Features */}
                <div className="space-y-2.5 mb-4 flex-1">
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="font-medium">{activeSubs.length} suscriptor{activeSubs.length !== 1 ? 'es' : ''} activo{activeSubs.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <span className="font-medium">
                      {plan.session_limit
                        ? `${plan.session_limit} sesiones/${CYCLE_LABELS[plan.billing_cycle]?.toLowerCase() ?? 'ciclo'}`
                        : 'Sesiones ilimitadas'}
                    </span>
                  </div>

                  {plan.multi_sede && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <span className="font-medium">Acceso multisede</span>
                    </div>
                  )}
                </div>

                {/* Active athletes avatars */}
                {activeAthletes.length > 0 && (
                  <div className="pt-4 border-t border-white/[0.04] mb-4">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50 mb-2">
                      Suscriptores
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {activeAthletes.slice(0, 6).map((a) => (
                        <Link key={a.id} href={`/dashboard/athletes/${a.id}`} title={a.name}>
                          <Avatar className="w-8 h-8 hover:ring-2 hover:ring-primary transition-all border border-white/[0.08]">
                            <AvatarFallback className="text-[10px] font-black bg-white/[0.04]">
                              {a.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                      ))}
                      {activeAthletes.length > 6 && (
                        <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-muted-foreground/60">
                          +{activeAthletes.length - 6}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/[0.04]">
                  <Link href={`/dashboard/plans/${plan.id}`} className="flex-1">
                    <Button variant="outline" className="w-full h-10 gap-2 text-xs font-bold uppercase tracking-widest border-white/[0.08] hover:bg-white/[0.04]">
                      Ver detalle <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <EditPlanButton plan={plan} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardPage>
  )
}
