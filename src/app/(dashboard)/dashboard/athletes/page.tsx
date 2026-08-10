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
import { UserPlus, AlertCircle, Clock, Users, TrendingUp, UserCheck, Activity, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, MailCheck } from "lucide-react"
import { AthletesFilter } from "@/components/athletes/AthletesFilter"
import { HealthStatusBadge } from "@/components/athletes/HealthStatusBadge"
import { ExportAthletesButton } from "@/components/athletes/ExportAthletesButton"
import { BulkActionsWrapper } from "@/components/athletes/BulkActionsWrapper"
import { SendInvitationDialog } from "@/components/athletes/SendInvitationDialog"
import { AthleteRowActions } from "@/components/athletes/AthleteRowActions"
import { getPaymentReminderHistory } from "@/lib/actions/communications"
import { formatReminderAge, type LastReminder } from "@/lib/payment-reminders"
import { ONLINE_GATEWAY_IDS } from "@/lib/payment-methods"
import {
  ATHLETE_PAYMENT_STATUSES,
  ATHLETE_PAYMENT_STATUS_META,
  deriveAthletePaymentStatus,
  isAthletePaymentStatus,
  type AthletePaymentStatus,
} from "@/lib/payment-status"

const PAGE_SIZE = 20

/** Tope de la consulta "todos" que alimenta KPIs y filtros en memoria (PostgREST max-rows). */
const ALL_ATHLETES_LIMIT = 1000

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    health?: string
    planId?: string
    subStatus?: string
    categoryId?: string
    payStatus?: string
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

type AthleteRow = Awaited<ReturnType<typeof getAthletes>>["athletes"][number]

interface AthletePayment {
  id: string
  status: string
  amount: number
  paid_at: string | null
  due_date?: string | null
  payment_method?: string | null
  notes?: string | null
  concept?: string | null
  plan_id?: string | null
  period_start?: string | null
}

function paymentsOf(a: AthleteRow): AthletePayment[] {
  return (a.payments as AthletePayment[] | null) ?? []
}

function subscriptionsOf(a: AthleteRow) {
  return (a.subscriptions as Array<{ status: string; next_billing_date?: string | null }> | null) ?? []
}

/**
 * Cuota que el alumno ya pagó por transferencia y el admin todavía no valida.
 * Mismo criterio que la tabla de Pagos: transferencia/efectivo con comprobante, nunca pasarela
 * (esas se acreditan solas por webhook).
 */
function pendingTransferOf(a: AthleteRow): AthletePayment | null {
  return (
    paymentsOf(a).find((p) => {
      if (p.status !== 'pending' && p.status !== 'overdue') return false
      if (p.payment_method && (ONLINE_GATEWAY_IDS as readonly string[]).includes(p.payment_method)) return false
      const notes = p.notes ?? ''
      return p.payment_method === 'transfer' || notes.toLowerCase().includes('comprobante')
    }) ?? null
  )
}

function attendanceOf(a: AthleteRow) {
  return (a.attendance as Array<{ checked_in_at: string }> | null) ?? []
}

function documentsOf(a: AthleteRow) {
  return (a.documents as Array<{ expiry_date: string | null }> | null) ?? []
}

function debtOf(a: AthleteRow) {
  return paymentsOf(a)
    .filter((p) => p.status === "overdue")
    .reduce((s, p) => s + Number(p.amount), 0)
}

function paidTotalOf(a: AthleteRow) {
  return paymentsOf(a)
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0)
}

function lastAttendanceOf(a: AthleteRow): string | null {
  return attendanceOf(a).reduce<string | null>((max, r) => (!max || r.checked_in_at > max ? r.checked_in_at : max), null)
}

function lastPaidAtOf(a: AthleteRow): string | null {
  return paymentsOf(a)
    .filter((p) => p.status === "paid" && p.paid_at)
    .reduce<string | null>((max, p) => (!max || p.paid_at! > max ? p.paid_at! : max), null)
}

