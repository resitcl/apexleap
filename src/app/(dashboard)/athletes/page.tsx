export const dynamic = "force-dynamic"

import Link from "next/link"
import { getAthletes } from "@/lib/actions/athletes"
import { getPlans } from "@/lib/actions/plans"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus, Search } from "lucide-react"
import { AthletesSearch } from "@/components/athletes/AthletesSearch"
import { HealthStatusBadge } from "@/components/athletes/HealthStatusBadge"
import { ExportAthletesButton } from "@/components/athletes/ExportAthletesButton"

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    health?: string
    planId?: string
    subStatus?: string
    page?: string
    sort?: string
  }>
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const sort = params.sort ?? ""

  let athletes: Awaited<ReturnType<typeof getAthletes>>["athletes"] = []
  let allAthletes: Awaited<ReturnType<typeof getAthletes>>["athletes"] = []
  let total = 0
  let error: string | null = null
  let plans: { id: string; name: string }[] = []

  try {
    const filterParams = {
      search: params.search,
      status: params.status,
      healthStatus: params.health,
      planId: params.planId,
      subscriptionStatus: params.subStatus,
      sort: sort || undefined,
    }
    const [result, allResult, plansData] = await Promise.all([
      getAthletes({ ...filterParams, page, limit: 20 }),
      getAthletes({ ...filterParams, page: 1, limit: 1000 }),
      getPlans(),
    ])
    athletes = result.athletes
    allAthletes = allResult.athletes
    total = result.total
    plans = plansData.map((p) => ({ id: p.id, name: p.name }))
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar alumnos"
  }

  const statusCounts = {
    active: athletes.filter((a) => a.status === "active").length,
    injured: athletes.filter((a) => a.health_status === "injured").length,
    overdue: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alumnos</h1>
          <p className="text-muted-foreground">{total} registrados en total</p>
        </div>
        <div className="flex gap-2">
          <ExportAthletesButton athletes={allAthletes} />
          <Link href="/dashboard/athletes/new">
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Nuevo Alumno
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-2xl font-bold">{statusCounts.active}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lesionados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-2xl font-bold">{statusCounts.injured}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Con Deuda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-2xl font-bold">{statusCounts.overdue}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <AthletesSearch />
          {(params.search || params.status || params.health || params.planId || params.subStatus || sort) && (
            <Link href="/dashboard/athletes"
              className="text-xs text-muted-foreground hover:text-foreground underline shrink-0">
              ✕ Limpiar filtros
            </Link>
          )}
        </div>
        {plans.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-foreground font-medium">Plan:</span>
            <Link href={`/dashboard/athletes?${new URLSearchParams({ ...(params.search ? { search: params.search } : {}), ...(params.status ? { status: params.status } : {}), ...(params.health ? { health: params.health } : {}) }).toString()}`}>
              <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                !params.planId ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
              }`}>Todos</button>
            </Link>
            {plans.map((plan) => (
              <Link key={plan.id} href={`/dashboard/athletes?${new URLSearchParams({ ...(params.search ? { search: params.search } : {}), ...(params.status ? { status: params.status } : {}), ...(params.health ? { health: params.health } : {}), planId: plan.id }).toString()}`}>
                <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                  params.planId === plan.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
                }`}>{plan.name}</button>
              </Link>
            ))}
            {params.planId && (
              <span className="text-xs text-muted-foreground ml-1">— {total} alumno{total !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">Salud:</span>
          {([
            { value: '', label: '⚪ Todos' },
            { value: 'healthy', label: '🟢 Apto' },
            { value: 'observation', label: '🟡 Observación' },
            { value: 'injured', label: '🔴 Lesionado' },
          ]).map(({ value, label }) => (
            <Link key={value} href={`/dashboard/athletes?${new URLSearchParams({
              ...(params.search    ? { search:    params.search }    : {}),
              ...(params.status    ? { status:    params.status }    : {}),
              ...(params.planId    ? { planId:    params.planId }    : {}),
              ...(params.subStatus ? { subStatus: params.subStatus } : {}),
              ...(sort             ? { sort }                        : {}),
              ...(value            ? { health: value }               : {}),
            }).toString()}`}>
              <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                (value === '' && !params.health) || params.health === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-input hover:bg-accent'
              }`}>{label}</button>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">Suscripción:</span>
          {([
            { value: '', label: 'Todas' },
            { value: 'active', label: '✅ Activa' },
            { value: 'expired', label: '🔴 Vencida' },
            { value: 'paused', label: '⏸ Pausada' },
            { value: 'cancelled', label: 'Cancelada' },
          ]).map(({ value, label }) => (
            <Link key={value} href={`/dashboard/athletes?${new URLSearchParams({
              ...(params.search ? { search: params.search } : {}),
              ...(params.status ? { status: params.status } : {}),
              ...(params.health ? { health: params.health } : {}),
              ...(params.planId ? { planId: params.planId } : {}),
              ...(value ? { subStatus: value } : {}),
            }).toString()}`}>
              <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                (value === '' && !params.subStatus) || params.subStatus === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-input hover:bg-accent'
              }`}>{label}</button>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">Orden:</span>
          {([
            { value: '', label: 'Nombre A-Z' },
            { value: 'created_at', label: '🕐 Más recientes' },
            { value: 'status', label: '📊 Estado' },
          ]).map(({ value, label }) => (
            <Link key={value} href={`/dashboard/athletes?${new URLSearchParams({
              ...(params.search    ? { search:    params.search }    : {}),
              ...(params.status    ? { status:    params.status }    : {}),
              ...(params.health    ? { health:    params.health }    : {}),
              ...(params.planId    ? { planId:    params.planId }    : {}),
              ...(params.subStatus ? { subStatus: params.subStatus } : {}),
              ...(value            ? { sort: value }                 : {}),
            }).toString()}`}>
              <button className={`h-7 px-2.5 rounded-md border text-xs font-medium transition-colors ${
                (value === '' && !sort) || sort === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-input hover:bg-accent'
              }`}>{label}</button>
            </Link>
          ))}
        </div>
      </div>

      {/* Athletes List */}
      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : athletes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {params.search ? "Sin resultados" : "No hay alumnos registrados"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {params.search
                ? `No encontramos resultados para "${params.search}"`
                : "Comienza agregando el primer alumno al sistema"}
            </p>
            {!params.search && (
              <Link href="/dashboard/athletes/new">
                <Button>Agregar Alumno</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {athletes.map((athlete) => (
            <Link key={athlete.id} href={`/dashboard/athletes/${athlete.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={athlete.photo_url ?? undefined} />
                      <AvatarFallback className="text-base font-semibold">
                        {athlete.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Semáforo dot */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      athlete.health_status === "injured"     ? "bg-red-500" :
                      athlete.health_status === "observation" ? "bg-yellow-500" :
                      "bg-green-500"
                    }`} title={
                      athlete.health_status === "injured"     ? "Lesionado" :
                      athlete.health_status === "observation" ? "En observación" :
                      "Apto"
                    } />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{athlete.name}</span>
                        <HealthStatusBadge status={athlete.health_status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {athlete.email && <span className="truncate">{athlete.email}</span>}
                        {(() => {
                          const subs = athlete.subscriptions as Array<{ status: string; plans: { name: string } | null }> | null
                          const active = subs?.find((s) => s.status === "active")
                          return active?.plans ? (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                              {active.plans.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 shrink-0">Sin plan</span>
                          )
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const docs = athlete.documents as Array<{ id: string }> | null
                        const docCount = (docs ?? []).length
                        if (docCount > 0) return (
                          <span className="text-xs text-muted-foreground" title={`${docCount} documento${docCount !== 1 ? 's' : ''}`}>
                            📄 {docCount}
                          </span>
                        )
                        return null
                      })()}
                      {(() => {
                        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                        const att = athlete.attendance as Array<{ id: string; checked_in_at: string }> | null
                        const checkIns = (att ?? []).filter((a) => new Date(a.checked_in_at) >= thirtyDaysAgo).length
                        if (checkIns > 0) return (
                          <span className="text-xs text-muted-foreground" title="Check-ins últimos 30 días">
                            📋 {checkIns}
                          </span>
                        )
                        return null
                      })()}
                      {(() => {
                        const pmts = athlete.payments as Array<{ status: string; paid_at: string | null }> | null
                        const overdue = pmts?.filter((p) => p.status === 'overdue').length ?? 0
                        const pending = pmts?.filter((p) => p.status === 'pending').length ?? 0
                        const lastPaid = pmts
                          ?.filter((p) => p.status === 'paid' && p.paid_at)
                          .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())[0]
                        if (overdue > 0) return (
                          <Badge variant="destructive" className="text-xs">{overdue} vencido{overdue > 1 ? 's' : ''}</Badge>
                        )
                        if (pending > 0) return (
                          <Badge variant="secondary" className="text-xs">{pending} pendiente{pending > 1 ? 's' : ''}</Badge>
                        )
                        if (lastPaid?.paid_at) return (
                          <span className="text-xs text-muted-foreground">
                            Pagó {new Date(lastPaid.paid_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                          </span>
                        )
                        return null
                      })()}
                      <Badge variant={athlete.status === "active" ? "default" : "secondary"}>
                        {athlete.status === "active" ? "Activo" : athlete.status === "inactive" ? "Inactivo" : "Suspendido"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} de {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/athletes?${new URLSearchParams({
                  ...(params.search    ? { search:    params.search }    : {}),
                  ...(params.status    ? { status:    params.status }    : {}),
                  ...(params.health    ? { health:    params.health }    : {}),
                  ...(params.planId    ? { planId:    params.planId }    : {}),
                  ...(params.subStatus ? { subStatus: params.subStatus } : {}),
                  ...(sort             ? { sort }                        : {}),
                  page: String(page - 1),
                }).toString()}`}
              >
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
                  ← Anterior
                </button>
              </Link>
            )}
            {page * 20 < total && (
              <Link
                href={`/dashboard/athletes?${new URLSearchParams({
                  ...(params.search    ? { search:    params.search }    : {}),
                  ...(params.status    ? { status:    params.status }    : {}),
                  ...(params.health    ? { health:    params.health }    : {}),
                  ...(params.planId    ? { planId:    params.planId }    : {}),
                  ...(params.subStatus ? { subStatus: params.subStatus } : {}),
                  ...(sort             ? { sort }                        : {}),
                  page: String(page + 1),
                }).toString()}`}
              >
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">
                  Siguiente →
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
