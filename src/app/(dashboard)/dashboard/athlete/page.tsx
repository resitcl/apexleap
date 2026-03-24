export const dynamic = "force-dynamic"

import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getAthletePortal } from "@/lib/actions/dashboard"
import { getOnboardingData, getMyRosters, getMyMatches } from "@/lib/actions/athlete-enrollment"
import { getUserRole } from "@/lib/actions/club-context"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportConfig } from "@/lib/sport-fields"
import { getSportVocab } from "@/lib/sport-vocab"
import { AthleteIdentityCard } from "@/components/athlete/AthleteIdentityCard"
import { SmoothcompEventsWidget, SmoothcompEventsSkeleton } from "@/components/athlete/SmoothcompEventsWidget"
import { AthleteOnboardingWizard } from "@/components/athlete/AthleteOnboardingWizard"
import { AthleteProfileOnboardingWrapper } from "@/components/athlete/AthleteProfileOnboardingWrapper"
import { PlatformTourWizard } from "@/components/athlete/PlatformTourWizard"
import { EnrollmentRequestWizard, PendingApprovalScreen, RejectedScreen } from "@/components/athlete/EnrollmentRequestWizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar, AlertTriangle, Trophy, FileText,
  CreditCard, Clock, ChevronRight, Shield, Flame,
  ClipboardCheck, Film, PenLine, Repeat2, Swords,
  ClipboardList, BarChart3, Shirt, MapPin,
} from "lucide-react"

const SEMAFORO_CONFIG = {
  green:  { label: "Apto para entrenar",  gradient: "from-green-500 to-emerald-600", text: "text-green-700",  border: "border-green-300", card: "bg-gradient-to-br from-green-50 to-emerald-50",  emoji: "🟢", subtitle: "Todo en orden — ¡listo para entrenar!" },
  yellow: { label: "En Observación",      gradient: "from-yellow-400 to-amber-500",  text: "text-yellow-700", border: "border-yellow-300", card: "bg-gradient-to-br from-yellow-50 to-amber-50", emoji: "🟡", subtitle: "Estás en período de observación. Consulta con tu entrenador." },
  red:    { label: "Acceso Restringido",  gradient: "from-red-500 to-rose-600",      text: "text-red-700",    border: "border-red-300",    card: "bg-gradient-to-br from-red-50 to-rose-50",     emoji: "🔴", subtitle: "Tienes restricciones activas. Revisa tu estado." },
}

const BILLING_LABEL: Record<string, string> = {
  monthly: "mensual", quarterly: "trimestral", semiannual: "semestral", annual: "anual",
}

