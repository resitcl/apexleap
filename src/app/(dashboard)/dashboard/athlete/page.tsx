export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getAthletePortal } from "@/lib/actions/dashboard"
import { getOnboardingData, getMyRosters, getMyMatches } from "@/lib/actions/athlete-enrollment"
import { getUserRole } from "@/lib/actions/club-context"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportConfig } from "@/lib/sport-fields"
import { getSportVocab } from "@/lib/sport-vocab"
import { AthleteOnboardingWizard } from "@/components/athlete/AthleteOnboardingWizard"
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

  const showOnboarding = role === 'athlete' && onboardingData?.needsOnboarding === true

  if (showOnboarding && onboardingData) {
    return (
      <AthleteOnboardingWizard
        data={onboardingData}
        sportConfig={getSportConfig(onboardingData.club.sport_type)}
      />
    )
  }

  let sportType: string | null = null
  try {
    const settings = await getClubSettings()
    sportType = (settings as { sport_type?: string | null })?.sport_type ?? null
  } catch { /* silent */ }
  const vocab = getSportVocab(sportType)

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

  const { athlete, sessions, monthCheckIns, semaforo, upcomingComps } = data
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="relative z-10">
          <p className="text-sm text-white/60 font-medium capitalize">{todayDate}</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">
            {greeting}, {athlete.name?.split(" ")[0]} 👋
          </h1>

          {/* Semáforo inline */}
          <div className={`mt-4 inline-flex items-center gap-2.5 rounded-full px-4 py-2 ${cfg.card} border ${cfg.border}`}>
            <span className="text-lg">{cfg.emoji}</span>
            <div>
              <p className={`text-sm font-bold ${cfg.text} leading-tight`}>{cfg.label}</p>
              <p className={`text-xs ${cfg.text} opacity-80`}>
                {semaforo === "red" && athlete.health_status === "injured" && "Lesión activa registrada"}
                {semaforo === "red" && overduePayments.length > 0 && "Pagos vencidos pendientes"}
                {semaforo === "yellow" && "Período de observación"}
                {semaforo === "green" && "Sin restricciones"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/dashboard/athlete/attendance" className="block">
          <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full">
            <CardContent className="py-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{monthCheckIns}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Check-ins este mes</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/athlete/payments" className="block">
          <Card className={`hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full ${pendingPayments.length > 0 ? "ring-2 ring-red-200" : ""}`}>
            <CardContent className="py-4 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${pendingPayments.length > 0 ? "bg-red-100" : "bg-green-100"}`}>
                <CreditCard className={`w-5 h-5 ${pendingPayments.length > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div className={`text-2xl font-bold ${pendingPayments.length > 0 ? "text-red-600" : "text-green-600"}`}>
                {pendingPayments.length > 0 ? pendingPayments.length : "✓"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {pendingPayments.length > 0 ? "Pagos pendientes" : "Pagos al día"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/athlete/documents" className="block">
          <Card className={`hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full ${expiredDocs.length > 0 ? "ring-2 ring-orange-200" : ""}`}>
            <CardContent className="py-4 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${expiredDocs.length > 0 ? "bg-orange-100" : "bg-green-100"}`}>
                <FileText className={`w-5 h-5 ${expiredDocs.length > 0 ? "text-orange-600" : "text-green-600"}`} />
              </div>
              <div className={`text-2xl font-bold ${expiredDocs.length > 0 ? "text-orange-600" : "text-green-600"}`}>
                {expiredDocs.length > 0 ? expiredDocs.length : "✓"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {expiredDocs.length > 0 ? "Doc. vencidos" : "Documentos OK"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/athlete/subscription" className="block">
          <Card className={`hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer h-full ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "ring-2 ring-yellow-200" : ""}`}>
            <CardContent className="py-4 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "bg-yellow-100" : "bg-blue-100"}`}>
                <Shield className={`w-5 h-5 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "text-yellow-600" : "text-blue-600"}`} />
              </div>
              <div className={`text-2xl font-bold ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "text-yellow-600" : "text-blue-600"}`}>
                {daysUntilExpiry !== null ? `${daysUntilExpiry}d` : "∞"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Membresía</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ─── Alerts Zone ─── */}
      {overduePayments.length > 0 && (
        <Link href="/dashboard/athlete/payments" className="block">
          <Card className="border-red-300 bg-red-50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">
                  {overduePayments.length} pago{overduePayments.length > 1 ? "s" : ""} vencido{overduePayments.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-600/70">Regulariza tu situación para seguir entrenando</p>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {expiredDocs.length > 0 && (
        <Link href="/dashboard/athlete/documents" className="block">
          <Card className="border-orange-300 bg-orange-50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-200 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-700">
                  {expiredDocs.length} documento{expiredDocs.length > 1 ? "s" : ""} por renovar
                </p>
                <p className="text-xs text-orange-600/70">
                  {expiredDocs[0]?.name}{expiredDocs.length > 1 ? ` y ${expiredDocs.length - 1} más` : ""}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-orange-400 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ─── Team Sport Widgets ─── */}
      {isTeamSport && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Next match */}
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <Swords className="w-3.5 h-3.5" /> Próximo Partido
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextMatch ? (
                <div>
                  <p className="text-xl font-bold leading-tight">vs. {nextMatch.opponent ?? "Por definir"}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(nextMatch.match_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "long" })}
                    </span>
                    <Badge variant="outline" className="text-xs">{nextMatch.is_home ? "Local" : "Visita"}</Badge>
                  </p>
                  {nextMatch.location && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {nextMatch.location}
                    </p>
                  )}
                  <Link href="/dashboard/athlete/matches" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver todos los partidos <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-sm text-muted-foreground">No hay partidos programados.</p>
                  <Link href="/dashboard/athlete/matches" className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver historial <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* W/D/L Record */}
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-green-500 via-yellow-400 to-red-400" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <BarChart3 className="w-3.5 h-3.5" /> Mi Récord
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finishedMatches.length > 0 ? (
                <div>
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{teamWins}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Victorias</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">{teamDraws}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Empates</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{teamLosses}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Derrotas</p>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex mt-3">
                    {teamWins > 0 && <div className="bg-green-500 h-full" style={{ width: `${(teamWins / finishedMatches.length) * 100}%` }} />}
                    {teamDraws > 0 && <div className="bg-yellow-400 h-full" style={{ width: `${(teamDraws / finishedMatches.length) * 100}%` }} />}
                    {teamLosses > 0 && <div className="bg-red-400 h-full" style={{ width: `${(teamLosses / finishedMatches.length) * 100}%` }} />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {finishedMatches.length} partidos · {Math.round((teamWins / finishedMatches.length) * 100)}% victorias
                  </p>
                  <Link href="/dashboard/athlete/stats" className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver estadísticas <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-sm text-muted-foreground">Sin partidos finalizados aún.</p>
                  <Link href="/dashboard/athlete/stats" className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                    Ver estadísticas <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next roster call-up for team sports */}
      {isTeamSport && nextRoster && (
        <Link href="/dashboard/athlete/rosters" className="block">
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                {nextRoster.number ? (
                  <span className="text-sm font-bold text-indigo-700">{nextRoster.number}</span>
                ) : (
                  <Shirt className="w-5 h-5 text-indigo-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-indigo-800">
                  Citado: {nextRoster.rosters!.name}
                </p>
                <p className="text-xs text-indigo-600/70">
                  {new Date(nextRoster.rosters!.match_date + "T12:00:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "long" })}
                  {nextRoster.position && ` · ${nextRoster.position}`}
                  {nextRoster.is_captain && " · © Capitán"}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-indigo-400 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ─── Two-column layout ─── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Next class */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Clock className="w-3.5 h-3.5" /> Próxima Clase Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextSession ? (
              <div>
                <p className="text-xl font-bold leading-tight">{nextSession.name}</p>
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
              <div className="py-2">
                <p className="text-sm text-muted-foreground">No hay clases programadas para hoy.</p>
                <Link href="/dashboard/athlete/schedule" className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  Ver horario semanal <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active membership */}
        <Card className="overflow-hidden">
          <div className={`h-1 ${activeSub ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-muted"}`} />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
              <Repeat2 className="w-3.5 h-3.5" /> Mi Membresía
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSub ? (
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold leading-tight">{activeSub.plans?.name ?? "Plan activo"}</p>
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Activa</Badge>
                </div>
                {activeSub.plans?.price != null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ${activeSub.plans.price.toLocaleString("es-CL")} / {BILLING_LABEL[activeSub.plans.billing_cycle ?? "monthly"] ?? activeSub.plans.billing_cycle}
                  </p>
                )}
                {activeSub.end_date && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Vence: {new Date(activeSub.end_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                <Link href="/dashboard/athlete/subscription" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  Ver detalle <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-sm text-muted-foreground">No tienes una membresía activa.</p>
                <Link href="/dashboard/athlete/select-plan">
                  <Button size="sm" className="mt-2">Elegir un plan</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Pending payments detail ─── */}
      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-500" />
                Pagos Pendientes
              </CardTitle>
              <Link href="/dashboard/athlete/payments" className="text-xs text-primary hover:underline font-medium">
                Ver todos
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPayments.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${p.status === 'overdue' ? 'bg-red-100' : 'bg-muted'}`}>
                    {p.status === 'overdue'
                      ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.concept || "Cuota"}</p>
                    {p.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Vence: {new Date(p.due_date + "T12:00:00").toLocaleDateString("es-CL")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">${Number(p.amount).toLocaleString("es-CL")}</span>
                  <Badge variant={p.status === "overdue" ? "destructive" : "secondary"} className="text-xs">
                    {p.status === "overdue" ? "Vencido" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ─── Upcoming competitions ─── */}
      {upcomingComps.length > 0 && (
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Próximas Competencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingComps.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(c.start_date + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                    {c.location && <span>· {c.location}</span>}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ─── Quick Access Grid ─── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3 px-1">Accesos rápidos</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { href: "/dashboard/athlete/profile",      icon: PenLine,       label: "Mi Perfil",    color: "text-violet-600 bg-violet-100" },
            { href: "/dashboard/athlete/attendance",    icon: ClipboardCheck, label: "Asistencia",   color: "text-blue-600 bg-blue-100" },
            { href: "/dashboard/athlete/schedule",      icon: Calendar,      label: "Horarios",     color: "text-cyan-600 bg-cyan-100" },
            { href: "/dashboard/athlete/payments",      icon: CreditCard,    label: "Pagos",        color: "text-green-600 bg-green-100" },
            { href: "/dashboard/athlete/content",       icon: Film,          label: "Contenido",    color: "text-pink-600 bg-pink-100" },
            { href: "/dashboard/athlete/documents",     icon: FileText,      label: "Documentos",   color: "text-amber-600 bg-amber-100" },
            ...(isTeamSport ? [
              { href: "/dashboard/athlete/rosters",  icon: ClipboardList, label: "Citaciones", color: "text-indigo-600 bg-indigo-100" },
              { href: "/dashboard/athlete/matches",  icon: Swords,        label: "Partidos",   color: "text-purple-600 bg-purple-100" },
              { href: "/dashboard/athlete/stats",    icon: BarChart3,     label: "Stats",      color: "text-orange-600 bg-orange-100" },
            ] : []),
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer border-0 shadow-sm">
                <CardContent className="py-4 flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
