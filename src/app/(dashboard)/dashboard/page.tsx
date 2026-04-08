export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import {
  getDashboardSummary,
  getRecentActivity,
  getMonthlyRevenue,
  getTodaySessions,
  getOverdueAlerts,
  getUpcomingSchedules,
  getExpiringSubscriptions,
  getWeeklyAttendanceRate,
  getExpiredDocuments,
  getAthletesWithoutPlan,
  getWeeklyAttendanceByDay,
  getMonthlyRetentionRate,
  getDormantAthletes,
  getAthleteGrowth,
  getMonthlyAttendance,
  getUpcomingMatches,
  getSeasonRecord,
  getBeltDistribution,
  getUpcomingGraduations,
  getSmartAlerts,
} from "@/lib/actions/dashboard"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getUserRole } from "@/lib/actions/club-context"
import { getCompetitions } from "@/lib/actions/competitions"
import { getActiveSeason } from "@/lib/actions/seasons"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportVocab } from "@/lib/sport-vocab"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Users, DollarSign, AlertCircle, AlertTriangle, UserPlus,
  CreditCard, QrCode, UserCheck, TrendingUp, TrendingDown,
  Calendar, Wallet, ChevronRight, Trophy, Swords, Award,
  Activity, FileText, ClipboardCheck, BarChart3, MapPin,
  Zap, Settings, Clock, Phone, Camera, IdCard, UserX,
} from "lucide-react"