export default async function AthletePage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const role = await getUserRole().catch(() => 'athlete' as const)
  let onboardingData: Awaited<ReturnType<typeof getOnboardingData>> | null = null
  if (role === 'athlete') {
    onboardingData = await getOnboardingData().catch(() => null)
  }

  // Team sports enrollment flow states
  const showEnrollmentRequest = role === 'athlete' && onboardingData?.needsEnrollmentRequest === true
  const showPendingApproval = role === 'athlete' && onboardingData?.isPendingApproval === true
  const showRejected = role === 'athlete' && onboardingData?.isRejected === true
  
  // Standard onboarding states
  const showPaymentOnboarding = role === 'athlete' && onboardingData?.needsOnboarding === true
  const showProfileOnboarding = role === 'athlete' && onboardingData?.needsProfileOnboarding === true
  const showPlatformTour = role === 'athlete' && onboardingData?.needsPlatformTour === true

  // 0. For team sports: Show enrollment request form (not yet approved)
  if (showEnrollmentRequest && onboardingData) {
    return (
      <EnrollmentRequestWizard
        data={onboardingData}
        sportConfig={getSportConfig(onboardingData.club.sport_type)}
      />
    )
  }

  // 0b. For team sports: Show pending approval screen
  if (showPendingApproval && onboardingData) {
    return <PendingApprovalScreen data={onboardingData} />
  }

  // 0c. For team sports: Show rejected screen
  if (showRejected && onboardingData) {
    return <RejectedScreen data={onboardingData} />
  }

  // 1. Payment/Plan selection onboarding (approved or non-team sport, no subscription yet)
  if (showPaymentOnboarding && onboardingData) {
    return (
      <AthleteOnboardingWizard
        data={onboardingData}
        sportConfig={getSportConfig(onboardingData.club.sport_type)}
      />
    )
  }

  let sportType:     string | null = null
  let primaryColor   = '#6366F1'
  let secondaryColor = '#FFFFFF'
  try {
    const settings = await getClubSettings()
    const s = settings as { sport_type?: string | null; primary_color?: string | null; secondary_color?: string | null }
    sportType     = s?.sport_type     ?? null
    primaryColor  = s?.primary_color  ?? primaryColor
    secondaryColor = s?.secondary_color ?? secondaryColor
  } catch { /* silent */ }
  const vocab = getSportVocab(sportType)

  // 2. Profile completion onboarding (has subscription, but profile incomplete)
  if (showProfileOnboarding && onboardingData) {
    return (
      <AthleteProfileOnboardingWrapper
        data={onboardingData}
        sportConfig={getSportConfig(onboardingData.club.sport_type)}
      />
    )
  }

  // 3. Platform tour (profile complete, but tour not done)
  if (showPlatformTour && onboardingData) {
    const isTeamSport = onboardingData.isTeamSport
    return (
      <PlatformTourWizard
        data={onboardingData}
        isTeamSport={isTeamSport}
      />
    )
  }

  let data: Awaited<ReturnType<typeof getAthletePortal>> | null = null
  let error = ""

  try {
    data = await getAthletePortal()
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar"
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{error || "Sin datos"}</p>
      </div>
    )
  }

  const { athlete, sessions, monthCheckIns, weeklyCheckIns, semaforo, upcomingComps } = data
  const cfg = SEMAFORO_CONFIG[semaforo]
  const today = new Date()
  const todayDate = today.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })
  const hour = today.getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">No se encontró tu perfil de atleta.</p>
        <p className="text-xs text-muted-foreground">Esto puede ocurrir si el pago aún está siendo procesado.</p>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Reintentar
        </Button>
      </div>
    )
  }

  type Payment = { id: string; concept: string; amount: number; status: string; due_date: string | null; paid_at: string | null }
  type Subscription = { id: string; status: string; start_date: string | null; end_date: string | null; plans: { id: string; name: string; price: number; billing_cycle: string } | null }
  type Document = { id: string; name: string; status: string; expiry_date: string | null }

  const payments = (athlete as { payments?: Payment[] }).payments ?? []
  const subscriptions = (athlete as { subscriptions?: Subscription[] }).subscriptions ?? []
  const documents = (athlete as { documents?: Document[] }).documents ?? []

  const activeSub = subscriptions.find((s) => s.status === "active")
  const pendingPayments = payments.filter((p) => p.status === "pending" || p.status === "overdue")
  const overduePayments = payments.filter((p) => p.status === "overdue")
  const expiredDocs = documents.filter((d) => d.status === "expired" || (d.expiry_date && d.expiry_date < today.toISOString().split("T")[0]))

  const nowTime = today.toTimeString().slice(0, 5)
  const nextSession = sessions.find((s) => s.start_time >= nowTime) ?? sessions[0] ?? null

  const daysUntilExpiry = activeSub?.end_date
    ? Math.ceil((new Date(activeSub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Team sport data
  const isTeamSport = vocab.isTeamSport
  let myRosters: Awaited<ReturnType<typeof getMyRosters>> = []
  let myMatches: Awaited<ReturnType<typeof getMyMatches>> = []
  if (isTeamSport) {
    try { myRosters = await getMyRosters() } catch { /* silent */ }
    try { myMatches = await getMyMatches() } catch { /* silent */ }
  }

  type TeamMatch = { id: string; opponent: string | null; match_date: string; is_home: boolean; home_score: number | null; away_score: number | null; status: string; location: string | null }
  const typedMatches = myMatches as unknown as TeamMatch[]
  const finishedMatches = typedMatches.filter((m) => m.status === "finished")
  const teamWins = finishedMatches.filter((m) => { const o = m.is_home ? m.home_score : m.away_score; const t = m.is_home ? m.away_score : m.home_score; return o !== null && t !== null && o > t }).length
  const teamDraws = finishedMatches.filter((m) => m.home_score !== null && m.home_score === m.away_score).length
  const teamLosses = finishedMatches.length - teamWins - teamDraws

  const todayStr = today.toISOString().split("T")[0]
  const nextRoster = myRosters.find((r) => r.rosters!.match_date >= todayStr)
  const nextMatch = typedMatches.find((m) => m.match_date >= todayStr && m.status !== "finished")

  // ─── Computed helpers ─────────────────────────────────────────────────────
  const techMeta = (athlete as { technical_meta?: Record<string, unknown> | null }).technical_meta ?? {}
  const weekMax  = Math.max(...weeklyCheckIns, 1)
  let streak = 0
  for (let i = weeklyCheckIns.length - 1; i >= 0; i--) {
    if (weeklyCheckIns[i] > 0) streak++
    else break
  }
  const weekTotal  = weeklyCheckIns.reduce((a, b) => a + b, 0)
  const weekAvg    = weekTotal > 0 ? (weekTotal / 8).toFixed(1) : '0'
  const firstName  = athlete.name?.split(' ')[0] ?? ''

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-2xl text-white"
        style={{
          background: `linear-gradient(135deg, #0f172a 0%, ${primaryColor}28 55%, #0f172a 100%)`,
          minHeight: 170,
        }}
      >
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl pointer-events-none"
             style={{ background: `${primaryColor}22` }} />
        <div className="absolute -bottom-10 left-0 w-48 h-48 rounded-full translate-y-1/4 -translate-x-1/4 blur-3xl pointer-events-none"
             style={{ background: `${primaryColor}18` }} />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            {/* Left: greeting */}
            <div>
              <p className="text-xs text-white/40 font-semibold uppercase tracking-widest capitalize">{todayDate}</p>
              <h1 className="text-2xl sm:text-3xl font-black mt-1 leading-tight">
                {greeting}, {firstName} 👋
              </h1>
              <p className="text-sm text-white/40 mt-0.5">{vocab.sport}</p>
            </div>

            {/* Right: status badge */}
            <div className={`shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1.5 border ${cfg.card} ${cfg.border} mt-1`}>
              <span className="text-base leading-none">{cfg.emoji}</span>
              <div>
                <p className={`text-xs font-bold leading-tight ${cfg.text}`}>{cfg.label}</p>
                <p className={`text-[10px] leading-tight ${cfg.text} opacity-70`}>
                  {semaforo === 'green' && 'Sin restricciones'}
                  {semaforo === 'yellow' && 'En observación'}
                  {semaforo === 'red' && overduePayments.length > 0 ? 'Pago pendiente' : semaforo === 'red' ? 'Lesión activa' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Mini stats strip inside hero */}
          <div className="mt-5 flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-2xl font-black leading-none">{monthCheckIns}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Clases este mes</p>
            </div>
            {streak > 0 && (
              <div>
                <p className="text-2xl font-black leading-none text-amber-400">{streak}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Semanas seguidas 🔥</p>
              </div>
            )}
            {daysUntilExpiry !== null && (
              <div>
                <p className={`text-2xl font-black leading-none ${daysUntilExpiry <= 7 ? 'text-red-400' : 'text-white'}`}>
                  {daysUntilExpiry}d
                </p>
                <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">Membresía</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SPORT IDENTITY (belt / jersey / combat)
      ══════════════════════════════════════════ */}
      <AthleteIdentityCard
        sportType={sportType}
        technicalMeta={techMeta}
        athleteName={athlete.name ?? ''}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        jerseyNumber={nextRoster?.number != null ? String(nextRoster.number) : null}
      />

      {/* ══════════════════════════════════════════
          KPI CARDS
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* Check-ins */}
        <Link href="/dashboard/athlete/attendance" className="block">
          <div className="rounded-xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden h-full">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide">MES</span>
              </div>
              <p className="text-3xl font-black tracking-tight text-blue-600">{monthCheckIns}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check-ins</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">~{weekAvg}/semana</p>
            </div>
          </div>
        </Link>

        {/* Payments */}
        <Link href="/dashboard/athlete/payments" className="block">
          <div className={`rounded-xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden h-full ${pendingPayments.length > 0 ? 'ring-2 ring-red-200 dark:ring-red-900' : ''}`}>
            <div className={`h-1 ${pendingPayments.length > 0 ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pendingPayments.length > 0 ? 'bg-red-100 dark:bg-red-950' : 'bg-green-100 dark:bg-green-950'}`}>
                  <CreditCard className={`w-4 h-4 ${pendingPayments.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide">PAGOS</span>
              </div>
              <p className={`text-3xl font-black tracking-tight ${pendingPayments.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {pendingPayments.length > 0 ? pendingPayments.length : '✓'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingPayments.length > 0 ? `${pendingPayments.length > 1 ? 'cuotas pendientes' : 'cuota pendiente'}` : 'Al día'}
              </p>
            </div>
          </div>
        </Link>

        {/* Documents */}
        <Link href="/dashboard/athlete/documents" className="block">
          <div className={`rounded-xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden h-full ${expiredDocs.length > 0 ? 'ring-2 ring-orange-200 dark:ring-orange-900' : ''}`}>
            <div className={`h-1 ${expiredDocs.length > 0 ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 'bg-gradient-to-r from-green-500 to-teal-500'}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expiredDocs.length > 0 ? 'bg-orange-100 dark:bg-orange-950' : 'bg-green-100 dark:bg-green-950'}`}>
                  <FileText className={`w-4 h-4 ${expiredDocs.length > 0 ? 'text-orange-600' : 'text-green-600'}`} />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide">DOCS</span>
              </div>
              <p className={`text-3xl font-black tracking-tight ${expiredDocs.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {expiredDocs.length > 0 ? expiredDocs.length : '✓'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {expiredDocs.length > 0 ? 'Por renovar' : 'Documentos OK'}
              </p>
            </div>
          </div>
        </Link>

        {/* Membership */}
        <Link href="/dashboard/athlete/subscription" className="block">
          <div className={`rounded-xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden h-full ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'ring-2 ring-yellow-200 dark:ring-yellow-900' : ''}`}>
            <div className={`h-1 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'bg-yellow-100 dark:bg-yellow-950' : 'bg-violet-100 dark:bg-violet-950'}`}>
                  <Shield className={`w-4 h-4 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-yellow-600' : 'text-violet-600'}`} />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide">PLAN</span>
              </div>
              <p className={`text-3xl font-black tracking-tight ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-yellow-600' : 'text-violet-600'}`}>
                {daysUntilExpiry !== null ? `${daysUntilExpiry}d` : '∞'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeSub?.plans?.name ?? 'Membresía'}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* ══════════════════════════════════════════
          ATTENDANCE CHART — Last 8 weeks
      ══════════════════════════════════════════ */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Asistencia</p>
              <p className="text-base font-bold mt-0.5">Últimas 8 semanas</p>
            </div>
            <div className="flex gap-4 text-right">
              {streak > 0 && (
                <div>
                  <p className="text-xl font-black text-amber-500">{streak}</p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase">Racha 🔥</p>
                </div>
              )}
              <div>
                <p className="text-xl font-black">{weekAvg}</p>
                <p className="text-[10px] text-muted-foreground/60 uppercase">Promedio/sem</p>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5 h-20 mt-2">
            {weeklyCheckIns.map((count, i) => {
              const heightPct = weekMax > 0 ? Math.max((count / weekMax) * 100, count > 0 ? 12 : 0) : 0
              const isCurrentWeek = i === weeklyCheckIns.length - 1
              const d = new Date()
              d.setDate(d.getDate() - 7 * (7 - i))
              const label = d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace('.', '')
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[9px] font-semibold text-muted-foreground/70 leading-none">
                    {count > 0 ? count : ''}
                  </span>
                  <div className="w-full relative flex items-end" style={{ height: '72px' }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: heightPct > 0 ? `${heightPct}%` : '2px',
                        background: isCurrentWeek
                          ? `linear-gradient(180deg, ${primaryColor} 0%, ${primaryColor}BB 100%)`
                          : heightPct > 0
                            ? `${primaryColor}45`
                            : 'hsl(var(--muted))',
                        opacity: heightPct > 0 ? 1 : 0.4,
                      }}
                    />
                  </div>
                  <span className={`text-[9px] leading-none whitespace-nowrap ${isCurrentWeek ? 'font-black text-foreground' : 'text-muted-foreground/50'}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ALERTS
      ══════════════════════════════════════════ */}
      {overduePayments.length > 0 && (
        <Link href="/dashboard/athlete/payments" className="block">
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {overduePayments.length} pago{overduePayments.length > 1 ? 's' : ''} vencido{overduePayments.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-600/70">Regulariza tu situación para seguir entrenando</p>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400 shrink-0" />
          </div>
        </Link>
      )}

      {expiredDocs.length > 0 && (
        <Link href="/dashboard/athlete/documents" className="block">
          <div className="rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-4 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                {expiredDocs.length} documento{expiredDocs.length > 1 ? 's' : ''} por renovar
              </p>
              <p className="text-xs text-orange-600/70">
                {expiredDocs[0]?.name}{expiredDocs.length > 1 ? ` y ${expiredDocs.length - 1} más` : ''}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-orange-400 shrink-0" />
          </div>
        </Link>
      )}

      {/* ══════════════════════════════════════════
          TEAM SPORT WIDGETS
      ══════════════════════════════════════════ */}
      {isTeamSport && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 mb-3">
                <Swords className="w-3.5 h-3.5" /> Próximo Partido
              </p>
              {nextMatch ? (
                <div>
                  <p className="text-lg font-bold">vs. {nextMatch.opponent ?? 'Por definir'}</p>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />
                      {new Date(nextMatch.match_date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </span>
                    <Badge variant="outline" className="text-xs">{nextMatch.is_home ? 'Local' : 'Visita'}</Badge>
                  </p>
                  {nextMatch.location && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {nextMatch.location}</p>}
                  <Link href="/dashboard/athlete/matches" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver historial <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">No hay partidos programados.</p>
                  <Link href="/dashboard/athlete/matches" className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver historial <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-500 via-yellow-400 to-red-400" />
            <div className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 mb-3">
                <BarChart3 className="w-3.5 h-3.5" /> Mi Récord
              </p>
              {finishedMatches.length > 0 ? (
                <div>
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="text-2xl font-black text-green-600">{teamWins}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Victorias</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-yellow-600">{teamDraws}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Empates</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-red-600">{teamLosses}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Derrotas</p>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex mt-3">
                    {teamWins   > 0 && <div className="bg-green-500 h-full" style={{ width: `${(teamWins / finishedMatches.length) * 100}%` }} />}
                    {teamDraws  > 0 && <div className="bg-yellow-400 h-full" style={{ width: `${(teamDraws / finishedMatches.length) * 100}%` }} />}
                    {teamLosses > 0 && <div className="bg-red-400 h-full" style={{ width: `${(teamLosses / finishedMatches.length) * 100}%` }} />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {finishedMatches.length} partidos · {Math.round((teamWins / finishedMatches.length) * 100)}% victorias
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Sin partidos finalizados aún.</p>
                  <Link href="/dashboard/athlete/stats" className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver estadísticas <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isTeamSport && nextRoster && (
        <Link href="/dashboard/athlete/rosters" className="block">
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-4 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
              {nextRoster.number
                ? <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{nextRoster.number}</span>
                : <Shirt className="w-5 h-5 text-indigo-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Citado: {nextRoster.rosters!.name}</p>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400">
                {new Date(nextRoster.rosters!.match_date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' })}
                {nextRoster.position && ` · ${nextRoster.position}`}
                {nextRoster.is_captain && ' · © Capitán'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-indigo-400 shrink-0" />
          </div>
        </Link>
      )}

      {/* ══════════════════════════════════════════
          NEXT CLASS + MEMBERSHIP
      ══════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-sky-400 to-blue-500" />
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5" /> Próxima Clase Hoy
            </p>
            {nextSession ? (
              <div>
                <p className="text-lg font-bold leading-tight">{nextSession.name}</p>
                <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {nextSession.start_time.slice(0, 5)} – {nextSession.end_time.slice(0, 5)}
                  {nextSession.capacity && (
                    <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">{nextSession.capacity} cupos</span>
                  )}
                </p>
                <Link href="/dashboard/athlete/schedule" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  Ver horario completo <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">No hay clases programadas para hoy.</p>
                <Link href="/dashboard/athlete/schedule" className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  Ver horario semanal <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className={`h-1 ${activeSub ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-muted'}`} />
          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5 mb-3">
              <Repeat2 className="w-3.5 h-3.5" /> Mi Membresía
            </p>
            {activeSub ? (
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold leading-tight">{activeSub.plans?.name ?? 'Plan activo'}</p>
                  <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800 text-xs">Activa</Badge>
                </div>
                {activeSub.plans?.price != null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ${activeSub.plans.price.toLocaleString('es-CL')} / {BILLING_LABEL[activeSub.plans.billing_cycle ?? 'monthly'] ?? activeSub.plans.billing_cycle}
                  </p>
                )}
                {activeSub.end_date && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Vence: {new Date(activeSub.end_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                <Link href="/dashboard/athlete/subscription" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  Ver detalle <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">No tienes una membresía activa.</p>
                <Link href="/dashboard/athlete/select-plan">
                  <Button size="sm" className="mt-2">Elegir un plan</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PENDING PAYMENTS DETAIL
      ══════════════════════════════════════════ */}
      {pendingPayments.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-500" /> Pagos Pendientes
              </p>
              <Link href="/dashboard/athlete/payments" className="text-xs text-primary hover:underline font-medium">Ver todos</Link>
            </div>
            <div className="space-y-2">
              {pendingPayments.slice(0, 3).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${p.status === 'overdue' ? 'bg-red-100 dark:bg-red-950' : 'bg-muted'}`}>
                      {p.status === 'overdue'
                        ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.concept || 'Cuota'}</p>
                      {p.due_date && <p className="text-xs text-muted-foreground">Vence: {new Date(p.due_date + 'T12:00:00').toLocaleDateString('es-CL')}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">${Number(p.amount).toLocaleString('es-CL')}</span>
                    <Badge variant={p.status === 'overdue' ? 'destructive' : 'secondary'} className="text-xs">
                      {p.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          UPCOMING COMPETITIONS
      ══════════════════════════════════════════ */}
      {upcomingComps.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="p-5">
            <p className="text-sm font-bold flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" /> Próximas Competencias
            </p>
            <div className="space-y-2">
              {upcomingComps.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(c.start_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                      {c.location && <span>· {c.location}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SMOOTHCOMP TORNEOS (BJJ only)
      ══════════════════════════════════════════ */}
      {sportType === 'Jiu-Jitsu' && (
        <Suspense fallback={<SmoothcompEventsSkeleton />}>
          <SmoothcompEventsWidget />
        </Suspense>
      )}

      {/* ══════════════════════════════════════════
          QUICK ACCESS
      ══════════════════════════════════════════ */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 px-0.5">Accesos rápidos</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { href: '/dashboard/athlete/profile',    icon: PenLine,        label: 'Mi Perfil',   color: 'text-violet-600 bg-violet-100 dark:bg-violet-950 dark:text-violet-400' },
            { href: '/dashboard/athlete/attendance',  icon: ClipboardCheck, label: 'Asistencia',  color: 'text-blue-600 bg-blue-100 dark:bg-blue-950 dark:text-blue-400' },
            { href: '/dashboard/athlete/schedule',    icon: Calendar,       label: 'Horarios',    color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-950 dark:text-cyan-400' },
            { href: '/dashboard/athlete/payments',    icon: CreditCard,     label: 'Pagos',       color: 'text-green-600 bg-green-100 dark:bg-green-950 dark:text-green-400' },
            { href: '/dashboard/athlete/content',     icon: Film,           label: 'Contenido',   color: 'text-pink-600 bg-pink-100 dark:bg-pink-950 dark:text-pink-400' },
            { href: '/dashboard/athlete/documents',   icon: FileText,       label: 'Documentos',  color: 'text-amber-600 bg-amber-100 dark:bg-amber-950 dark:text-amber-400' },
            ...(isTeamSport ? [
              { href: '/dashboard/athlete/rosters', icon: ClipboardList, label: 'Citaciones', color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400' },
              { href: '/dashboard/athlete/matches', icon: Swords,        label: 'Partidos',   color: 'text-purple-600 bg-purple-100 dark:bg-purple-950 dark:text-purple-400' },
              { href: '/dashboard/athlete/stats',   icon: BarChart3,     label: 'Stats',      color: 'text-orange-600 bg-orange-100 dark:bg-orange-950 dark:text-orange-400' },
            ] : []),
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <div className="rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm">
                <div className="py-4 flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-center leading-tight">{item.label}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
