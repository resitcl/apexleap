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
    inactive?: string
    minAtt?: string
    ageMin?: string
    ageMax?: string
    debtMin?: string
    debtMax?: string
  }>
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const sort = params.sort ?? ""
  const showInactive = params.inactive === '1'
  const minAtt = params.minAtt ? Number(params.minAtt) : undefined
  const ageMin  = params.ageMin  ? Number(params.ageMin)  : undefined
  const ageMax  = params.ageMax  ? Number(params.ageMax)  : undefined
  const debtMin = params.debtMin ? Number(params.debtMin) : undefined
  const debtMax = params.debtMax ? Number(params.debtMax) : undefined

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

  const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  if (ageMin !== undefined || ageMax !== undefined) {
    athletes = athletes.filter((a) => {
      if (!a.birth_date) return false
      const age = Math.floor((Date.now() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      if (ageMin !== undefined && age < ageMin) return false
      if (ageMax !== undefined && age > ageMax) return false
      return true
    })
  }

  if (sort === 'debt') {
    athletes = athletes.slice().sort((a, b) => {
      const debtA = (a.payments as Array<{ status: string; amount: number }> | null ?? [])
        .filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
      const debtB = (b.payments as Array<{ status: string; amount: number }> | null ?? [])
        .filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
      return debtB - debtA
    })
  }

  if (sort === 'paid') {
    athletes = athletes.slice().sort((a, b) => {
      const paidA = (a.payments as Array<{ status: string; amount: number }> | null ?? [])
        .filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
      const paidB = (b.payments as Array<{ status: string; amount: number }> | null ?? [])
        .filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
      return paidB - paidA
    })
  }

  if (sort === 'docs') {
    athletes = athletes.slice().sort((a, b) => {
      const docsA = (a.documents as unknown[] | null ?? []).length
      const docsB = (b.documents as unknown[] | null ?? []).length
      return docsB - docsA
    })
  }

  if (sort === 'last_attendance') {
    athletes = athletes.slice().sort((a, b) => {
      const lastA = (a.attendance as Array<{ checked_in_at: string }> | null ?? [])
        .reduce<string>((max, r) => (r.checked_in_at > max ? r.checked_in_at : max), '')
      const lastB = (b.attendance as Array<{ checked_in_at: string }> | null ?? [])
        .reduce<string>((max, r) => (r.checked_in_at > max ? r.checked_in_at : max), '')
      return lastB.localeCompare(lastA)
    })
  }

  if (showInactive) {
    athletes = athletes.filter((a) => {
      const att = a.attendance as Array<{ checked_in_at: string }> | null
      const last = (att ?? []).reduce<string | null>((max, r) => (!max || r.checked_in_at > max ? r.checked_in_at : max), null)
      return a.status === 'active' && (!last || last < thirtyDaysAgoISO)
    })
  }

  if (ageMin !== undefined || ageMax !== undefined) {
    athletes = athletes.filter((a) => {
      if (!a.birth_date) return ageMin === undefined
      const age = Math.floor((Date.now() - new Date(a.birth_date + 'T12:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (ageMin !== undefined && age < ageMin) return false
      if (ageMax !== undefined && age > ageMax) return false
      return true
    })
  }

  if (debtMin !== undefined || debtMax !== undefined) {
    athletes = athletes.filter((a) => {
      const pmts = a.payments as Array<{ status: string; amount: number }> | null ?? []
      const debt = pmts.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
      if (debtMin !== undefined && debt < debtMin) return false
      if (debtMax !== undefined && debt > debtMax) return false
      return true
    })
  }

  if (minAtt !== undefined) {
    athletes = athletes.filter((a) => {
      const att = a.attendance as unknown[] | null
      return (att ?? []).length >= minAtt
    })
  }

  const statusCounts = {
    active: athletes.filter((a) => a.status === "active").length,
    injured: athletes.filter((a) => a.health_status === "injured").length,
    overdue: 0,
  }

  const totalDebt = allAthletes.reduce((sum, a) => {
    const pmts = a.payments as Array<{ status: string; amount: number }> | null ?? []
    return sum + pmts.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
  }, 0)

  const today = new Date().toISOString().split('T')[0]
  const expiredDocsCount = allAthletes.reduce((sum, a) => {
    const docs = a.documents as Array<{ id: string; expiry_date: string | null }> | null ?? []
    return sum + docs.filter((d) => d.expiry_date && d.expiry_date < today).length
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alumnos</h1>
          <p className="text-muted-foreground">
            {total} registrados en total
            {totalDebt > 0 && (
              <span className="ml-2 text-red-600 font-medium">· Deuda total: ${totalDebt.toLocaleString('es-CL')}</span>
            )}
            {expiredDocsCount > 0 && (
              <span className="ml-2 text-orange-600 font-medium">· {expiredDocsCount} doc{expiredDocsCount !== 1 ? 's' : ''} vencido{expiredDocsCount !== 1 ? 's' : ''}</span>
            )}
            {(() => {
              const totalComps = allAthletes.reduce((sum, a) => {
                const rosters = (a as Record<string, unknown>).rosters as unknown[] | null
                return sum + (rosters ?? []).length
              }, 0)
              return totalComps > 0 ? (
                <span className="ml-2 text-violet-600 font-medium">· 🏆 {totalComps} participaciones</span>
              ) : null
            })()}
            {(() => {
              const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
              const sixtyISO = sixtyDaysAgo.toISOString()
              const dormant = allAthletes.filter((a) => {
                if (a.status !== 'active') return false
                const att = a.attendance as Array<{ checked_in_at: string }> | null ?? []
                const last = att.reduce<string | null>((max, r) => (!max || r.checked_in_at > max ? r.checked_in_at : max), null)
                return !last || last < sixtyISO
              }).length
              return dormant > 0 ? (
                <span className="ml-2 text-muted-foreground/70">· {dormant} sin asistencia en 60d</span>
              ) : null
            })()}
            {(() => {
              const noPhoto = allAthletes.filter((a) => a.status === 'active' && !a.photo_url).length
              return noPhoto > 0 ? (
                <span className="ml-2 text-muted-foreground/60">· {noPhoto} sin foto</span>
              ) : null
            })()}
          </p>
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
        <div className="flex items-center gap-3 flex-wrap">
          <AthletesSearch />
          <Link href={`/dashboard/athletes?${new URLSearchParams({
            ...(params.search    ? { search:    params.search }    : {}),
            ...(params.status    ? { status:    params.status }    : {}),
            ...(params.health    ? { health:    params.health }    : {}),
            ...(params.planId    ? { planId:    params.planId }    : {}),
            ...(params.subStatus ? { subStatus: params.subStatus } : {}),
            ...(sort             ? { sort }                        : {}),
            ...(showInactive     ? {} : { inactive: '1' }),
          }).toString()}`}>
            <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
              showInactive ? 'bg-orange-500 text-white border-orange-500' : 'bg-background border-input hover:bg-accent'
            }`}>⚠ Sin asistencia 30d</button>
          </Link>
          <form method="get" action="/dashboard/athletes" className="flex items-center gap-1.5">
            {params.search    && <input type="hidden" name="search"    value={params.search} />}
            {params.status    && <input type="hidden" name="status"    value={params.status} />}
            {params.health    && <input type="hidden" name="health"    value={params.health} />}
            {params.planId    && <input type="hidden" name="planId"    value={params.planId} />}
            {params.subStatus && <input type="hidden" name="subStatus" value={params.subStatus} />}
            {sort             && <input type="hidden" name="sort"      value={sort} />}
            <span className="text-xs text-muted-foreground whitespace-nowrap">Mín. asistencias:</span>
            <input type="number" name="minAtt" defaultValue={params.minAtt ?? ''} min={0} placeholder="N"
              className="h-8 w-16 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" className="h-8 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">OK</button>
            {params.minAtt && (
              <Link href={`/dashboard/athletes?${new URLSearchParams({ ...(params.search ? { search: params.search } : {}), ...(params.status ? { status: params.status } : {}), ...(params.health ? { health: params.health } : {}), ...(params.planId ? { planId: params.planId } : {}), ...(params.subStatus ? { subStatus: params.subStatus } : {}), ...(sort ? { sort } : {}) }).toString()}`}
                className="text-xs text-muted-foreground hover:text-foreground">✕</Link>
            )}
          </form>
          <form method="get" action="/dashboard/athletes" className="flex items-center gap-1.5">
            {params.search    && <input type="hidden" name="search"    value={params.search} />}
            {params.status    && <input type="hidden" name="status"    value={params.status} />}
            {params.health    && <input type="hidden" name="health"    value={params.health} />}
            {params.planId    && <input type="hidden" name="planId"    value={params.planId} />}
            {params.subStatus && <input type="hidden" name="subStatus" value={params.subStatus} />}
            {sort             && <input type="hidden" name="sort"      value={sort} />}
            <span className="text-xs text-muted-foreground whitespace-nowrap">Edad:</span>
            <input type="number" name="ageMin" defaultValue={params.ageMin ?? ''} min={0} max={99} placeholder="Min"
              className="h-8 w-16 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
            <span className="text-xs text-muted-foreground">-</span>
            <input type="number" name="ageMax" defaultValue={params.ageMax ?? ''} min={0} max={99} placeholder="Max"
              className="h-8 w-16 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" className="h-8 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">OK</button>
            {(params.ageMin || params.ageMax) && (
              <Link href={`/dashboard/athletes?${new URLSearchParams({ ...(params.search ? { search: params.search } : {}), ...(params.status ? { status: params.status } : {}), ...(params.health ? { health: params.health } : {}), ...(params.planId ? { planId: params.planId } : {}), ...(params.subStatus ? { subStatus: params.subStatus } : {}), ...(sort ? { sort } : {}) }).toString()}`}
                className="text-xs text-muted-foreground hover:text-foreground">✕</Link>
            )}
          </form>
          <form method="get" action="/dashboard/athletes" className="flex items-center gap-1.5">
            {params.search    && <input type="hidden" name="search"    value={params.search} />}
            {params.status    && <input type="hidden" name="status"    value={params.status} />}
            {params.health    && <input type="hidden" name="health"    value={params.health} />}
            {params.planId    && <input type="hidden" name="planId"    value={params.planId} />}
            {params.subStatus && <input type="hidden" name="subStatus" value={params.subStatus} />}
            {sort             && <input type="hidden" name="sort"      value={sort} />}
            <span className="text-xs text-muted-foreground whitespace-nowrap">Deuda min:</span>
            <input type="number" name="debtMin" defaultValue={params.debtMin ?? ''} min={0} placeholder="0"
              className="h-8 w-20 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
            <span className="text-xs text-muted-foreground">-</span>
            <input type="number" name="debtMax" defaultValue={params.debtMax ?? ''} min={0} placeholder="∞"
              className="h-8 w-20 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" className="h-8 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">OK</button>
            {(params.debtMin || params.debtMax) && (
              <Link href={`/dashboard/athletes?${new URLSearchParams({ ...(params.search ? { search: params.search } : {}), ...(params.status ? { status: params.status } : {}), ...(params.health ? { health: params.health } : {}), ...(params.planId ? { planId: params.planId } : {}), ...(params.subStatus ? { subStatus: params.subStatus } : {}), ...(sort ? { sort } : {}) }).toString()}`}
                className="text-xs text-muted-foreground hover:text-foreground">✕</Link>
            )}
          </form>
          {(params.search || params.status || params.health || params.planId || params.subStatus || sort || showInactive) && (
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
            { value: 'debt',           label: '� Mayor deuda' },
            { value: 'paid',           label: '✅ Mayor pagado' },
            { value: 'last_attendance', label: '� Última asistencia' },
            { value: 'docs',           label: '📄 Más documentos' },
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
        <form method="get" action="/dashboard/athletes" className="flex items-center gap-2 flex-wrap">
          {params.search    && <input type="hidden" name="search"    value={params.search} />}
          {params.status    && <input type="hidden" name="status"    value={params.status} />}
          {params.health    && <input type="hidden" name="health"    value={params.health} />}
          {params.planId    && <input type="hidden" name="planId"    value={params.planId} />}
          {params.subStatus && <input type="hidden" name="subStatus" value={params.subStatus} />}
          {sort             && <input type="hidden" name="sort"      value={sort} />}
          <span className="text-xs text-muted-foreground font-medium">Edad:</span>
          <input type="number" name="ageMin" defaultValue={params.ageMin ?? ''} min={0} max={100} placeholder="Mín."
            className="h-7 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-16" />
          <span className="text-xs text-muted-foreground">–</span>
          <input type="number" name="ageMax" defaultValue={params.ageMax ?? ''} min={0} max={100} placeholder="Máx."
            className="h-7 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-16" />
          <button type="submit" className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Filtrar</button>
          {(ageMin !== undefined || ageMax !== undefined) && (
            <a href={`/dashboard/athletes?${new URLSearchParams({
              ...(params.search    ? { search:    params.search }    : {}),
              ...(params.status    ? { status:    params.status }    : {}),
              ...(params.health    ? { health:    params.health }    : {}),
              ...(params.planId    ? { planId:    params.planId }    : {}),
              ...(params.subStatus ? { subStatus: params.subStatus } : {}),
              ...(sort             ? { sort }                        : {}),
            }).toString()}`} className="text-xs text-muted-foreground hover:text-foreground">✕ Limpiar edad</a>
          )}
        </form>
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
                        {athlete.birth_date && (() => {
                          const dob = new Date(athlete.birth_date + 'T12:00:00')
                          const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                          return <span className="shrink-0 text-xs">{age} años</span>
                        })()}
                        {(() => {
                          const subs = athlete.subscriptions as Array<{ status: string; plans: { name: string } | null }> | null ?? []
                          const active    = subs.find((s) => s.status === "active")
                          const expired   = subs.find((s) => s.status === "expired")
                          const paused    = subs.find((s) => s.status === "paused")
                          const cancelled = subs.find((s) => s.status === "cancelled")
                          if (active?.plans)
                            return <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">{active.plans.name}</span>
                          if (expired)
                            return <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium shrink-0">Vencida</span>
                          if (paused)
                            return <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium shrink-0">Pausada</span>
                          if (cancelled)
                            return <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium shrink-0">Cancelada</span>
                          return <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium shrink-0">Sin plan</span>
                        })()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const comps = (athlete as Record<string, unknown>).rosters as Array<{ id: string }> | null
                        const total = (comps ?? []).length
                        if (total === 0) return null
                        return (
                          <span className="text-xs font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded" title={`${total} competencia${total !== 1 ? 's' : ''} participadas`}>
                            🏆{total}
                          </span>
                        )
                      })()}
                      {(() => {
                        const att = athlete.attendance as Array<{ id: string; checked_in_at: string }> | null
                        const total = (att ?? []).length
                        if (total === 0) return null
                        return (
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded" title={`${total} check-ins en total`}>
                            ★{total}
                          </span>
                        )
                      })()}
                      {(() => {
                        const docs = athlete.documents as Array<{ id: string; expiry_date?: string | null }> | null
                        const docList = docs ?? []
                        const docCount = docList.length
                        const today = new Date().toISOString().split('T')[0]
                        const expired = docList.filter((d) => d.expiry_date && d.expiry_date < today).length
                        if (expired > 0) return (
                          <span className="text-xs text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded" title={`${expired} doc${expired !== 1 ? 's' : ''} vencido${expired !== 1 ? 's' : ''}`}>
                            📄⚠{expired}
                          </span>
                        )
                        if (docCount > 0) return (
                          <span className="text-xs text-muted-foreground" title={`${docCount} documento${docCount !== 1 ? 's' : ''}`}>
                            📄 {docCount}
                          </span>
                        )
                        return null
                      })()}
                      {(() => {
                        const att = athlete.attendance as Array<{ id: string; checked_in_at: string }> | null
                        const sorted = (att ?? []).slice().sort((a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
                        const last = sorted[0]
                        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                        const checkIns = (att ?? []).filter((a) => new Date(a.checked_in_at) >= thirtyDaysAgo).length
                        const isInactive = athlete.status === 'active' && (!last || new Date(last.checked_in_at) < thirtyDaysAgo)
                        if (isInactive) return (
                          <span className="text-xs text-orange-500 font-medium" title={last ? `Sin asistencia desde ${new Date(last.checked_in_at).toLocaleDateString('es-CL')}` : 'Sin asistencias registradas'}>
                            ⚠ Inactivo
                          </span>
                        )
                        if (last) {
                          const allAtt = att ?? []
                          const oldest = allAtt.reduce<Date | null>((min, r) => {
                            const d = new Date(r.checked_in_at)
                            return !min || d < min ? d : min
                          }, null)
                          const monthsSpan = oldest ? Math.max(1, Math.ceil((Date.now() - oldest.getTime()) / (1000 * 60 * 60 * 24 * 30))) : 1
                          const avgPerMonth = Math.round(allAtt.length / monthsSpan)

                          // Streak: consecutive weeks with at least 1 attendance
                          const weekSet = new Set(allAtt.map((r) => {
                            const d = new Date(r.checked_in_at)
                            const jan1 = new Date(d.getFullYear(), 0, 1)
                            return `${d.getFullYear()}-${Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`
                          }))
                          const nowWeek = (() => { const d = new Date(); const j = new Date(d.getFullYear(),0,1); return `${d.getFullYear()}-${Math.ceil(((d.getTime()-j.getTime())/86400000+j.getDay()+1)/7)}` })()
                          let streak = 0
                          let wNum = parseInt(nowWeek.split('-')[1])
                          let wYear = parseInt(nowWeek.split('-')[0])
                          while (weekSet.has(`${wYear}-${wNum}`)) {
                            streak++
                            wNum--
                            if (wNum < 1) { wYear--; wNum = 52 }
                            if (streak > 52) break
                          }

                          const avgPerWeek = +(allAtt.length / (monthsSpan * 4.3)).toFixed(1)
                          return (
                            <span className="text-xs text-muted-foreground" title={`Última: ${new Date(last.checked_in_at).toLocaleDateString('es-CL')} · ${checkIns} en 30d · ~${avgPerMonth}/mes`}>
                              📋 {new Date(last.checked_in_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                              {avgPerWeek > 0 && <span className="ml-1 text-primary">~{avgPerWeek}/sem</span>}
                              {streak >= 2 && <span className="ml-1 text-orange-500 font-medium">🔥{streak}s</span>}
                            </span>
                          )
                        }
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
