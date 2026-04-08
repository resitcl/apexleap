export const dynamic = "force-dynamic"

import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getAthletePortal } from "@/lib/actions/dashboard"
import type { OnboardingData } from "@/lib/athlete-enrollment-shared"
import { getOnboardingData, getMyRosters, getMyMatches } from "@/lib/actions/athlete-enrollment"
import { getUserRole } from "@/lib/actions/club-context"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportConfig } from "@/lib/sport-fields"
import { getSportVocab } from "@/lib/sport-vocab"
import { getEvents } from "@/lib/actions/events"
import { getMediaItems } from "@/lib/actions/media"
import { SmoothcompEventsWidget, SmoothcompEventsSkeleton } from "@/components/athlete/SmoothcompEventsWidget"
import { AthleteOnboardingWizard } from "@/components/athlete/AthleteOnboardingWizard"
import { AthleteProfileOnboardingWrapper } from "@/components/athlete/AthleteProfileOnboardingWrapper"
import { PlatformTourWizard } from "@/components/athlete/PlatformTourWizard"
import { EnrollmentRequestWizard, PendingApprovalScreen, RejectedScreen } from "@/components/athlete/EnrollmentRequestWizard"
import { PendingAdminPaymentScreen } from "@/components/athlete/PendingAdminPaymentScreen"
import { AthleteDashboardRankCard } from "@/components/athlete/AthleteDashboardRankCard"
import { Button } from "@/components/ui/button"
import {
  Calendar, AlertTriangle, Trophy, FileText,
  CreditCard, Clock, ChevronRight, Swords,
  BarChart3, Shirt, MapPin,
  UserCheck, Wallet, Zap, CheckCircle2,
} from "lucide-react"

