export const dynamic = "force-dynamic"

import Link from "next/link"
import { getAthletes } from "@/lib/actions/athletes"
import { getPlans } from "@/lib/actions/plans"
import { getCategories } from "@/lib/actions/categories"
import { getPendingEnrollments } from "@/lib/actions/athlete-enrollment"
import { getClubVocab } from "@/lib/actions/club-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DashboardEmptyState, DashboardMetaPill, DashboardPage, DashboardPageHeader } from "@/components/ui/dashboard-kit"
import { UserPlus, AlertCircle, Clock, Users, TrendingUp, UserCheck, Activity, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { AthletesFilter } from "@/components/athletes/AthletesFilter"
import { HealthStatusBadge } from "@/components/athletes/HealthStatusBadge"
import { ExportAthletesButton } from "@/components/athletes/ExportAthletesButton"
import { BulkActionsWrapper } from "@/components/athletes/BulkActionsWrapper"
import { SendInvitationDialog } from "@/components/athletes/SendInvitationDialog"

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    health?: string
    planId?: string
    subStatus?: string
    categoryId?: string
    page?: string
    sort?: string
    inactive?: string
    minAtt?: string
    ageMin?: string
    ageMax?: string
    debtMin?: string
    debtMax?: string
    expiredDocs?: string
    debtOld60?: string
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
  const filterExpiredDocs = params.expiredDocs === '1'
  const filterDebtOld60 = params.debtOld60 === '1'

  let athletes: Awaited<ReturnType<typeof getAthletes>>["athletes"] = []
  let allAthletes: Awaited<ReturnType<typeof getAthletes>>["athletes"] = []
  let total = 0
  let error: string | null = null
  let plans: { id: string; name: string }[] = []
  let categories: { id: string; name: string; color: string | null }[] = []
  let pendingEnrollmentsCount = 0

  try {
    const filterParams = {
      search: params.search,
      status: params.status,
      healthStatus: params.health,
      planId: params.planId,
      subscriptionStatus: params.subStatus,
      categoryId: params.categoryId || undefined,
      sort: sort || undefined,
    }
    const [result, allResult, plansData, catsData, pendingEnrollments] = await Promise.all([
      getAthletes({ ...filterParams, page, limit: 20 }),
      getAthletes({ ...filterParams, page: 1, limit: 1000 }),
      getPlans(),
      getCategories(true).catch(() => []),
      getPendingEnrollments().catch(() => []),
    ])
    athletes = result.athletes
    allAthletes = allResult.athletes
    total = result.total
    plans = plansData.map((p) => ({ id: p.id, name: p.name }))
    categories = catsData.map((c) => ({ id: c.id, name: c.name, color: c.color ?? null }))
    pendingEnrollmentsCount = pendingEnrollments.length
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar alumnos"
  }

  const vocab = await getClubVocab()
  const vocabLower = vocab.athletes.toLowerCase()

  const now = new Date()
  const nowMs = now.getTime()
  const today = now.toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)
  const thirtyDaysAgoISO = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgoISO = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(nowMs - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  if (ageMin !== undefined || ageMax !== undefined) {
    athletes = athletes.filter((a) => {
      if (!a.birth_date) return false
      const age = Math.floor((nowMs - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
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

  if (sort === 'debt') {
    athletes = athletes.slice().sort((a, b) => {
      const debtA = (a.payments as Array<{ status: string; amount: number }> | null ?? [])
        .filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
      const debtB = (b.payments as Array<{ status: string; amount: number }> | null ?? [])
        .filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
      return debtB - debtA
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

  if (sort === 'last_payment') {
    athletes = athletes.slice().sort((a, b) => {
      const lastA = (a.payments as Array<{ status: string; paid_at: string | null }> | null ?? [])
        .filter((p) => p.status === 'paid' && p.paid_at)
        .reduce<string>((max, p) => (p.paid_at! > max ? p.paid_at! : max), '')
      const lastB = (b.payments as Array<{ status: string; paid_at: string | null }> | null ?? [])
        .filter((p) => p.status === 'paid' && p.paid_at)
        .reduce<string>((max, p) => (p.paid_at! > max ? p.paid_at! : max), '')
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
      const age = Math.floor((nowMs - new Date(a.birth_date + 'T12:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000))
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

  if (filterExpiredDocs) {
    const todayStr = new Date().toISOString().split('T')[0]
    athletes = athletes.filter((a) => {
      const docs = a.documents as Array<{ expiry_date: string | null }> | null ?? []
      return docs.some((d) => d.expiry_date && d.expiry_date < todayStr)
    })
  }

  if (filterDebtOld60) {
    athletes = athletes.filter((a) => {
      const pmts = a.payments as Array<{ status: string; due_date?: string | null }> | null ?? []
      return pmts.some((p) => p.status === 'overdue' && p.due_date && p.due_date < sixtyDaysAgo)
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
    overdue: athletes.filter((a) => {
      const pmts = a.payments as Array<{ status: string }> | null ?? []
      return pmts.some((p) => p.status === 'overdue')
    }).length,
  }

  const totalDebt = allAthletes.reduce((sum, a) => {
    const pmts = a.payments as Array<{ status: string; amount: number }> | null ?? []
    return sum + pmts.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
  }, 0)

  const avgAttendanceRate = (() => {
    const active = allAthletes.filter((a) => a.status === 'active')
    if (active.length === 0) return null
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const thirtyISO = thirtyAgo.toISOString()
    const rates = active.map((a) => {
      const att = a.attendance as Array<{ checked_in_at: string }> | null ?? []
      return att.filter((r) => r.checked_in_at >= thirtyISO).length
    })
    const avg = rates.reduce((s, r) => s + r, 0) / active.length
    return +avg.toFixed(1)
  })()

  const expiredDocsCount = allAthletes.reduce((sum, a) => {
    const docs = a.documents as Array<{ id: string; expiry_date: string | null }> | null ?? []
    return sum + docs.filter((d) => d.expiry_date && d.expiry_date < today).length
  }, 0)

  const newThisMonth = allAthletes.filter((a) => (a.created_at ?? '').startsWith(currentMonth)).length
  const visibleStart = total === 0 ? 0 : (page - 1) * 20 + 1
  const visibleEnd = Math.min(page * 20, total)
  const thirtyDaysAgoDate = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  return (
    <DashboardPage>
      {/* ── GREETING ── */}
      <DashboardPageHeader
        title={<>Gestión de <span className="text-primary">{vocab.athletes}.</span></>}
        subtitle={
          <>
            <span>{total.toLocaleString('es-CL')} registrados en total</span>
            {newThisMonth > 0 && <span className="text-primary font-medium"> · +{newThisMonth} nuevo{newThisMonth !== 1 ? 's' : ''} este mes</span>}
            {totalDebt > 0 && <span className="text-red-500 font-medium"> · Deuda: ${totalDebt.toLocaleString('es-CL')}</span>}
            {avgAttendanceRate !== null && avgAttendanceRate > 0 && <span> · ~{avgAttendanceRate} check-ins/activo (30d)</span>}
          </>
        }
        meta={
          <DashboardMetaPill icon={<Sparkles className="w-4 h-4" />} tone="success">
            Mostrando {visibleStart}-{visibleEnd} de {total.toLocaleString('es-CL')}
          </DashboardMetaPill>
        }
        actions={
          <div className="flex items-center gap-2 shrink-0">
            {pendingEnrollmentsCount > 0 && (
              <Link href="/dashboard/athletes/pending">
                <Button variant="outline" className="gap-2 h-10 rounded-xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs uppercase tracking-widest">
                  <Clock className="w-4 h-4" />
                  Pendientes
                  <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-400 border-amber-500/20">
                    {pendingEnrollmentsCount}
                  </Badge>
                </Button>
              </Link>
            )}
            <ExportAthletesButton athletes={allAthletes} />
            <SendInvitationDialog />
            <Link href="/dashboard/athletes/new">
              <Button className="gap-2 h-10 px-5 rounded-xl font-black uppercase tracking-widest text-xs bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90">
                <UserPlus className="w-4 h-4" />
                Nuevo Alumno
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1.6fr] gap-3">

        {/* Activos */}
        <Link href="/dashboard/athletes?status=active" className="block h-full">
          <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-5">
              <Users className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Activos</p>
            </div>
            <div>
              <p className="text-4xl font-black tracking-tight text-primary leading-none">{statusCounts.active}</p>
              <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">{vocabLower} activos</p>
            </div>
          </div>
        </Link>

        {/* Lesionados */}
        <Link href="/dashboard/athletes?health=injured" className="block h-full">
          <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-5">
              <Activity className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Lesionados</p>
            </div>
            <div>
              <p className={`text-4xl font-black tracking-tight leading-none ${statusCounts.injured > 0 ? 'text-red-500' : 'text-foreground'}`}>{statusCounts.injured}</p>
              <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">con lesión activa</p>
            </div>
          </div>
        </Link>

        {/* Asistencia Promedio */}
        {avgAttendanceRate !== null ? (
          <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm h-full flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-5">
              <TrendingUp className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Asistencia</p>
            </div>
            <div>
              <p className="text-4xl font-black tracking-tight text-foreground leading-none">{avgAttendanceRate}</p>
              <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">check-ins/activo (30d)</p>
            </div>
          </div>
        ) : (
          <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm h-full flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-5">
              <TrendingUp className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Docs Vencidos</p>
            </div>
            <div>
              <p className={`text-4xl font-black tracking-tight leading-none ${expiredDocsCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>{expiredDocsCount}</p>
              <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">documentos vencidos</p>
            </div>
          </div>
        )}

        {/* Con Plan */}
        {(() => {
          const active = allAthletes.filter((a) => a.status === 'active')
          if (active.length === 0) return (
            <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm h-full flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-5">
                <UserCheck className="w-5 h-5 text-muted-foreground/50" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Con Plan</p>
              </div>
              <div>
                <p className="text-4xl font-black tracking-tight text-muted-foreground/30 leading-none">—</p>
                <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">sin {vocabLower} activos</p>
              </div>
            </div>
          )
          const withSub = active.filter((a) => {
            const subs = a.subscriptions as Array<{ status: string }> | null ?? []
            return subs.some((s) => s.status === 'active')
          }).length
          const pct = Math.round((withSub / active.length) * 100)
          return (
            <Link href="/dashboard/subscriptions" className="block h-full">
              <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50 h-full flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-5">
                  <UserCheck className="w-5 h-5 text-muted-foreground/50" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Con Plan</p>
                </div>
                <div>
                  <p className={`text-4xl font-black tracking-tight leading-none ${pct >= 80 ? 'text-primary' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</p>
                  <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">{withSub}/{active.length} activos</p>
                </div>
              </div>
            </Link>
          )
        })()}

        {/* Featured: Deuda Total */}
        <div className="rounded-[20px] border border-border bg-card p-5 shadow-sm h-full flex flex-col justify-between col-span-2 md:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Deuda Total</p>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totalDebt > 0 ? 'bg-red-500/10' : 'bg-primary/10'}`}>
              <AlertCircle className={`w-5 h-5 ${totalDebt > 0 ? 'text-red-500' : 'text-primary'}`} />
            </div>
          </div>
          <div>
            <p className={`text-3xl lg:text-4xl font-black leading-none tracking-tight ${totalDebt > 0 ? 'text-red-500' : 'text-primary'}`}>
              {totalDebt > 0 ? `$${totalDebt >= 1000 ? `${Math.round(totalDebt / 1000)}k` : totalDebt.toLocaleString('es-CL')}` : 'Sin deuda'}
            </p>
            <p className="text-[13px] text-muted-foreground/50 mt-1.5 font-normal">
              {totalDebt > 0 ? 'en pagos vencidos' : 'todos al día'}
            </p>
          </div>
          {expiredDocsCount > 0 && (
            <div className="mt-auto pt-3 border-t border-border">
              <p className="text-[11px] text-amber-500 font-bold">{expiredDocsCount} doc{expiredDocsCount !== 1 ? 's' : ''} vencido{expiredDocsCount !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {(() => {
        const active = allAthletes.filter((a) => a.status === 'active')
        if (active.length < 5) return null
        const withOverdue = active.filter((a) => {
          const pmts = a.payments as Array<{ status: string }> | null ?? []
          return pmts.some((p) => p.status === 'overdue')
        }).length
        const pct = Math.round((withOverdue / active.length) * 100)
        if (pct < 30) return null
        return (
          <Link href="/dashboard/athletes?sort=debt">
            <div className="rounded-2xl border border-destructive/20 bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent p-5 flex items-center gap-4 hover:border-destructive/40 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-sm font-bold text-foreground">
                {pct}% de atletas activos <span className="text-destructive">({withOverdue}/{active.length})</span> tienen pagos vencidos
              </p>
            </div>
          </Link>
        )
      })()}

      {/* ── ALERTS ROW ── */}
      {(() => {
        const fourteenAgo = fourteenDaysAgoISO
        const thirtyAgo   = thirtyDaysAgoDate

        const noCheckIn = allAthletes.filter((a) => {
          if (a.status !== 'active') return false
          const att = (a.attendance as Array<{ checked_in_at: string }> | null) ?? []
          if (att.length === 0) return false
          const last = att.map(r => r.checked_in_at).sort().at(-1)
          return !last || last < fourteenAgo
        })

        const noSub = allAthletes.filter((a) => {
          if (a.status !== 'active') return false
          const subs = (a.subscriptions as Array<{ status: string; end_date?: string | null }> | null) ?? []
          const hasActive = subs.some((s) => s.status === 'active')
          if (hasActive) return false
          const lastExpired = subs.filter((s) => s.end_date).map((s) => s.end_date!).sort().at(-1)
          return !lastExpired || lastExpired < thirtyAgo
        })

        const activeCount = allAthletes.filter((a) => a.status === 'active').length
        const noEmerg = allAthletes.filter((a) => a.status === 'active' && !(a as { emergency_phone?: string }).emergency_phone)
        const noEmergPct = activeCount > 0 ? Math.round((noEmerg.length / activeCount) * 100) : 0
        const showEmerg = noEmerg.length >= 3 && noEmergPct >= 30

        const hasAlerts = noCheckIn.length > 0 || noSub.length > 0 || showEmerg
        if (!hasAlerts) return null

        return (
          <div className="flex flex-wrap gap-3">
            {noSub.length > 0 && (
              <div className="flex-1 min-w-[280px] bg-amber-500/10 border border-amber-500/20 rounded-[16px] p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-500">
                    {noSub.length} activo{noSub.length !== 1 ? 's' : ''} sin suscripción
                  </p>
                  <p className="text-[10px] text-amber-500/70">hace más de 30 días</p>
                </div>
                <Link href="/dashboard/athletes?subStatus=&sort=" className="h-7 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-widest flex items-center transition-colors">
                  Ver
                </Link>
              </div>
            )}
            {noCheckIn.length > 0 && (
              <div className="flex-1 min-w-[280px] bg-amber-500/10 border border-amber-500/20 rounded-[16px] p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-500">
                    {noCheckIn.length} sin check-in reciente
                  </p>
                  <p className="text-[10px] text-amber-500/70">últimos 14 días</p>
                </div>
                <Link href="/dashboard/athletes?sort=last_attendance" className="h-7 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-widest flex items-center transition-colors">
                  Ver
                </Link>
              </div>
            )}
            {showEmerg && (
              <div className="flex-1 min-w-[280px] rounded-[16px] border border-border bg-muted/40 p-3 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <AlertCircle className="w-4 h-4 text-muted-foreground/50" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">
                    {noEmergPct}% sin teléfono emergencia
                  </p>
                  <p className="text-[10px] text-muted-foreground/50">Faltan {noEmerg.length} registros</p>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Bulk Actions */}
      <BulkActionsWrapper athletes={athletes.map((a) => ({ id: a.id, name: a.name, photo_url: (a as { photo_url?: string | null }).photo_url ?? null, status: a.status, health_status: a.health_status }))} />

      <AthletesFilter plans={plans} categories={categories} />

      {/* ═══════════ ATHLETES TABLE ═══════════ */}
      {error ? (
        <Card className="rounded-2xl border-destructive/20">
          <CardContent className="py-12 text-center text-destructive font-bold">{error}</CardContent>
        </Card>
      ) : athletes.length === 0 ? (
        <DashboardEmptyState
          icon={<Users className="w-8 h-8" />}
          title={params.search ? "Sin resultados" : `No hay ${vocabLower} registrados`}
          description={params.search ? `No encontramos resultados para "${params.search}".` : `Comienza agregando el primer ${vocab.athlete.toLowerCase()} al sistema y activa el dashboard operativo.`}
          action={!params.search ? (
            <Link href="/dashboard/athletes/new">
              <Button className="rounded-xl font-black uppercase tracking-widest text-xs h-11 px-6">Agregar Alumno</Button>
            </Link>
          ) : null}
        />
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[minmax(260px,2.8fr)_120px_minmax(180px,1.5fr)_130px_170px_100px] gap-4 border-b border-border px-6 py-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Atleta</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Estado</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Plan Actual</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Últ. Pago</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Estado Pago</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-right pr-2">Acciones</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border">
            {athletes.map((athlete) => {
              const subs = athlete.subscriptions as Array<{ status: string; plans: { name: string; price?: number; billing_cycle?: string } | null }> | null ?? []
              const activeSub    = subs.find((s) => s.status === 'active')
              const expiredSub   = subs.find((s) => s.status === 'expired')
              const pausedSub    = subs.find((s) => s.status === 'paused')
              const cancelledSub = subs.find((s) => s.status === 'cancelled')

              const pmts = athlete.payments as Array<{ status: string; amount: number; paid_at: string | null; due_date?: string | null }> | null ?? []
              const debt = pmts.filter((p) => p.status === 'overdue').reduce((s, p) => s + Number(p.amount), 0)
              const overdueCount = pmts.filter((p) => p.status === 'overdue').length
              const pendingCount = pmts.filter((p) => p.status === 'pending').length
              const lastPaid = pmts
                .filter((p) => p.status === 'paid' && p.paid_at)
                .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())[0]

              const catId = (athlete as { category_id?: string | null }).category_id
              const cat = categories.find((c) => c.id === catId)
              const catColor = cat?.color

              return (
                <Link key={athlete.id} href={`/dashboard/athletes/${athlete.id}`} className="group block transition-colors hover:bg-muted/50">
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,2.8fr)_120px_minmax(180px,1.5fr)_130px_170px_100px] gap-4 items-center px-6 py-5">

                    {/* ── Athlete ── */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border border-border bg-muted shadow-sm">
                          <AvatarImage src={athlete.photo_url ?? undefined} />
                          <AvatarFallback className="bg-muted text-xs font-black text-muted-foreground">
                            {athlete.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card transition-colors group-hover:border-muted ${athlete.status === 'active' ? 'bg-primary' : athlete.status === 'suspended' ? 'bg-destructive' : 'bg-muted-foreground/40'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="truncate text-[15px] font-bold tracking-tight text-foreground">{athlete.name}</span>
                          <HealthStatusBadge status={athlete.health_status} />
                          {cat && cat.name !== 'General' && (
                            <span className="hidden xl:inline-flex items-center gap-1 rounded-full border border-border bg-muted/80 px-2 py-0.5 text-[9px] font-bold" style={catColor ? { borderColor: catColor, color: catColor } : {}}>
                              {catColor && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />}
                              {cat.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground/50 truncate font-medium flex items-center gap-1.5">
                          <span>{athlete.email ?? '—'}</span>
                          {athlete.birth_date && (() => {
                            const age = Math.floor((nowMs - new Date(athlete.birth_date + 'T12:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                            return <><span>·</span><span>{age} años</span></>
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* ── Status ── */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                        athlete.status === 'active'
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : athlete.status === 'suspended'
                            ? 'bg-destructive/10 text-destructive border-destructive/30'
                            : 'border-border bg-muted/50 text-muted-foreground'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          athlete.status === 'active' ? 'bg-primary' :
                          athlete.status === 'suspended' ? 'bg-destructive' : 'bg-muted-foreground/40'
                        }`} />
                        {athlete.status === 'active' ? 'Activo' : athlete.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
                      </span>
                    </div>

                    {/* ── Plan ── */}
                    <div className="min-w-0">
                      {activeSub?.plans ? (
                        <>
                          <p className="mb-0.5 truncate text-[13px] font-bold text-foreground">{activeSub.plans.name}</p>
                          <p className="text-[11px] text-muted-foreground/50 font-medium">
                            {activeSub.plans.price ? `$${activeSub.plans.price.toLocaleString('es-CL')}/` : ''}{activeSub.plans.billing_cycle === 'monthly' ? 'mes' : activeSub.plans.billing_cycle === 'annual' ? 'año' : activeSub.plans.billing_cycle ?? ''}
                          </p>
                        </>
                      ) : expiredSub ? (
                        <span className="text-xs font-bold text-destructive">Vencida</span>
                      ) : pausedSub ? (
                        <span className="text-xs font-bold text-amber-400">Pausada</span>
                      ) : cancelledSub ? (
                        <span className="text-xs font-bold text-muted-foreground/40">Cancelada</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">Sin plan</span>
                      )}
                    </div>

                    {/* ── Last Payment ── */}
                    <div>
                      {lastPaid?.paid_at ? (
                        <>
                          <p className="mb-0.5 text-[13px] font-bold text-foreground">
                            {new Date(lastPaid.paid_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[11px] text-muted-foreground/50 font-medium">último cobro</p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/30">—</span>
                      )}
                    </div>

                    {/* ── Payment Status ── */}
                    <div className="flex items-center gap-3">
                      {overdueCount > 0 ? (
                        <>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15 text-destructive shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-destructive leading-none mb-1">
                              {overdueCount} Vencido{overdueCount > 1 ? 's' : ''}
                            </p>
                            <p className="text-[11px] text-muted-foreground/50 font-medium">Cobranza</p>
                          </div>
                        </>
                      ) : pendingCount > 0 ? (
                        <>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-amber-400 shrink-0">
                            <Clock className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-amber-400 leading-none mb-1">Pendiente</p>
                            <p className="text-[11px] text-muted-foreground/50 font-medium">Esperando</p>
                          </div>
                        </>
                      ) : lastPaid ? (
                        <>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-primary leading-none mb-1">Pagado</p>
                            <p className="text-[11px] text-muted-foreground/50 font-medium">Al día</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 font-medium">Sin registros</span>
                      )}
                    </div>

                    {/* ── Acciones ── */}
                    <div className="flex items-center gap-2 justify-start lg:justify-end flex-wrap pr-2">
                      {debt > 0 && (
                        <span className="text-[9px] font-black bg-destructive text-white px-2 py-1 rounded-full" title={`Deuda: $${debt.toLocaleString('es-CL')}`}>
                          ${debt >= 1000 ? `${Math.round(debt / 1000)}k` : debt.toLocaleString('es-CL')}
                        </span>
                      )}
                      {(() => {
                        const att = athlete.attendance as Array<{ checked_in_at: string }> | null ?? []
                        const lastCheck = att.map(r => r.checked_in_at).sort().at(-1)
                        const isInactive = athlete.status === 'active' && (!lastCheck || lastCheck < thirtyDaysAgoISO)
                        if (isInactive) return (
                          <span className="text-[9px] font-bold bg-amber-400 text-black px-2 py-1 rounded-full">⚠ inactivo</span>
                        )
                        return null
                      })()}
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-all group-hover:bg-muted/80 group-hover:text-foreground">
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>

                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════════ PAGINATION ═══════════ */}
      {total > 20 && (() => {
        const totalPages = Math.ceil(total / 20)
        const makePageQs = (p: number) => {
          const base: Record<string, string> = {}
          if (params.search)    base.search = params.search
          if (params.status)    base.status = params.status
          if (params.health)    base.health = params.health
          if (params.planId)    base.planId = params.planId
          if (params.subStatus) base.subStatus = params.subStatus
          if (params.categoryId) base.categoryId = params.categoryId
          if (sort)             base.sort = sort
          if (params.inactive === '1') base.inactive = '1'
          if (params.expiredDocs === '1') base.expiredDocs = '1'
          if (params.debtOld60 === '1') base.debtOld60 = '1'
          if (params.ageMin)    base.ageMin = params.ageMin
          if (params.ageMax)    base.ageMax = params.ageMax
          if (params.debtMin)   base.debtMin = params.debtMin
          if (params.debtMax)   base.debtMax = params.debtMax
          if (params.minAtt)   base.minAtt = params.minAtt
          base.page = String(p)
          return new URLSearchParams(base).toString()
        }
        return (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pt-1">
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
              Mostrando {visibleStart}-{visibleEnd} de {total.toLocaleString('es-CL')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {page > 1 && (
                <Link href={`/dashboard/athletes?${makePageQs(page - 1)}`}>
                  <button className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/80 hover:text-foreground">
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                const isCurrent = p === page
                return (
                  <Link key={p} href={`/dashboard/athletes?${makePageQs(p)}`}>
                    <button className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-black transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                        : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/80 hover:text-foreground'
                    }`}>
                      {p}
                    </button>
                  </Link>
                )
              })}
              {page * 20 < total && (
                <Link href={`/dashboard/athletes?${makePageQs(page + 1)}`}>
                  <button className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/80 hover:text-foreground">
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              )}
            </div>
          </div>
        )
      })()}
    </DashboardPage>
  )
}