function ageOf(a: AthleteRow, nowMs: number): number | null {
  const birth = (a as { birth_date?: string | null }).birth_date
  if (!birth) return null
  return Math.floor((nowMs - new Date(`${birth}T12:00:00`).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

export default async function AthletesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? 1) || 1)
  const sort = params.sort ?? ""
  const showInactive = params.inactive === '1'
  const minAtt = params.minAtt ? Number(params.minAtt) : undefined
  const ageMin  = params.ageMin  ? Number(params.ageMin)  : undefined
  const ageMax  = params.ageMax  ? Number(params.ageMax)  : undefined
  const debtMin = params.debtMin ? Number(params.debtMin) : undefined
  const debtMax = params.debtMax ? Number(params.debtMax) : undefined
  const filterExpiredDocs = params.expiredDocs === '1'
  const filterDebtOld60 = params.debtOld60 === '1'
  const payStatus: AthletePaymentStatus | null = isAthletePaymentStatus(params.payStatus) ? params.payStatus : null

  let athletes: AthleteRow[] = []
  let allAthletes: AthleteRow[] = []
  let total = 0
  let error: string | null = null
  let plans: { id: string; name: string }[] = []
  let categories: { id: string; name: string; color: string | null }[] = []
  let pendingEnrollmentsCount = 0
  let reminders: Record<string, LastReminder> = {}

  const now = new Date()
  const nowMs = now.getTime()
  const today = now.toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7)
  const thirtyDaysAgoISO = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgoISO = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString()
  const sixtyDaysAgo = new Date(nowMs - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Filtros y ordenamientos que no se pueden resolver en SQL (dependen de cuotas, asistencia o
  // documentos ya cargados). Si alguno está activo, la paginación se calcula en memoria sobre el
  // set completo — antes se aplicaban SOLO a la página visible y tanto el total como las páginas
  // siguientes quedaban mal.
  const inMemorySorts = ['debt', 'paid', 'docs', 'last_attendance', 'last_payment']
  const hasInMemoryFilter =
    !!payStatus ||
    showInactive ||
    filterExpiredDocs ||
    filterDebtOld60 ||
    ageMin !== undefined ||
    ageMax !== undefined ||
    debtMin !== undefined ||
    debtMax !== undefined ||
    minAtt !== undefined ||
    inMemorySorts.includes(sort)

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
      // Si todo se resuelve en SQL usamos la paginación del servidor (soporta clubes grandes);
      // si no, la página se recorta después sobre `allAthletes`.
      hasInMemoryFilter
        ? Promise.resolve({ athletes: [] as AthleteRow[], total: 0 })
        : getAthletes({ ...filterParams, page, limit: PAGE_SIZE }),
      getAthletes({ ...filterParams, page: 1, limit: ALL_ATHLETES_LIMIT }),
      getPlans(),
      getCategories(true).catch(() => []),
      getPendingEnrollments().catch(() => []),
    ])
    allAthletes = allResult.athletes
    plans = plansData.map((p) => ({ id: p.id, name: p.name }))
    categories = catsData.map((c) => ({ id: c.id, name: c.name, color: c.color ?? null }))
    pendingEnrollmentsCount = pendingEnrollments.length

    if (hasInMemoryFilter) {
      let filtered = allAthletes.slice()

      if (payStatus) {
        filtered = filtered.filter((a) => deriveAthletePaymentStatus({ payments: paymentsOf(a), subscriptions: subscriptionsOf(a) }, today) === payStatus)
      }

      if (showInactive) {
        filtered = filtered.filter((a) => {
          const last = lastAttendanceOf(a)
          return a.status === 'active' && (!last || last < thirtyDaysAgoISO)
        })
      }

      if (ageMin !== undefined || ageMax !== undefined) {
        filtered = filtered.filter((a) => {
          const age = ageOf(a, nowMs)
          if (age === null) return false
          if (ageMin !== undefined && age < ageMin) return false
          if (ageMax !== undefined && age > ageMax) return false
          return true
        })
      }

      if (debtMin !== undefined || debtMax !== undefined) {
        filtered = filtered.filter((a) => {
          const debt = debtOf(a)
          if (debtMin !== undefined && debt < debtMin) return false
          if (debtMax !== undefined && debt > debtMax) return false
          return true
        })
      }

      if (filterExpiredDocs) {
        filtered = filtered.filter((a) => documentsOf(a).some((d) => d.expiry_date && d.expiry_date < today))
      }

      if (filterDebtOld60) {
        filtered = filtered.filter((a) =>
          paymentsOf(a).some((p) => p.status === 'overdue' && p.due_date && p.due_date < sixtyDaysAgo),
        )
      }

      if (minAtt !== undefined) {
        filtered = filtered.filter((a) => attendanceOf(a).length >= minAtt)
      }

      if (sort === 'debt')  filtered.sort((a, b) => debtOf(b) - debtOf(a))
      if (sort === 'paid')  filtered.sort((a, b) => paidTotalOf(b) - paidTotalOf(a))
      if (sort === 'docs')  filtered.sort((a, b) => documentsOf(b).length - documentsOf(a).length)
      if (sort === 'last_attendance') {
        filtered.sort((a, b) => (lastAttendanceOf(b) ?? '').localeCompare(lastAttendanceOf(a) ?? ''))
      }
      if (sort === 'last_payment') {
        filtered.sort((a, b) => (lastPaidAtOf(b) ?? '').localeCompare(lastPaidAtOf(a) ?? ''))
      }

      total = filtered.length
      athletes = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    } else {
      athletes = result.athletes
      total = result.total
    }
    // Último cobro enviado a cada alumno de la página. Vacío si la migración 038 no corrió.
    reminders = await getPaymentReminderHistory(athletes.map((a) => a.id)).catch(() => ({}))
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar alumnos"
  }

  const vocab = await getClubVocab()
  const vocabLower = vocab.athletes.toLowerCase()

  /** Conteo de cartera por estado de cobranza (sobre el universo filtrado en SQL). */
  const payStatusCounts = ATHLETE_PAYMENT_STATUSES.reduce<Record<AthletePaymentStatus, number>>(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<AthletePaymentStatus, number>,
  )
  for (const a of allAthletes) {
    const st = deriveAthletePaymentStatus({ payments: paymentsOf(a), subscriptions: subscriptionsOf(a) }, today)
    payStatusCounts[st] += 1
  }

  const statusCounts = {
    active: athletes.filter((a) => a.status === "active").length,
    injured: athletes.filter((a) => a.health_status === "injured").length,
  }

  const totalDebt = allAthletes.reduce((sum, a) => sum + debtOf(a), 0)

  const avgAttendanceRate = (() => {
    const active = allAthletes.filter((a) => a.status === 'active')
    if (active.length === 0) return null
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    const thirtyISO = thirtyAgo.toISOString()
    const rates = active.map((a) => attendanceOf(a).filter((r) => r.checked_in_at >= thirtyISO).length)
    const avg = rates.reduce((s, r) => s + r, 0) / active.length
    return +avg.toFixed(1)
  })()

  const expiredDocsCount = allAthletes.reduce(
    (sum, a) => sum + documentsOf(a).filter((d) => d.expiry_date && d.expiry_date < today).length,
    0,
  )

  const newThisMonth = allAthletes.filter((a) => (a.created_at ?? '').startsWith(currentMonth)).length
  const visibleStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const visibleEnd = Math.min(page * PAGE_SIZE, total)
  const thirtyDaysAgoDate = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const buildPayStatusHref = (key: AthletePaymentStatus) => {
    const qs = new URLSearchParams()
    if (params.search)     qs.set('search', params.search)
    if (params.status)     qs.set('status', params.status)
    if (params.health)     qs.set('health', params.health)
    if (params.planId)     qs.set('planId', params.planId)
    if (params.subStatus)  qs.set('subStatus', params.subStatus)
    if (params.categoryId) qs.set('categoryId', params.categoryId)
    if (payStatus !== key) qs.set('payStatus', key)
    const q = qs.toString()
    return q ? `/dashboard/athletes?${q}` : '/dashboard/athletes'
  }

  return (
    <DashboardPage>
      {/* ── GREETING ── */}
      <DashboardPageHeader
        className="order-1 md:order-none"
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
          <div className="flex items-center gap-2 flex-wrap">
            {pendingEnrollmentsCount > 0 && (
              <Link href="/dashboard/athletes/pending">
                <Button variant="outline" className="gap-2 h-11 rounded-xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs uppercase tracking-widest">
                  <Clock className="w-4 h-4" />
                  Pendientes
                  <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-amber-500 border-amber-500/20">
                    {pendingEnrollmentsCount}
                  </Badge>
                </Button>
              </Link>
            )}
            <ExportAthletesButton athletes={allAthletes} />
            <SendInvitationDialog />
            <Link href="/dashboard/athletes/new">
              <Button className="gap-2 h-11 px-5 rounded-xl font-black uppercase tracking-widest text-xs bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90">
                <UserPlus className="w-4 h-4" />
                Nuevo Alumno
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── CARTERA POR ESTADO DE PAGO (filtro rápido: el más usado) ── */}
      <div className="order-2 -mx-4 overflow-x-auto px-4 pb-1 md:order-none md:mx-0 md:px-0 md:overflow-visible">
        <div className="flex min-w-max items-stretch gap-2 md:min-w-0 md:flex-wrap">
          <Link
            href={(() => {
              const qs = new URLSearchParams()
              if (params.search)     qs.set('search', params.search)
              if (params.status)     qs.set('status', params.status)
              if (params.health)     qs.set('health', params.health)
              if (params.planId)     qs.set('planId', params.planId)
              if (params.subStatus)  qs.set('subStatus', params.subStatus)
              if (params.categoryId) qs.set('categoryId', params.categoryId)
              const q = qs.toString()
              return q ? `/dashboard/athletes?${q}` : '/dashboard/athletes'
            })()}
            className={`flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-3 transition-colors ${
              payStatus === null
                ? 'border-foreground/30 bg-muted'
                : 'border-border bg-card hover:bg-muted/50'
            }`}
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">Todos</span>
            <span className="text-lg font-black leading-none text-foreground">{allAthletes.length}</span>
          </Link>

          {ATHLETE_PAYMENT_STATUSES.map((key) => {
            const meta = ATHLETE_PAYMENT_STATUS_META[key]
            const active = payStatus === key
            return (
              <Link
                key={key}
                href={buildPayStatusHref(key)}
                className={`flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-3 transition-colors ${
                  active ? 'border-foreground/30 bg-muted' : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">{meta.filterLabel}</span>
                <span className={`text-lg font-black leading-none ${meta.text}`}>{payStatusCounts[key]}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div className="order-8 grid grid-cols-2 md:order-none md:grid-cols-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1.6fr] gap-3">

        {/* Activos */}
        <Link href="/dashboard/athletes?status=active" className="block h-full">
          <div className="rounded-[20px] border border-border bg-card p-4 md:p-5 shadow-sm transition-colors hover:bg-muted/50 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-4 md:mb-5">
              <Users className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Activos</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black tracking-tight text-primary leading-none">{statusCounts.active}</p>
              <p className="text-[13px] text-muted-foreground/60 mt-2 font-normal">{vocabLower} activos</p>
            </div>
          </div>
        </Link>

        {/* Lesionados */}
        <Link href="/dashboard/athletes?health=injured" className="block h-full">
          <div className="rounded-[20px] border border-border bg-card p-4 md:p-5 shadow-sm transition-colors hover:bg-muted/50 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-4 md:mb-5">
              <Activity className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Lesionados</p>
            </div>
            <div>
              <p className={`text-3xl md:text-4xl font-black tracking-tight leading-none ${statusCounts.injured > 0 ? 'text-red-500' : 'text-foreground'}`}>{statusCounts.injured}</p>
              <p className="text-[13px] text-muted-foreground/60 mt-2 font-normal">con lesión activa</p>
            </div>
          </div>
        </Link>

        {/* Asistencia Promedio */}
        {avgAttendanceRate !== null ? (
          <div className="rounded-[20px] border border-border bg-card p-4 md:p-5 shadow-sm h-full flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-4 md:mb-5">
              <TrendingUp className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Asistencia</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-none">{avgAttendanceRate}</p>
              <p className="text-[13px] text-muted-foreground/60 mt-2 font-normal">check-ins/activo (30d)</p>
            </div>
          </div>
        ) : (
          <div className="rounded-[20px] border border-border bg-card p-4 md:p-5 shadow-sm h-full flex flex-col justify-between">
            <div className="flex items-center gap-2.5 mb-4 md:mb-5">
              <TrendingUp className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Docs Vencidos</p>
            </div>
            <div>
              <p className={`text-3xl md:text-4xl font-black tracking-tight leading-none ${expiredDocsCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>{expiredDocsCount}</p>
              <p className="text-[13px] text-muted-foreground/60 mt-2 font-normal">documentos vencidos</p>
            </div>
          </div>
        )}

        {/* Con Plan */}
        {(() => {
          const active = allAthletes.filter((a) => a.status === 'active')
          if (active.length === 0) return (
            <div className="rounded-[20px] border border-border bg-card p-4 md:p-5 shadow-sm h-full flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-4 md:mb-5">
                <UserCheck className="w-5 h-5 text-muted-foreground/50" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Con Plan</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black tracking-tight text-muted-foreground/30 leading-none">—</p>
                <p className="text-[13px] text-muted-foreground/60 mt-2 font-normal">sin {vocabLower} activos</p>
              </div>
            </div>
          )
          const withSub = active.filter((a) => subscriptionsOf(a).some((s) => s.status === 'active')).length
          const pct = Math.round((withSub / active.length) * 100)
          return (
            <Link href="/dashboard/subscriptions" className="block h-full">
              <div className="rounded-[20px] border border-border bg-card p-4 md:p-5 shadow-sm transition-colors hover:bg-muted/50 h-full flex flex-col justify-between">
                <div className="flex items-center gap-2.5 mb-4 md:mb-5">
                  <UserCheck className="w-5 h-5 text-muted-foreground/50" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Con Plan</p>
                </div>
                <div>
                  <p className={`text-3xl md:text-4xl font-black tracking-tight leading-none ${pct >= 80 ? 'text-emerald-500' : pct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</p>
                  <p className="text-[13px] text-muted-foreground/60 mt-2 font-normal">{withSub}/{active.length} activos</p>
                </div>
              </div>
            </Link>
          )
        })()}

        {/* Featured: Deuda Total */}
        <Link href={buildPayStatusHref('overdue')} className="block h-full col-span-2 md:col-span-2 lg:col-span-1">
          <div className="rounded-[20px] border border-border bg-card p-4 md:p-5 shadow-sm h-full flex flex-col justify-between transition-colors hover:bg-muted/50">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Deuda Total</p>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${totalDebt > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                <AlertCircle className={`w-5 h-5 ${totalDebt > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
              </div>
            </div>
            <div>
              <p className={`text-3xl lg:text-4xl font-black leading-none tracking-tight ${totalDebt > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {totalDebt > 0 ? `$${totalDebt >= 1000 ? `${Math.round(totalDebt / 1000)}k` : totalDebt.toLocaleString('es-CL')}` : 'Sin deuda'}
              </p>
              <p className="text-[13px] text-muted-foreground/60 mt-1.5 font-normal">
                {totalDebt > 0 ? 'en pagos vencidos' : 'todos al día'}
              </p>
            </div>
            {expiredDocsCount > 0 && (
              <div className="mt-auto pt-3 border-t border-border">
                <p className="text-[11px] text-amber-500 font-bold">{expiredDocsCount} doc{expiredDocsCount !== 1 ? 's' : ''} vencido{expiredDocsCount !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </Link>
      </div>

      {(() => {
        const active = allAthletes.filter((a) => a.status === 'active')
        if (active.length < 5) return null
        const withOverdue = active.filter((a) => paymentsOf(a).some((p) => p.status === 'overdue')).length
        const pct = Math.round((withOverdue / active.length) * 100)
        if (pct < 30) return null
        return (
          <Link href={buildPayStatusHref('overdue')} className="order-9 md:order-none">
            <div className="rounded-2xl border border-destructive/20 bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent p-4 md:p-5 flex items-center gap-4 hover:border-destructive/40 transition-colors cursor-pointer">
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
          const att = attendanceOf(a)
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
          <div className="order-10 flex flex-wrap gap-3 md:order-none">
            {noSub.length > 0 && (
              <div className="flex-1 min-w-[260px] bg-amber-500/10 border border-amber-500/20 rounded-[16px] p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-amber-500">
                    {noSub.length} activo{noSub.length !== 1 ? 's' : ''} sin suscripción
                  </p>
                  <p className="text-[11px] text-amber-500/70">hace más de 30 días</p>
                </div>
                <Link href={buildPayStatusHref('none')} className="h-8 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[11px] font-bold uppercase tracking-widest flex items-center transition-colors shrink-0">
                  Ver
                </Link>
              </div>
            )}
            {noCheckIn.length > 0 && (
              <div className="flex-1 min-w-[260px] bg-amber-500/10 border border-amber-500/20 rounded-[16px] p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-amber-500">
                    {noCheckIn.length} sin check-in reciente
                  </p>
                  <p className="text-[11px] text-amber-500/70">últimos 14 días</p>
                </div>
                <Link href="/dashboard/athletes?sort=last_attendance" className="h-8 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[11px] font-bold uppercase tracking-widest flex items-center transition-colors shrink-0">
                  Ver
                </Link>
              </div>
            )}
            {showEmerg && (
              <div className="flex-1 min-w-[260px] rounded-[16px] border border-border bg-muted/40 p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <AlertCircle className="w-4 h-4 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">
                    {noEmergPct}% sin teléfono emergencia
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">Faltan {noEmerg.length} registros</p>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Bulk Actions */}
      <div className="order-4 md:order-none">
        <BulkActionsWrapper athletes={athletes.map((a) => ({ id: a.id, name: a.name, photo_url: (a as { photo_url?: string | null }).photo_url ?? null, status: a.status, health_status: a.health_status }))} />
      </div>

      <div className="order-3 md:order-none">
        <AthletesFilter plans={plans} categories={categories} />
      </div>

      {/* ═══════════ ATHLETES TABLE ═══════════ */}
      {error ? (
        <Card className="order-5 rounded-2xl border-destructive/20 md:order-none">
          <CardContent className="py-12 text-center text-destructive font-bold">{error}</CardContent>
        </Card>
      ) : athletes.length === 0 ? (
        <DashboardEmptyState
          className="order-5 md:order-none"
          icon={<Users className="w-8 h-8" />}
          title={params.search || payStatus ? "Sin resultados" : `No hay ${vocabLower} registrados`}
          description={
            params.search
              ? `No encontramos resultados para "${params.search}".`
              : payStatus
                ? `Ningún ${vocab.athlete.toLowerCase()} coincide con el estado de pago "${ATHLETE_PAYMENT_STATUS_META[payStatus].filterLabel}".`
                : `Comienza agregando el primer ${vocab.athlete.toLowerCase()} al sistema y activa el dashboard operativo.`
          }
          action={!params.search && !payStatus ? (
            <Link href="/dashboard/athletes/new">
              <Button className="rounded-xl font-black uppercase tracking-widest text-xs h-11 px-6">Agregar Alumno</Button>
            </Link>
          ) : (
            <Link href="/dashboard/athletes">
              <Button variant="outline" className="rounded-xl font-black uppercase tracking-widest text-xs h-11 px-6">Limpiar filtros</Button>
            </Link>
          )}
        />
      ) : (
        <div className="order-5 overflow-hidden rounded-[24px] border border-border bg-card shadow-sm md:order-none">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[minmax(230px,2.4fr)_105px_minmax(150px,1.2fr)_115px_140px_150px_80px] gap-4 border-b border-border px-6 py-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Atleta</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Estado</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Plan Actual</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Últ. Pago</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Próx. Pago</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Estado Pago</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-right pr-2">Acciones</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border">
            {athletes.map((athlete) => {
              const subs = athlete.subscriptions as Array<{ status: string; current_period_end?: string | null; next_billing_date?: string | null; billing_anchor_day?: number | null; plans: { name: string; price?: number; billing_cycle?: string } | null }> | null ?? []
              const activeSub    = subs.find((s) => s.status === 'active')
              const expiredSub   = subs.find((s) => s.status === 'expired')
              const pausedSub    = subs.find((s) => s.status === 'paused')
              const cancelledSub = subs.find((s) => s.status === 'cancelled')

              const pmts = paymentsOf(athlete)
              const debt = debtOf(athlete)
              const overdueCount = pmts.filter((p) => p.status === 'overdue').length
              const lastPaid = pmts
                .filter((p) => p.status === 'paid' && p.paid_at)
                .sort((a, b) => new Date(b.paid_at!).getTime() - new Date(a.paid_at!).getTime())[0]

              // "Al día" honesto: solo si el período actual está cubierto (el próximo cobro es
              // futuro). Sin esto, un alumno sin cuotas generadas (anclas NULL) aparecía "Al día"
              // aunque no pague hace meses.
              const nextBilling = activeSub?.next_billing_date ?? null
              const payState = deriveAthletePaymentStatus({ payments: pmts, subscriptions: subs }, today)
              const payMeta = ATHLETE_PAYMENT_STATUS_META[payState]
              const payHint =
                payState === 'overdue'
                  ? `${overdueCount} vencido${overdueCount > 1 ? 's' : ''}`
                  : payState === 'current' && nextBilling
                    ? `Hasta ${new Date(`${nextBilling}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`
                    : payState === 'none' && lastPaid
                      ? 'Sin plan activo'
                      : payMeta.hint

              const PayIcon = payState === 'current' ? CheckCircle2 : payState === 'overdue' ? AlertCircle : Clock

              const catId = (athlete as { category_id?: string | null }).category_id
              const cat = categories.find((c) => c.id === catId)
              const catColor = cat?.color

              const statusLabel = athlete.status === 'active' ? 'Activo' : athlete.status === 'inactive' ? 'Inactivo' : 'Suspendido'
              const statusClass =
                athlete.status === 'active'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : athlete.status === 'suspended'
                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                    : 'border-border bg-muted/50 text-muted-foreground'
              const statusDot =
                athlete.status === 'active' ? 'bg-primary' : athlete.status === 'suspended' ? 'bg-destructive' : 'bg-muted-foreground/40'

              const planLabel = activeSub?.plans
                ? activeSub.plans.name
                : expiredSub ? 'Suscripción vencida'
                : pausedSub ? 'Suscripción pausada'
                : cancelledSub ? 'Suscripción cancelada'
                : 'Sin plan'

              const age = ageOf(athlete, nowMs)

              const anchorDay = activeSub?.billing_anchor_day ?? null
              const pendingTransfer = pendingTransferOf(athlete)
              const lastReminder = reminders[athlete.id] ?? null
              const reminderLabel = lastReminder ? formatReminderAge(lastReminder.sentAt, nowMs) : null
              const nextDue = nextBilling
                ? new Date(`${nextBilling}T12:00:00`)
                : null
              const nextDueOverdue = !!nextBilling && nextBilling <= today

              const rowActions = (
                <AthleteRowActions
                  athleteId={athlete.id}
                  athleteName={athlete.name}
                  status={athlete.status}
                  billingAnchorDay={anchorDay}
                  hasEmail={!!athlete.email}
                  debt={debt}
                  lastReminder={lastReminder}
                  pendingTransfer={
                    pendingTransfer
                      ? {
                          id: pendingTransfer.id,
                          concept: pendingTransfer.concept ?? 'Cuota',
                          amount: Number(pendingTransfer.amount),
                          due_date: pendingTransfer.due_date ?? today,
                          notes: pendingTransfer.notes ?? null,
                          athlete_id: athlete.id,
                          plan_id: pendingTransfer.plan_id ?? null,
                          period_start: pendingTransfer.period_start ?? null,
                          plans: activeSub?.plans
                            ? { name: activeSub.plans.name, billing_cycle: activeSub.plans.billing_cycle }
                            : null,
                        }
                      : null
                  }
                />
              )

              return (
                // Enlace "estirado": la fila entera navega al perfil, pero el menú de acciones
                // vive por encima (z-10) y captura sus propios clics. Un <button> dentro de un <a>
                // sería HTML inválido y rompería el dropdown.
                <div key={athlete.id} className="group relative transition-colors hover:bg-muted/50 active:bg-muted/60">
                  <Link
                    href={`/dashboard/athletes/${athlete.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={`Ver perfil de ${athlete.name}`}
                  />

                  {/* ══ MOBILE / TABLET CARD ══ */}
                  <div className="lg:hidden p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border border-border bg-muted shadow-sm">
                          <AvatarImage src={athlete.photo_url ?? undefined} />
                          <AvatarFallback className="bg-muted text-xs font-black text-muted-foreground">
                            {athlete.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${statusDot}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-bold leading-tight tracking-tight text-foreground">{athlete.name}</p>
                        <p className="mt-1 truncate text-[12px] font-medium text-muted-foreground/70">
                          {athlete.email ?? '—'}{age !== null ? ` · ${age} años` : ''}
                        </p>
                      </div>
                      <div className="relative z-10 shrink-0">{rowActions}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${statusClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                        {statusLabel}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${payMeta.bg} ${payMeta.text}`}>
                        <PayIcon className="h-3.5 w-3.5" />
                        {payMeta.label}
                      </span>
                      <HealthStatusBadge status={athlete.health_status} />
                      {cat && cat.name !== 'General' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/80 px-2 py-1 text-[11px] font-bold" style={catColor ? { borderColor: catColor, color: catColor } : {}}>
                          {catColor && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catColor }} />}
                          {cat.name}
                        </span>
                      )}
                      {debt > 0 && (
                        <span className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-black text-white">
                          ${debt.toLocaleString('es-CL')}
                        </span>
                      )}
                      {reminderLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-1 text-[11px] font-bold text-muted-foreground">
                          <MailCheck className="h-3 w-3" />
                          {reminderLabel}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 rounded-xl bg-muted/40 px-3 py-2 text-[12px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate font-semibold text-foreground/80">{planLabel}</span>
                        <span className="shrink-0 text-muted-foreground/70">
                          {lastPaid?.paid_at
                            ? `Últ. pago ${new Date(lastPaid.paid_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`
                            : payHint}
                        </span>
                      </div>
                      {nextDue && (
                        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-1.5">
                          <span className="text-muted-foreground/70">Próximo cobro</span>
                          <span className={`font-semibold ${nextDueOverdue ? 'text-red-600 dark:text-red-400' : 'text-foreground/80'}`}>
                            {nextDue.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                            {anchorDay ? <span className="ml-1 font-normal text-muted-foreground/60">· día {anchorDay}</span> : null}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ══ DESKTOP GRID ══ */}
                  <div className="hidden lg:grid grid-cols-[minmax(230px,2.4fr)_105px_minmax(150px,1.2fr)_115px_140px_150px_80px] gap-4 items-center px-6 py-5">

                    {/* ── Athlete ── */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-12 w-12 border border-border bg-muted shadow-sm">
                          <AvatarImage src={athlete.photo_url ?? undefined} />
                          <AvatarFallback className="bg-muted text-xs font-black text-muted-foreground">
                            {athlete.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card transition-colors group-hover:border-muted ${statusDot}`} />
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
                        <p className="text-[11px] text-muted-foreground/60 truncate font-medium flex items-center gap-1.5">
                          <span>{athlete.email ?? '—'}</span>
                          {age !== null && <><span>·</span><span>{age} años</span></>}
                        </p>
                      </div>
                    </div>

                    {/* ── Status ── */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${statusClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                        {statusLabel}
                      </span>
                    </div>

                    {/* ── Plan ── */}
                    <div className="min-w-0">
                      {activeSub?.plans ? (
                        <>
                          <p className="mb-0.5 truncate text-[13px] font-bold text-foreground">{activeSub.plans.name}</p>
                          <p className="text-[11px] text-muted-foreground/60 font-medium">
                            {activeSub.plans.price ? `$${activeSub.plans.price.toLocaleString('es-CL')}/` : ''}{activeSub.plans.billing_cycle === 'monthly' ? 'mes' : activeSub.plans.billing_cycle === 'annual' ? 'año' : activeSub.plans.billing_cycle ?? ''}
                          </p>
                        </>
                      ) : expiredSub ? (
                        <span className="text-xs font-bold text-destructive">Vencida</span>
                      ) : pausedSub ? (
                        <span className="text-xs font-bold text-amber-500">Pausada</span>
                      ) : cancelledSub ? (
                        <span className="text-xs font-bold text-muted-foreground/50">Cancelada</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Sin plan</span>
                      )}
                    </div>

                    {/* ── Last Payment ── */}
                    <div>
                      {lastPaid?.paid_at ? (
                        <>
                          <p className="mb-0.5 text-[13px] font-bold text-foreground">
                            {new Date(lastPaid.paid_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60 font-medium">último cobro</p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* ── Next Payment ── */}
                    <div>
                      {nextDue ? (
                        <>
                          <p className={`mb-0.5 text-[13px] font-bold ${nextDueOverdue ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                            {nextDue.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-[11px] text-muted-foreground/60 font-medium truncate">
                            {anchorDay ? `día ${anchorDay} de cada mes` : 'próximo cobro'}
                          </p>
                        </>
                      ) : activeSub ? (
                        <span className="text-xs text-muted-foreground/40" title="La suscripción no tiene próximo cobro programado">Sin programar</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* ── Payment Status ── */}
                    <div className="flex items-center gap-3">
                      {payState === 'none' && !activeSub ? (
                        <span className="text-xs text-muted-foreground/50 font-medium">
                          {lastPaid ? 'Sin plan activo' : 'Sin registros'}
                        </span>
                      ) : (
                        <>
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${payMeta.bg} ${payMeta.text}`}>
                            <PayIcon className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className={`text-[13px] font-bold leading-none mb-1 ${payMeta.text}`}>{payMeta.label}</p>
                            <p className="text-[11px] text-muted-foreground/60 font-medium truncate">{payHint}</p>
                            {reminderLabel && (
                              <p
                                className="mt-1 flex items-center gap-1 text-[10px] font-bold text-muted-foreground/70"
                                title={`Último cobro enviado: ${new Date(lastReminder!.sentAt).toLocaleString('es-CL')}${lastReminder!.sentCount > 1 ? ` · ${lastReminder!.sentCount} envíos` : ''}`}
                              >
                                <MailCheck className="h-3 w-3 shrink-0" />
                                {reminderLabel}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* ── Acciones ── */}
                    <div className="relative z-10 flex items-center justify-end gap-2 pr-1">
                      {debt > 0 && (
                        <span className="text-[9px] font-black bg-red-500 text-white px-2 py-1 rounded-full" title={`Deuda: $${debt.toLocaleString('es-CL')}`}>
                          ${debt >= 1000 ? `${Math.round(debt / 1000)}k` : debt.toLocaleString('es-CL')}
                        </span>
                      )}
                      {rowActions}
                    </div>

                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════════ PAGINATION ═══════════ */}
      {total > PAGE_SIZE && (() => {
        const totalPages = Math.ceil(total / PAGE_SIZE)
        const makePageQs = (p: number) => {
          const base: Record<string, string> = {}
          if (params.search)    base.search = params.search
          if (params.status)    base.status = params.status
          if (params.health)    base.health = params.health
          if (params.planId)    base.planId = params.planId
          if (params.subStatus) base.subStatus = params.subStatus
          if (params.categoryId) base.categoryId = params.categoryId
          if (payStatus)        base.payStatus = payStatus
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
          <div className="order-6 flex flex-col gap-4 md:order-none lg:flex-row lg:items-center lg:justify-between pt-1">
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
              Mostrando {visibleStart}-{visibleEnd} de {total.toLocaleString('es-CL')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {page > 1 && (
                <Link href={`/dashboard/athletes?${makePageQs(page - 1)}`}>
                  <button className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/80 hover:text-foreground">
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(Math.max(1, totalPages - 4), page - 2)) + i
                const isCurrent = p === page
                return (
                  <Link key={p} href={`/dashboard/athletes?${makePageQs(p)}`}>
                    <button className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-black transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                        : 'border border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/80 hover:text-foreground'
                    }`}>
                      {p}
                    </button>
                  </Link>
                )
              })}
              {page * PAGE_SIZE < total && (
                <Link href={`/dashboard/athletes?${makePageQs(page + 1)}`}>
                  <button className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-xs font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/80 hover:text-foreground">
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