export default async function DashboardPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const role = await getUserRole().catch(() => 'admin' as const)
  if (role === 'athlete') redirect("/dashboard/athlete")

  // Get club settings for sport type
  let sportType: string | null = null
  let clubName = 'Tu Club'
  try {
    const settings = await getClubSettings()
    const s = settings as { sport_type?: string | null; name?: string | null }
    sportType = s?.sport_type ?? null
    clubName = s?.name ?? 'Tu Club'
  } catch { /* silent */ }

  const vocab = getSportVocab(sportType)
  const isTeamSport = vocab.isTeamSport

  // Initialize data
  let summary = {
    totalAthletes: 0, mrr: 0, monthlyIncome: 0, pendingAmount: 0, overdueAmount: 0,
    todayCheckIns: 0, semaforoCount: { green: 0, yellow: 0, red: 0 },
    topAthletes: [] as { id: string; name: string; count: number }[],
    activeSubscriptions: 0, topDebtors: [] as { id: string; name: string; debt: number }[],
    totalAllAthletes: 0, newThisMonth: 0, cancelledThisMonth: 0, prevMonthIncome: 0,
  }
  let activity: Awaited<ReturnType<typeof getRecentActivity>> = []
  let monthlyRevenue: Awaited<ReturnType<typeof getMonthlyRevenue>> = []
  let athleteGrowth: Awaited<ReturnType<typeof getAthleteGrowth>> = []
  let monthlyAttendance: Awaited<ReturnType<typeof getMonthlyAttendance>> = []
  let todaySessions: Awaited<ReturnType<typeof getTodaySessions>> = []
  let overdueAlerts: Awaited<ReturnType<typeof getOverdueAlerts>> = []
  let upcomingSchedules: Awaited<ReturnType<typeof getUpcomingSchedules>> = []
  let expiringSubscriptions: Awaited<ReturnType<typeof getExpiringSubscriptions>> = []
  let weeklyAttendance = { total: 0, valid: 0, rate: 0 }
  let weeklyByDay: Awaited<ReturnType<typeof getWeeklyAttendanceByDay>> = []
  let expiredDocs: Awaited<ReturnType<typeof getExpiredDocuments>> = []
  let athletesWithoutPlan = 0
  let retention: Awaited<ReturnType<typeof getMonthlyRetentionRate>> = null
  let upcomingComps: { id: string; name: string; type: string; start_date: string; location: string | null }[] = []
  let dormantCount = 0

  // Team sport specific
  let upcomingMatches: Awaited<ReturnType<typeof getUpcomingMatches>> = []
  let seasonRecord = { wins: 0, draws: 0, losses: 0, total: 0 }

  // Academy specific
  let beltDistribution: Record<string, number> = {}
  let upcomingGraduations: Awaited<ReturnType<typeof getUpcomingGraduations>> = []

  // Smart alerts
  let smartAlerts: Awaited<ReturnType<typeof getSmartAlerts>> = {
    noEmergencyContact: 0, noPhoto: 0, noBirthDate: 0, noDocumentNumber: 0,
    noEmail: 0, noPhone: 0, newAthletes: 0, incompleteProfiles: 0, totalActive: 0,
    sampleNoEmergency: [], sampleIncomplete: [],
  }

  type ActiveSeason = { id: string; name: string; type: string; year: number; start_date: string; end_date: string }
  let activeSeason: ActiveSeason | null = null

  try {
    const results = await Promise.all([
      getDashboardSummary(),
      getRecentActivity(8),
      getMonthlyRevenue(6),
      getAthleteGrowth(6),
      getMonthlyAttendance(6),
      getTodaySessions(),
      getOverdueAlerts(),
      getUpcomingSchedules(),
      getExpiringSubscriptions(),
      getWeeklyAttendanceRate(),
      getWeeklyAttendanceByDay(),
      getExpiredDocuments(),
      getAthletesWithoutPlan(),
      getMonthlyRetentionRate(),
      getDormantAthletes(30),
    ])
    summary = results[0]
    activity = results[1]
    monthlyRevenue = results[2]
    athleteGrowth = results[3]
    monthlyAttendance = results[4]
    todaySessions = results[5]
    overdueAlerts = results[6]
    upcomingSchedules = results[7]
    expiringSubscriptions = results[8]
    weeklyAttendance = results[9]
    weeklyByDay = results[10]
    expiredDocs = results[11]
    athletesWithoutPlan = results[12]
    retention = results[13]
    dormantCount = results[14]

    activeSeason = (await getActiveSeason().catch(() => null)) as ActiveSeason | null
    const compResult = await getCompetitions({ status: 'upcoming', limit: 5 })
    upcomingComps = compResult.competitions.map((c) => ({
      id: c.id, name: c.name, type: c.type, start_date: c.start_date, location: c.location ?? null,
    }))

    // Sport-specific data
    if (isTeamSport) {
      upcomingMatches = await getUpcomingMatches(3).catch(() => [])
      seasonRecord = await getSeasonRecord().catch(() => ({ wins: 0, draws: 0, losses: 0, total: 0 }))
    } else {
      beltDistribution = await getBeltDistribution().catch(() => ({}))
      upcomingGraduations = await getUpcomingGraduations().catch(() => [])
    }

    // Smart alerts
    smartAlerts = await getSmartAlerts().catch(() => ({
      noEmergencyContact: 0, noPhoto: 0, noBirthDate: 0, noDocumentNumber: 0,
      noEmail: 0, noPhone: 0, newAthletes: 0, incompleteProfiles: 0, totalActive: 0,
      sampleNoEmergency: [], sampleIncomplete: [],
    }))
  } catch {
    // show zeros on error
  }

  // Computed values
  const total = summary.semaforoCount.green + summary.semaforoCount.yellow + summary.semaforoCount.red
  const greenPct = total ? Math.round((summary.semaforoCount.green / total) * 100) : 0
  const yellowPct = total ? Math.round((summary.semaforoCount.yellow / total) * 100) : 0
  const redPct = total ? Math.round((summary.semaforoCount.red / total) * 100) : 0

  const today = new Date()
  const todayDate = today.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })
  const hour = today.getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches"

  // Revenue trend
  const curRev = monthlyRevenue[monthlyRevenue.length - 1]
  const prevRev = monthlyRevenue.length >= 2 ? monthlyRevenue[monthlyRevenue.length - 2] : null
  const revTrend = curRev && prevRev && prevRev.amount > 0
    ? Math.round(((curRev.amount - prevRev.amount) / prevRev.amount) * 100)
    : 0

  // Athlete growth trend
  const curGrowth = athleteGrowth[athleteGrowth.length - 1]
  const prevGrowth = athleteGrowth.length >= 2 ? athleteGrowth[athleteGrowth.length - 2] : null
  const growthTrend = curGrowth && prevGrowth && prevGrowth.total > 0
    ? Math.round(((curGrowth.total - prevGrowth.total) / prevGrowth.total) * 100)
    : 0

  // Alert counts
  const alertCount = [
    overdueAlerts.length > 0,
    summary.semaforoCount.red > 0,
    dormantCount > 0,
    expiredDocs.length > 0,
    expiringSubscriptions.length > 0,
  ].filter(Boolean).length

  return (
    <div className="space-y-6 pb-12 pt-1">

      {/* Active Season Banner */}
      {activeSeason && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-wider text-primary/70">Temporada</span>
          <span className="font-bold text-primary">{activeSeason.name}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-xs text-muted-foreground/70">
            {new Date(activeSeason.start_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
            {' → '}
            {new Date(activeSeason.end_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <Link href="/dashboard/settings/seasons" className="ml-auto text-[10px] font-bold text-primary/60 hover:text-primary transition-colors">
            Gestionar →
          </Link>
        </div>
      )}

      {/* ── GREETING ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl sm:text-6xl font-black leading-[1.1] tracking-tighter">
            {greeting}, <span className="text-primary">Admin.</span>
          </h1>
          <p className="text-base text-muted-foreground/70 mt-2 font-medium">
            {summary.totalAthletes > 0
              ? `${summary.totalAthletes} ${vocab.athletes.toLowerCase()} activos · ${summary.activeSubscriptions} con plan`
              : `Gestiona ${clubName} desde aquí.`}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/dashboard/athletes/new">
            <button className="h-11 px-5 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25">
              <UserPlus className="w-4 h-4" />
              Nuevo {vocab.athlete}
            </button>
          </Link>
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 border border-white/[0.06] rounded-2xl px-4 py-3 bg-card/40">
            <Calendar className="w-4 h-4 text-primary" />
            <span>{todayDate}</span>
          </div>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1.6fr] gap-4">

        {/* Alumnos Activos */}
        <Link href="/dashboard/athletes" className="block group">
          <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 hover:bg-[#1a1a1a] transition-colors h-full flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2.5 mb-5">
              <Users className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{vocab.athletes}</p>
            </div>
            <div>
              <p className="text-4xl font-black tracking-tight text-primary leading-none">{summary.totalAthletes}</p>
              <p className="text-[12px] text-muted-foreground/50 mt-2 font-medium flex items-center gap-1.5">
                {summary.newThisMonth > 0 ? (
                  <><TrendingUp className="w-3 h-3 text-primary" /> +{summary.newThisMonth} este mes</>
                ) : (
                  'activos'
                )}
              </p>
            </div>
          </div>
        </Link>

        {/* Ingresos del Mes */}
        <Link href={`/dashboard/finances?tab=overview&month=${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`} className="block group">
          <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 hover:bg-[#1a1a1a] transition-colors h-full flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2.5 mb-5">
              <Wallet className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Ingresos</p>
            </div>
            <div>
              <p className="text-4xl font-black tracking-tight text-primary leading-none">
                ${summary.monthlyIncome >= 1000000 ? `${(summary.monthlyIncome / 1000000).toFixed(1)}M` : summary.monthlyIncome >= 1000 ? `${Math.round(summary.monthlyIncome / 1000)}k` : summary.monthlyIncome.toLocaleString('es-CL')}
              </p>
              <p className="text-[12px] text-muted-foreground/50 mt-2 font-medium flex items-center gap-1.5">
                {revTrend !== 0 ? (
                  <>{revTrend > 0 ? <TrendingUp className="w-3 h-3 text-primary" /> : <TrendingDown className="w-3 h-3 text-red-400" />} {revTrend > 0 ? '+' : ''}{revTrend}% vs mes ant.</>
                ) : (
                  'este mes'
                )}
              </p>
            </div>
          </div>
        </Link>

        {/* Check-ins Hoy */}
        <Link href="/dashboard/attendance" className="block group">
          <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 hover:bg-[#1a1a1a] transition-colors h-full flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2.5 mb-5">
              <QrCode className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Check-ins</p>
            </div>
            <div>
              <p className="text-4xl font-black tracking-tight text-white leading-none">{summary.todayCheckIns}</p>
              <p className="text-[12px] text-muted-foreground/50 mt-2 font-medium">
                {todaySessions.length > 0 ? `${todaySessions.length} sesión${todaySessions.length !== 1 ? 'es' : ''} hoy` : 'hoy'}
              </p>
            </div>
          </div>
        </Link>

        {/* Deudas Vencidas */}
        <Link href="/dashboard/payments?status=overdue" className="block group">
          <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 hover:bg-[#1a1a1a] transition-colors h-full flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2.5 mb-5">
              <AlertCircle className="w-4 h-4 text-muted-foreground/50 group-hover:text-red-400 transition-colors" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Por Cobrar</p>
            </div>
            <div>
              <p className={`text-4xl font-black tracking-tight leading-none ${summary.overdueAmount > 0 ? 'text-red-500' : 'text-primary'}`}>
                {summary.overdueAmount > 0
                  ? `$${summary.overdueAmount >= 1000000 ? `${(summary.overdueAmount / 1000000).toFixed(1)}M` : summary.overdueAmount >= 1000 ? `${Math.round(summary.overdueAmount / 1000)}k` : summary.overdueAmount.toLocaleString('es-CL')}`
                  : 'Al día'}
              </p>
              <p className="text-[12px] text-muted-foreground/50 mt-2 font-medium">
                {overdueAlerts.length > 0 ? `${overdueAlerts.length} vencidos` : 'sin deudas'}
              </p>
            </div>
          </div>
        </Link>

        {/* Featured: Estado del Club (Semáforo) */}
        <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 h-full flex flex-col col-span-2 md:col-span-2 lg:col-span-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-start justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Estado {vocab.team}
            </p>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
          </div>
          {total > 0 ? (
            <>
              <p className="text-4xl font-black leading-none text-white tracking-tight">
                {greenPct}%
              </p>
              <p className="text-[12px] text-muted-foreground/50 mt-1.5 font-medium">aptos para entrenar</p>
              <div className="mt-auto pt-4">
                <div className="flex rounded-full overflow-hidden h-2.5 mb-3 bg-white/[0.04]">
                  {greenPct > 0 && <div className="bg-primary transition-all" style={{ width: `${greenPct}%` }} />}
                  {yellowPct > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${yellowPct}%` }} />}
                  {redPct > 0 && <div className="bg-red-500 transition-all" style={{ width: `${redPct}%` }} />}
                </div>
                <div className="flex gap-4">
                  <span className="text-[11px] text-primary font-bold">{summary.semaforoCount.green} 🟢</span>
                  <span className="text-[11px] text-amber-400 font-bold">{summary.semaforoCount.yellow} 🟡</span>
                  <span className="text-[11px] text-red-400 font-bold">{summary.semaforoCount.red} 🔴</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-3xl font-black leading-none text-muted-foreground/30 tracking-tight">—</p>
              <p className="text-[12px] text-muted-foreground/50 mt-1.5 font-medium">sin {vocab.athletes.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS STRIP ── */}
      {alertCount > 0 && (
        <div className="flex flex-wrap gap-3">
          {overdueAlerts.length > 0 && (
            <Link href="/dashboard/payments?status=overdue" className="flex-1 min-w-[200px] bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 hover:bg-red-500/[0.15] transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-500">{overdueAlerts.length} pagos vencidos</p>
                <p className="text-[10px] text-red-500/60 font-medium truncate">
                  ${summary.overdueAmount.toLocaleString('es-CL')} por cobrar
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-500/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          )}
          {summary.semaforoCount.red > 0 && (
            <Link href="/dashboard/athletes?health=injured" className="flex-1 min-w-[200px] bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-500/[0.15] transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-500">{summary.semaforoCount.red} bloqueados</p>
                <p className="text-[10px] text-amber-500/60 font-medium">Semáforo rojo</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-500/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          )}
          {dormantCount > 0 && (
            <Link href="/dashboard/athletes?inactive=1" className="flex-1 min-w-[200px] bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/[0.04] transition-colors group">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{dormantCount} inactivos</p>
                <p className="text-[10px] text-muted-foreground/50 font-medium">Sin check-in 30+ días</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* ── SMART ALERTS: Profile Data ── */}
      {(smartAlerts.noEmergencyContact > 0 || smartAlerts.noPhoto > 0 || smartAlerts.incompleteProfiles > 0) && (
        <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black tracking-tight flex items-center gap-2">
              <UserX className="w-4 h-4 text-amber-400" />
              Datos de {vocab.athletes} Incompletos
            </p>
            <Link href="/dashboard/athletes" className="text-[10px] font-bold text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {smartAlerts.noEmergencyContact > 0 && (
              <Link href="/dashboard/athletes?filter=noEmergency" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{smartAlerts.noEmergencyContact}</p>
                  <p className="text-[9px] text-muted-foreground/50 font-medium">Sin contacto emergencia</p>
                </div>
              </Link>
            )}
            {smartAlerts.noPhoto > 0 && (
              <Link href="/dashboard/athletes?filter=noPhoto" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{smartAlerts.noPhoto}</p>
                  <p className="text-[9px] text-muted-foreground/50 font-medium">Sin foto de perfil</p>
                </div>
              </Link>
            )}
            {smartAlerts.noBirthDate > 0 && (
              <Link href="/dashboard/athletes?filter=noBirthDate" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{smartAlerts.noBirthDate}</p>
                  <p className="text-[9px] text-muted-foreground/50 font-medium">Sin fecha nacimiento</p>
                </div>
              </Link>
            )}
            {smartAlerts.noDocumentNumber > 0 && (
              <Link href="/dashboard/athletes?filter=noDocument" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <IdCard className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{smartAlerts.noDocumentNumber}</p>
                  <p className="text-[9px] text-muted-foreground/50 font-medium">Sin RUT/Documento</p>
                </div>
              </Link>
            )}
          </div>
          {smartAlerts.sampleNoEmergency.length > 0 && (
            <p className="text-[10px] text-muted-foreground/40 mt-3 truncate">
              Sin emergencia: {smartAlerts.sampleNoEmergency.join(', ')}{smartAlerts.noEmergencyContact > 3 ? ` +${smartAlerts.noEmergencyContact - 3} más` : ''}
            </p>
          )}
        </div>
      )}

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* LEFT COLUMN - Charts */}
        <div className="space-y-6">

          {/* Revenue Trend Chart */}
          {monthlyRevenue.length > 0 && (() => {
            const maxAmount = Math.max(...monthlyRevenue.map((m) => m.amount), 1)
            return (
              <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xl font-black tracking-tight">Ingresos</p>
                    <p className="text-sm text-muted-foreground/50 font-medium mt-1">
                      Últimos 6 meses · Total: ${monthlyRevenue.reduce((s, m) => s + m.amount, 0).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    {revTrend !== 0 && (
                      <Badge variant={revTrend > 0 ? 'default' : 'destructive'} className="text-[10px] font-bold">
                        {revTrend > 0 ? '+' : ''}{revTrend}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-end gap-3 h-32">
                  {monthlyRevenue.map((m, i) => {
                    const pct = maxAmount > 0 ? Math.max((m.amount / maxAmount) * 100, m.amount > 0 ? 8 : 2) : 2
                    const isCurrentMonth = i === monthlyRevenue.length - 1
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/40 font-bold">
                          {m.amount > 0 ? `$${Math.round(m.amount / 1000)}k` : ''}
                        </span>
                        <div
                          className={`w-full rounded-md transition-all ${isCurrentMonth ? 'bg-primary' : 'bg-primary/25'}`}
                          style={{ height: `${pct}%` }}
                        />
                        <span className={`text-[10px] font-bold uppercase ${isCurrentMonth ? 'text-primary' : 'text-muted-foreground/30'}`}>
                          {m.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Athlete Growth Chart */}
          {athleteGrowth.length > 0 && athleteGrowth.some(g => g.total > 0) && (() => {
            const maxTotal = Math.max(...athleteGrowth.map((g) => g.total), 1)
            return (
              <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xl font-black tracking-tight">Crecimiento {vocab.athletes}</p>
                    <p className="text-sm text-muted-foreground/50 font-medium mt-1">
                      Evolución últimos 6 meses
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    {growthTrend !== 0 && (
                      <Badge variant={growthTrend >= 0 ? 'default' : 'destructive'} className="text-[10px] font-bold">
                        {growthTrend > 0 ? '+' : ''}{growthTrend}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-end gap-3 h-32">
                  {athleteGrowth.map((g, i) => {
                    const pct = maxTotal > 0 ? Math.max((g.total / maxTotal) * 100, g.total > 0 ? 8 : 2) : 2
                    const isCurrentMonth = i === athleteGrowth.length - 1
                    return (
                      <div key={g.month} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/40 font-bold">
                          {g.total > 0 ? g.total : ''}
                        </span>
                        <div className="w-full flex flex-col justify-end" style={{ height: `${pct}%` }}>
                          {g.new > 0 && (
                            <div className="w-full bg-cyan-400 rounded-t-md" style={{ height: `${(g.new / g.total) * 100}%`, minHeight: '4px' }} />
                          )}
                          <div className={`w-full rounded-b-md ${isCurrentMonth ? 'bg-cyan-400/60' : 'bg-cyan-400/25'}`} style={{ flex: 1 }} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase ${isCurrentMonth ? 'text-cyan-400' : 'text-muted-foreground/30'}`}>
                          {g.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/40 mt-3">
                  <span className="inline-block w-2 h-2 rounded-sm bg-cyan-400 mr-1" /> Nuevos del mes
                  <span className="inline-block w-2 h-2 rounded-sm bg-cyan-400/25 ml-3 mr-1" /> Acumulado
                </p>
              </div>
            )
          })()}

          {/* Weekly Attendance Chart */}
          {weeklyByDay.some((d) => d.total > 0) && (() => {
            const maxVal = Math.max(...weeklyByDay.map((d) => d.total), 1)
            return (
              <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="text-xl font-black tracking-tight">Asistencia Semanal</p>
                    <p className="text-sm text-muted-foreground/50 font-medium mt-1">
                      Últimos 7 días · {weeklyAttendance.rate}% válidos
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-violet-400" />
                  </div>
                </div>
                <div className="flex items-end gap-3 h-28">
                  {weeklyByDay.map((d) => {
                    const heightPct = maxVal > 0 ? Math.max((d.total / maxVal) * 100, d.total > 0 ? 8 : 2) : 2
                    const validPct = d.total > 0 ? (d.valid / d.total) * 100 : 0
                    const isToday = d.label === 'Hoy'
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/40 font-bold">
                          {d.total > 0 ? d.total : ''}
                        </span>
                        <div className="w-full relative rounded-md overflow-hidden bg-white/[0.02]" style={{ height: `${heightPct}%` }}>
                          <div
                            className={`absolute bottom-0 left-0 right-0 ${isToday ? 'bg-violet-400' : 'bg-violet-400/40'} rounded-md`}
                            style={{ height: `${validPct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-violet-400' : 'text-muted-foreground/30'}`}>
                          {d.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Activity Feed */}
          {activity.length > 0 && (
            <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="px-6 py-4 border-b border-white/[0.04]">
                <p className="text-lg font-black tracking-tight">Actividad Reciente</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {activity.slice(0, 6).map((item) => {
                  const Icon = item.type === 'payment' ? CreditCard : item.type === 'checkin' ? QrCode : UserCheck
                  const iconColor = item.type === 'payment' ? 'text-primary bg-primary/10' :
                    item.type === 'checkin' ? 'text-violet-400 bg-violet-400/10' : 'text-cyan-400 bg-cyan-400/10'
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(item.time).getTime()
                    const mins = Math.floor(diff / 60000)
                    const hrs = Math.floor(diff / 3600000)
                    const days = Math.floor(diff / 86400000)
                    if (mins < 60) return `${mins}m`
                    if (hrs < 24) return `${hrs}h`
                    return `${days}d`
                  })()
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground/50 truncate">{item.sublabel}</p>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground/40 shrink-0">{timeAgo}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Sidebar */}
        <div className="space-y-6">

          {/* Quick Actions */}
          <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-4">Acciones Rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/dashboard/athletes/new", label: `Nuevo ${vocab.athlete}`, icon: UserPlus, color: "bg-primary/10 text-primary hover:bg-primary/20" },
                { href: "/dashboard/payments/new", label: "Registrar Pago", icon: CreditCard, color: "bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20" },
                { href: "/dashboard/attendance?tab=today", label: "Check-in", icon: QrCode, color: "bg-violet-400/10 text-violet-400 hover:bg-violet-400/20" },
                { href: "/dashboard/documents/new", label: "Documento", icon: FileText, color: "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20" },
                { href: "/dashboard/competitions/new", label: vocab.competition, icon: Trophy, color: "bg-pink-400/10 text-pink-400 hover:bg-pink-400/20" },
                { href: "/dashboard/settings", label: "Configuración", icon: Settings, color: "bg-white/[0.04] text-muted-foreground/60 hover:bg-white/[0.08]" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors cursor-pointer ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold leading-tight text-center">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* TEAM SPORT: Upcoming Matches */}
          {isTeamSport && upcomingMatches.length > 0 && (
            <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-black tracking-tight">Próximos Partidos</p>
                <Swords className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                {upcomingMatches.map((m) => {
                  const matchDate = new Date(m.match_date + 'T12:00:00')
                  return (
                    <div key={m.id} className="flex gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.04] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/50 leading-none">
                          {matchDate.toLocaleDateString('es-CL', { month: 'short' })}
                        </span>
                        <span className="text-sm font-black text-foreground leading-tight mt-0.5">{matchDate.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-snug truncate">vs. {m.opponent ?? 'Por definir'}</p>
                        <p className="text-[10px] text-muted-foreground/50 font-medium mt-1 flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${m.is_home ? 'bg-primary/10 text-primary' : 'bg-white/[0.04] text-muted-foreground/60'}`}>
                            {m.is_home ? 'LOCAL' : 'VISITA'}
                          </span>
                          {m.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{m.location}</span>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Link href="/dashboard/competitions" className="mt-4 text-xs text-primary font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
                Ver todos <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* TEAM SPORT: Season Record */}
          {isTeamSport && seasonRecord.total > 0 && (
            <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-black tracking-tight">Récord Temporada</p>
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex items-center gap-5 mb-4">
                <div><p className="text-2xl font-black text-primary">{seasonRecord.wins}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/40 mt-0.5">Victorias</p></div>
                <div><p className="text-2xl font-black text-amber-400">{seasonRecord.draws}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/40 mt-0.5">Empates</p></div>
                <div><p className="text-2xl font-black text-red-400">{seasonRecord.losses}</p><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/40 mt-0.5">Derrotas</p></div>
              </div>
              <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden flex">
                {seasonRecord.wins > 0 && <div className="bg-primary h-full" style={{ width: `${(seasonRecord.wins / seasonRecord.total) * 100}%` }} />}
                {seasonRecord.draws > 0 && <div className="bg-amber-400 h-full" style={{ width: `${(seasonRecord.draws / seasonRecord.total) * 100}%` }} />}
                {seasonRecord.losses > 0 && <div className="bg-red-400 h-full" style={{ width: `${(seasonRecord.losses / seasonRecord.total) * 100}%` }} />}
              </div>
            </div>
          )}

          {/* ACADEMY: Belt Distribution */}
          {!isTeamSport && Object.keys(beltDistribution).length > 0 && (
            <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-black tracking-tight">Distribución Rangos</p>
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-2">
                {Object.entries(beltDistribution)
                  .filter(([belt]) => belt !== 'unassigned')
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([belt, count]) => {
                    const totalBelts = Object.values(beltDistribution).reduce((a, b) => a + b, 0)
                    const pct = Math.round((count / totalBelts) * 100)
                    const BELT_COLORS: Record<string, string> = {
                      white: 'bg-white/80', blue: 'bg-blue-500', purple: 'bg-purple-500',
                      brown: 'bg-amber-700', black: 'bg-black border border-white/20',
                    }
                    return (
                      <div key={belt} className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${BELT_COLORS[belt] ?? 'bg-muted-foreground/30'}`} />
                        <span className="text-sm font-bold capitalize flex-1">{belt}</span>
                        <span className="text-sm font-bold text-muted-foreground/50">{count}</span>
                        <span className="text-[10px] font-bold text-muted-foreground/30 w-10 text-right">{pct}%</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* ACADEMY: Upcoming Graduations */}
          {!isTeamSport && upcomingGraduations.length > 0 && (
            <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-black tracking-tight">Candidatos Graduación</p>
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-3">
                {upcomingGraduations.map((a) => (
                  <Link key={a.id} href={`/dashboard/athletes/${a.id}`} className="flex items-center gap-3 group">
                    <Avatar className="w-9 h-9 border border-white/[0.04]">
                      <AvatarImage src={a.photo_url ?? undefined} />
                      <AvatarFallback className="bg-[#1a1a1a] text-[10px] font-bold">
                        {a.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground/50 font-medium capitalize">
                        {a.belt} · {a.stripes} grados
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Competitions */}
          {upcomingComps.length > 0 && (
            <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-black tracking-tight">{vocab.competitions}</p>
                <Trophy className="w-5 h-5 text-pink-400" />
              </div>
              <div className="space-y-3">
                {upcomingComps.slice(0, 3).map((c) => {
                  const compDate = new Date(c.start_date + 'T12:00:00')
                  const daysTo = Math.ceil((compDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-12 h-12 rounded-xl bg-pink-400/10 border border-pink-400/20 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] uppercase font-bold text-pink-400/60 leading-none">
                          {compDate.toLocaleDateString('es-CL', { month: 'short' })}
                        </span>
                        <span className="text-sm font-black text-pink-400 leading-tight mt-0.5">{compDate.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-snug truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground/50 font-medium mt-1 flex items-center gap-2">
                          {c.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{c.location}</span>}
                          <span className="text-pink-400 font-bold">{daysTo}d</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Link href="/dashboard/competitions" className="mt-4 text-xs text-pink-400 font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Upcoming Sessions */}
          {upcomingSchedules.length > 0 && (
            <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-black tracking-tight">Agenda 7 días</p>
                <ClipboardCheck className="w-5 h-5 text-violet-400" />
              </div>
              <div className="space-y-3">
                {upcomingSchedules.slice(0, 4).map((day) => (
                  <div key={day.date}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">{day.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {day.sessions.slice(0, 4).map((s) => (
                        <span key={s.id} className="text-[10px] font-bold bg-violet-400/10 text-violet-400 px-2 py-1 rounded-lg">
                          {s.start_time.slice(0, 5)} {s.name}
                        </span>
                      ))}
                      {day.sessions.length > 4 && (
                        <span className="text-[10px] font-bold text-muted-foreground/40 px-2 py-1">
                          +{day.sessions.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/calendar" className="mt-4 text-xs text-violet-400 font-bold inline-flex items-center gap-1 hover:gap-2 transition-all">
                Ver calendario <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Retention & Stats */}
          {retention !== null && (
            <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Retención</p>
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <p className={`text-3xl font-black ${retention.rate >= 80 ? 'text-primary' : retention.rate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {retention.rate}%
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">
                {retention.retained}/{retention.total} del mes anterior
              </p>
            </div>
          )}

          {/* Athletes Without Plan Alert */}
          {athletesWithoutPlan > 0 && (
            <Link href="/dashboard/subscriptions" className="block">
              <div className="rounded-[20px] bg-white/[0.02] border border-white/[0.04] p-4 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground/50" />
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {athletesWithoutPlan} sin plan
                    </p>
                    <p className="text-[10px] text-muted-foreground/50">Activos sin suscripción</p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Monthly Attendance Trend */}
          {monthlyAttendance.length > 0 && monthlyAttendance.some(m => m.total > 0) && (() => {
            const cur = monthlyAttendance[monthlyAttendance.length - 1]
            const prev = monthlyAttendance.length >= 2 ? monthlyAttendance[monthlyAttendance.length - 2] : null
            const trend = cur && prev && prev.total > 0 ? Math.round(((cur.total - prev.total) / prev.total) * 100) : 0
            return (
              <div className="rounded-[20px] bg-[#111111] border border-white/[0.04] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Check-ins Mes</p>
                  <Activity className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-3xl font-black text-violet-400">{cur?.total ?? 0}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                  {cur?.uniqueAthletes ?? 0} atletas únicos
                  {trend !== 0 && (
                    <span className={trend > 0 ? 'text-primary' : 'text-red-400'}>
                      {trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%
                    </span>
                  )}
                </p>
              </div>
            )
          })()}

          {/* Expiring Subscriptions Alert */}
          {expiringSubscriptions.length > 0 && (
            <Link href="/dashboard/subscriptions" className="block">
              <div className="rounded-[20px] bg-amber-500/10 border border-amber-500/20 p-4 hover:bg-amber-500/[0.15] transition-colors">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-amber-500">
                      {expiringSubscriptions.length} suscripción{expiringSubscriptions.length > 1 ? 'es' : ''} por vencer
                    </p>
                    <p className="text-[10px] text-amber-500/60">Próximos 7 días</p>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
