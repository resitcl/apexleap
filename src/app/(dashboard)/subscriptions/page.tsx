import Link from "next/link"
import { getSubscriptions, getSubscriptionStats } from "@/lib/actions/subscriptions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Users, TrendingUp, PauseCircle, XCircle } from "lucide-react"
import { SubscriptionStatusButton } from "@/components/subscriptions/SubscriptionStatusButton"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Activa",     variant: "default" },
  paused:    { label: "Pausada",    variant: "secondary" },
  cancelled: { label: "Cancelada",  variant: "destructive" },
  expired:   { label: "Expirada",   variant: "outline" },
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: "/mes", quarterly: "/trim.", semiannual: "/sem.",
  annual: "/año", single: "único",
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  let subs: Awaited<ReturnType<typeof getSubscriptions>>["subscriptions"] = []
  let total = 0
  let stats = { active: 0, paused: 0, cancelled: 0, expired: 0, mrr: 0 }

  try {
    const [result, statsResult] = await Promise.all([
      getSubscriptions({ status: params.status, page, limit: 25 }),
      getSubscriptionStats(),
    ])
    subs = result.subscriptions
    total = result.total
    stats = statsResult
  } catch {
    // show empty state
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suscripciones</h1>
          <p className="text-muted-foreground">{total} registros</p>
        </div>
        <Link href="/dashboard/subscriptions/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Asignar Plan
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activas</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">suscriptores vigentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR estimado</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Math.round(stats.mrr).toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground">ingreso mensual recurrente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pausadas</CardTitle>
            <PauseCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.paused}</div>
            <p className="text-xs text-muted-foreground">en pausa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">canceladas / expiradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[undefined, "active", "paused", "cancelled", "expired"].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/dashboard/subscriptions?status=${s}` : "/dashboard/subscriptions"}
          >
            <Badge
              variant={params.status === s || (!params.status && !s) ? "default" : "outline"}
              className="cursor-pointer"
            >
              {s ? STATUS_CONFIG[s]?.label : "Todas"}
            </Badge>
          </Link>
        ))}
      </div>

      {/* List */}
      {subs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin suscripciones</h3>
            <p className="text-muted-foreground mb-4">Asigna un plan a tus alumnos</p>
            <Link href="/dashboard/subscriptions/new">
              <Button>Asignar Plan</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {subs.map((sub) => {
            const athlete = sub.athletes as { id: string; name: string; photo_url: string | null } | null
            const plan = sub.plans as { id: string; name: string; price: number; billing_cycle: string } | null
            const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.cancelled

            return (
              <Card key={sub.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm font-semibold">
                        {athlete?.name?.slice(0, 2).toUpperCase() ?? "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {athlete && (
                          <Link href={`/dashboard/athletes/${athlete.id}`} className="font-semibold hover:underline">
                            {athlete.name}
                          </Link>
                        )}
                        <span className="text-muted-foreground text-sm">·</span>
                        {plan && (
                          <Link href={`/dashboard/plans/${plan.id}`} className="text-sm text-muted-foreground hover:underline">
                            {plan.name}
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Desde {new Date(sub.start_date).toLocaleDateString("es-CL")}</span>
                        {sub.end_date && <span>Hasta {new Date(sub.end_date).toLocaleDateString("es-CL")}</span>}
                        {sub.auto_renew && <span className="text-green-600">↺ Auto-renovación</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {plan && (
                        <span className="font-bold">
                          ${Number(plan.price).toLocaleString("es-CL")}
                          <span className="text-xs font-normal text-muted-foreground ml-0.5">
                            {CYCLE_LABELS[plan.billing_cycle] ?? ""}
                          </span>
                        </span>
                      )}
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <SubscriptionStatusButton subscriptionId={sub.id} currentStatus={sub.status as "active" | "paused" | "cancelled" | "expired"} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