export default async function AthletePage({ searchParams }: { searchParams?: Promise<{ range?: string }> }) {
  const resolvedParams = await searchParams
  const attendanceRange = resolvedParams?.range === '6m' ? '6m' : '8w'
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const role = await getUserRole().catch(() => 'athlete' as const)
  let onboardingData: OnboardingData | null = null
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

  // Primer pago (transferencia/efectivo): sin acceso al portal hasta que el admin confirme
  const showAwaitingAdminPayment = role === "athlete" && onboardingData?.hasPendingPayment === true
  if (showAwaitingAdminPayment && onboardingData) {
    return (
      <PendingAdminPaymentScreen
        clubName={onboardingData.club.name}
        primaryColor={onboardingData.club.primary_color}
        logoUrl={onboardingData.club.logo_url}
        planName={onboardingData.pendingPaymentPlanName}
      />
    )
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
  try {
    const settings = await getClubSettings()
    const s = settings as { sport_type?: string | null }
    sportType = s?.sport_type ?? null
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

  const { athlete, sessions, monthCheckIns, weeklyCheckIns, upcomingComps } = data
  const today = new Date()
  
  let upcomingClubEvents: Awaited<ReturnType<typeof getEvents>> = []
  try {
    const allEvents = await getEvents({ from: today.toISOString().split("T")[0] })
    upcomingClubEvents = allEvents.filter((e) => e.is_visible_to_athletes !== false).slice(0, 3)
  } catch { /* silent */ }

  type MediaHubItem = {
    id: string
    title: string
    type: string
    category: string | null
    media_date: string | null
    created_at: string
    url: string
  }
  let latestMedia: MediaHubItem | null = null
  try {
    const mediaResult = await getMediaItems({ page: 1, limit: 1, visibilityIn: ['public', 'members'] })
    const firstMedia = (mediaResult?.items?.[0] ?? null) as MediaHubItem | null
    latestMedia = firstMedia
  } catch { /* silent */ }

  const todayDate = today.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })
  const hour = today.getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"

  if (!athlete) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">No se encontró tu perfil de atleta.</p>
        <p className="text-xs text-muted-foreground">Esto puede ocurrir si el pago aún está siendo procesado.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/athlete">Reintentar</Link>
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
  const weekTotal  = weeklyCheckIns.reduce((a, b) => a + b, 0)
  const weekAvg    = weekTotal > 0 ? (weekTotal / 8).toFixed(1) : '0'
  const sessionsPluralEs: Record<string, string> = {
    Clase: "clases",
    Entrenamiento: "entrenamientos",
    Sesión: "sesiones",
    WOD: "WOD",
  }
  const sessionKpiSubtitle = `${sessionsPluralEs[vocab.session] ?? `${vocab.session.toLowerCase()}s`} por semana`
  const firstName  = athlete.name?.split(' ')[0] ?? ''
  void sessions // used for potential future features

  const beltLevel = (techMeta?.belt as string | undefined) ?? null

  return (
    <div className="space-y-4 pb-12 pt-1">

      {/* ── GREETING ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-5xl sm:text-6xl font-black leading-[1.1] tracking-tighter">
            {greeting}, <span className="text-primary">{firstName}.</span>
          </h1>
          <p className="text-base text-muted-foreground/80 mt-2 font-medium">
            {upcomingComps.length > 0
              ? (() => {
                  const next = upcomingComps[0]
                  const daysToComp = Math.ceil((new Date(next.start_date + 'T12:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  return `Tus métricas van en alza. ${daysToComp} días para ${next.name}.`
                })()
              : 'Tus métricas de rendimiento están activas.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 shrink-0 border border-border/40 rounded-xl px-4 py-3 bg-card/40 backdrop-blur-sm shadow-sm transition-all hover:bg-muted/50">
          <Calendar className="w-4 h-4 text-primary" />
          <span>{todayDate}</span>
        </div>
      </div>

      {/* ── ALERTS ── */}
      {overduePayments.length > 0 && (
        <Link href="/dashboard/athlete/payments" className="block group">
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-4 hover:bg-red-500/[0.15] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">
                {overduePayments.length} pago{overduePayments.length > 1 ? 's' : ''} vencido{overduePayments.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-red-500/70 font-medium">Regulariza tu situación para seguir entrenando</p>
            </div>
            <ChevronRight className="w-4 h-4 text-red-500/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </Link>
      )}
      {expiredDocs.length > 0 && (
        <Link href="/dashboard/athlete/documents" className="block group">
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-4 hover:bg-amber-500/[0.15] transition-colors">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {expiredDocs.length} documento{expiredDocs.length > 1 ? 's' : ''} por renovar
              </p>
              <p className="text-xs text-amber-500/70 font-medium">
                {expiredDocs[0]?.name}{expiredDocs.length > 1 ? ` y ${expiredDocs.length - 1} más` : ''}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </Link>
      )}

      {/* ── KPI ROW: 4 cards + RANK card (estructura Stitch) ── */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">

        {/* CHECK-INS */}
        <Link href="/dashboard/athlete/attendance" className="block">
          <div className="rounded-2xl bg-card p-6 border border-border hover:bg-muted/40 transition-colors h-full flex flex-col justify-between group shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <UserCheck className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Asistencias</p>
            </div>
            <div>
              <p className="text-5xl font-black tracking-tighter text-primary leading-none">{monthCheckIns}</p>
              <p className="text-[13px] text-muted-foreground/60 mt-2.5 font-medium">Este mes</p>
            </div>
          </div>
        </Link>

        {/* PAYMENTS / SUBSCRIPTION */}
        <Link href="/dashboard/athlete/payments" className="block">
          <div className="rounded-2xl bg-card p-6 border border-border hover:bg-muted/40 transition-colors h-full flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Wallet className="w-4 h-4 text-muted-foreground/60" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Suscripción</p>
            </div>
            <div>
              {activeSub ? (
                <>
                  <p className={`text-[28px] font-black tracking-tight leading-none uppercase ${
                    daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-amber-500' : 
                    daysUntilExpiry !== null && daysUntilExpiry <= 0 ? 'text-red-500' : 'text-primary'
                  }`}>
                    {daysUntilExpiry !== null ? (
                      daysUntilExpiry <= 0 ? 'Vencida' : `${daysUntilExpiry}d`
                    ) : 'Activa'}
                  </p>
                  <p className="text-[13px] mt-2.5 font-medium text-muted-foreground/60">
                    {daysUntilExpiry !== null && daysUntilExpiry > 0 
                      ? `Vigente hasta ${new Date(activeSub.end_date!).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`
                      : daysUntilExpiry !== null && daysUntilExpiry <= 0 
                        ? 'Renovar ahora'
                        : activeSub.plans?.name ?? 'Plan activo'
                    }
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[28px] font-black tracking-tight leading-none uppercase text-muted-foreground/40">
                    Sin plan
                  </p>
                  <p className="text-[13px] mt-2.5 font-medium text-muted-foreground/60">
                    Contacta al admin
                  </p>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* SESSIONS */}
        <Link href="/dashboard/athlete/schedule" className="block">
          <div className="rounded-2xl bg-card p-6 border border-border hover:bg-muted/40 transition-colors h-full flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-4 h-4 text-muted-foreground/60" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Promedio</p>
            </div>
            <div>
              <p className="text-5xl font-black tracking-tighter text-foreground leading-none">{weekAvg}</p>
              <p className="text-[13px] text-muted-foreground/60 mt-2.5 font-medium">{sessionKpiSubtitle}</p>
            </div>
          </div>
        </Link>

        {/* DOCUMENTS */}
        <Link href="/dashboard/athlete/documents" className="block">
          <div className="rounded-2xl bg-card p-6 border border-border hover:bg-muted/40 transition-colors h-full flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-4 h-4 text-muted-foreground/60" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Documentos</p>
            </div>
            <div>
              <p className={`text-[28px] font-black tracking-tight leading-none uppercase ${expiredDocs.length > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                {expiredDocs.length > 0 ? expiredDocs.length : 'Al día'}
              </p>
              <p className="text-[13px] mt-2.5 font-medium flex items-center gap-1.5">
                {expiredDocs.length > 0
                  ? <span className="text-muted-foreground/60">{expiredDocs.length} por renovar</span>
                  : <><CheckCircle2 className="w-4 h-4 text-primary" /><span className="text-primary">Verificados</span></>
                }
              </p>
            </div>
          </div>
        </Link>

        </div>

        <AthleteDashboardRankCard sportType={sportType} beltLevel={beltLevel} stripesRaw={techMeta?.stripes} />
      </div>

      <div className="grid lg:grid-cols-5 gap-4 items-start pb-8">
      {/* ── LEFT COLUMN (3/5): Media HUB + Attendance + Events ── */}
      <div className="space-y-4 lg:col-span-3">
          {/* ÚLTIMO CONTENIDO MEDIA HUB */}
          <div className="rounded-2xl bg-card p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xl font-black tracking-tight">Último contenido</p>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Media HUB</span>
            </div>
            {latestMedia ? (
              <div className="space-y-3">
                <p className="text-sm font-bold leading-snug">{latestMedia.title}</p>
                <p className="text-[11px] text-muted-foreground/60 font-medium">
                  {(latestMedia.type ?? 'contenido').toUpperCase()}
                  {latestMedia.category ? ` · ${latestMedia.category}` : ''}
                  {' · '}
                  {new Date(
                    latestMedia.media_date
                      ? `${latestMedia.media_date}T12:00:00`
                      : latestMedia.created_at
                  ).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {latestMedia.url && (
                    <a href={latestMedia.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
                      Abrir contenido <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <Link href="/dashboard/athlete/content" className="text-xs text-primary font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
                    Ver Media HUB <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground/60 font-medium">Aún no hay contenido publicado en el Media HUB.</p>
                <Link href="/dashboard/athlete/content" className="text-xs text-primary font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Ir al Media HUB <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* ATTENDANCE TRENDS */}
        <div className="rounded-2xl bg-card p-6 md:p-8 border border-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-2xl font-black tracking-tight">Tendencia de asistencia</p>
              <p className="text-sm text-muted-foreground/60 font-medium mt-1.5">
                {attendanceRange === '6m'
                  ? 'Intensidad de asistencia en los últimos 6 meses'
                  : 'Intensidad de asistencia en las últimas 8 semanas'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg overflow-hidden border border-border/30 bg-muted/20">
                <Link
                  href="?range=8w"
                  className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${attendanceRange === '8w' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50'}`}
                >
                  8 semanas
                </Link>
                <Link
                  href="?range=6m"
                  className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] transition-colors ${attendanceRange === '6m' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50'}`}
                >
                  6 meses
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2 h-32">
            {weeklyCheckIns.map((count, i) => {
              const heightPct = weekMax > 0 ? Math.max((count / weekMax) * 100, count > 0 ? 10 : 0) : 0
              const isCurrentWeek = i === weeklyCheckIns.length - 1
              const label = attendanceRange === '6m' ? `M${i + 1}` : `S${i + 1}`
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  {count > 0 && (
                    <span className="text-[9px] font-bold text-muted-foreground/40 leading-none">{count}</span>
                  )}
                  <div className="w-full flex items-end" style={{ height: '100px' }}>
                    <div
                      className="w-full rounded-sm transition-all duration-500"
                      style={{
                        height: heightPct > 0 ? `${heightPct}%` : '3px',
                        backgroundColor: isCurrentWeek ? '#34d399' : heightPct > 0 ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)',
                      }}
                    />
                  </div>
                  <span className={`text-[9px] font-bold leading-none uppercase tracking-wide ${isCurrentWeek ? 'text-primary' : 'text-muted-foreground/25'}`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* PRÓXIMOS EVENTOS DEL CLUB */}
        <div className="rounded-2xl bg-card p-6 border border-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xl font-black tracking-tight">Próximos Eventos</p>
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          
          {upcomingClubEvents.length > 0 ? (
            <div className="space-y-4">
              {upcomingClubEvents.map((ev) => {
                const evDate = new Date(ev.event_date + 'T12:00:00')
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 border border-border flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/70 leading-none">{evDate.toLocaleDateString('es-CL', { month: 'short' })}</span>
                      <span className="text-sm font-black text-foreground leading-tight mt-0.5">{evDate.getDate()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-snug">{ev.name}</p>
                      <p className="text-[11px] text-muted-foreground/60 font-medium mt-1 flex flex-wrap gap-2">
                        {ev.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ev.start_time.slice(0, 5)} {ev.end_time ? `- ${ev.end_time.slice(0, 5)}` : ''}</span>}
                      </p>
                      {ev.event_type && (
                        <span className="inline-block mt-1.5 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                          {ev.event_type}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/50 font-medium py-4">No hay eventos próximos en el calendario.</p>
          )}
          
          <Link href="/dashboard/calendar" className="mt-auto pt-4 text-xs text-primary font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
            Ver calendario completo <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── RIGHT COLUMN (2/5): TORNEOS EN CHILE ── */}
      {(upcomingComps.length > 0 || sportType === 'Jiu-Jitsu') && (
        <div className="rounded-2xl bg-card p-6 border border-border shadow-sm flex flex-col lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xl font-black tracking-tight">
                {sportType === 'Jiu-Jitsu' ? 'Torneos en Chile' : vocab.competitions}
              </p>
              <Trophy className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 overflow-hidden">
              {upcomingComps.length > 0 && (
                <div className="space-y-0">
                  {upcomingComps.slice(0, 3).map((c) => {
                    const compDate = new Date(c.start_date + 'T12:00:00')
                    const daysTo = Math.ceil((compDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    return (
                      <div key={c.id} className="py-2.5 border-b border-border/20 last:border-0 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[8px] uppercase font-bold text-primary/70 leading-none">
                            {compDate.toLocaleDateString('es-CL', { month: 'short' })}
                          </span>
                          <span className="text-sm font-black text-primary leading-tight">{compDate.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-snug truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-medium mt-0.5 flex items-center gap-2">
                            {c.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{c.location}</span>}
                          </p>
                        </div>
                        <span className="text-[10px] font-black text-primary shrink-0">{daysTo}D</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {sportType === 'Jiu-Jitsu' && (
                <Suspense fallback={<SmoothcompEventsSkeleton />}>
                  <SmoothcompEventsWidget />
                </Suspense>
              )}
            </div>

            <Link href="/dashboard/competitions" className="mt-auto pt-3 text-xs text-primary font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
        </div>
      )}
      </div>

      {/* ── TEAM SPORT WIDGETS ── */}
      {isTeamSport && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-card p-5 border border-border shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2 mb-4">
              <Swords className="w-3.5 h-3.5" /> Próximo Partido
            </p>
            {nextMatch ? (
              <div>
                <p className="text-xl font-black leading-tight">vs. {nextMatch.opponent ?? 'Por definir'}</p>
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2 flex-wrap font-medium">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />
                    {new Date(nextMatch.match_date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">{nextMatch.is_home ? 'Local' : 'Visita'}</span>
                </p>
                {nextMatch.location && <p className="text-xs text-muted-foreground/60 mt-1.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {nextMatch.location}</p>}
                <Link href="/dashboard/athlete/matches" className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-bold hover:gap-2 transition-all">
                  Ver historial <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 font-medium">No hay partidos programados.</p>
            )}
          </div>
          <div className="rounded-2xl bg-card p-5 border border-border shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2 mb-4">
              <BarChart3 className="w-3.5 h-3.5" /> Mi Récord
            </p>
            {finishedMatches.length > 0 ? (
              <div>
                <div className="flex items-center gap-5 mb-4">
                  <div><p className="text-2xl font-black text-primary">{teamWins}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50 mt-0.5">Victorias</p></div>
                  <div><p className="text-2xl font-black text-amber-500">{teamDraws}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50 mt-0.5">Empates</p></div>
                  <div><p className="text-2xl font-black text-red-500">{teamLosses}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/50 mt-0.5">Derrotas</p></div>
                </div>
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden flex">
                  {teamWins   > 0 && <div className="bg-primary h-full" style={{ width: `${(teamWins / finishedMatches.length) * 100}%` }} />}
                  {teamDraws  > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(teamDraws / finishedMatches.length) * 100}%` }} />}
                  {teamLosses > 0 && <div className="bg-red-500 h-full" style={{ width: `${(teamLosses / finishedMatches.length) * 100}%` }} />}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/50 font-medium">Sin partidos finalizados aún.</p>
            )}
          </div>
        </div>
      )}

      {isTeamSport && nextRoster && (
        <Link href="/dashboard/athlete/rosters" className="block group">
          <div className="rounded-2xl bg-primary/[0.08] border border-primary/20 p-4 flex items-center gap-4 hover:bg-primary/[0.12] transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              {nextRoster.number ? <span className="text-base font-black text-primary">{nextRoster.number}</span> : <Shirt className="w-5 h-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground">Citado: {nextRoster.rosters!.name}</p>
              <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">
                {new Date(nextRoster.rosters!.match_date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' })}
                {nextRoster.position && ` · ${nextRoster.position}`}
                {nextRoster.is_captain && ' · © Capitán'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </Link>
      )}

      {/* ── PENDING PAYMENTS ── */}
      {pendingPayments.length > 0 && (
        <div className="rounded-2xl bg-card p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-500" /> Pagos Pendientes
            </p>
            <Link href="/dashboard/athlete/payments" className="text-xs text-primary font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border/40">
            {pendingPayments.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${p.status === 'overdue' ? 'bg-red-500/15' : 'bg-muted/50'}`}>
                    {p.status === 'overdue' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{p.concept || 'Cuota'}</p>
                    {p.due_date && <p className="text-xs text-muted-foreground/50 mt-0.5">{new Date(p.due_date + 'T12:00:00').toLocaleDateString('es-CL')}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">${Number(p.amount).toLocaleString('es-CL')}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${p.status === 'overdue' ? 'bg-red-500/15 text-red-500' : 'bg-muted/50 text-muted-foreground/60'}`}>
                    {p.status === 'overdue' ? 'Vencido' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
