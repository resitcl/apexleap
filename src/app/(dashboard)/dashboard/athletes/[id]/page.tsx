import Link from "next/link"
import { notFound } from "next/navigation"
import { getAthleteById, getAthleteBillingInfo } from "@/lib/actions/athletes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { HealthStatusBadge } from "@/components/athletes/HealthStatusBadge"
import { LogInjuryForm } from "@/components/athletes/LogInjuryForm"
import { ResolveInjuryButton } from "@/components/athletes/ResolveInjuryButton"
import { HealthStatusButton } from "@/components/athletes/HealthStatusButton"
import { ExportAthleteButton } from "@/components/athletes/ExportAthleteButton"
import { ArchiveAthleteButton } from "@/components/athletes/ArchiveAthleteButton"
import { AthleteNotesButton } from "@/components/athletes/AthleteNotesButton"
import { ManualCheckInButton } from "@/components/athletes/ManualCheckInButton"
import { NewSubscriptionFromAthleteButton } from "@/components/athletes/NewSubscriptionFromAthleteButton"
import { InviteAthleteButton } from "@/components/athletes/InviteAthleteButton"
import { AthleteBillingDayControl } from "@/components/athletes/AthleteBillingDayControl"
import {
  ChevronLeft, Pencil, Phone, Mail, FileText,
  Calendar, CreditCard, CheckSquare, Activity, Heart,
  Repeat2, ClipboardCheck, DollarSign, Award
} from "lucide-react"
import { getClubSportType } from "@/lib/actions/club-context"
import { getSportConfig, getSportFieldDisplayValue } from "@/lib/sport-fields"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AthleteDetailPage({ params }: PageProps) {
  const { id } = await params

  let athlete
  try {
    athlete = await getAthleteById(id)
  } catch {
    notFound()
  }

  const billingInfo = await getAthleteBillingInfo(id).catch(() => ({
    hasActiveSub: false, anchorDay: null, nextBilling: null, cycle: null,
  }))

  let sportType: string | null = null
  try { sportType = await getClubSportType() } catch { /* silent */ }
  const sportConfig = getSportConfig(sportType)
  const technicalMeta = (athlete as { technical_meta?: Record<string, unknown> }).technical_meta ?? {}

  const payments = (athlete.payments ?? []) as Array<{
    id: string; concept: string; amount: number;
    status: string; due_date: string; paid_at: string | null
  }>
  const attendance = (athlete.attendance ?? []) as Array<{
    id: string; checked_in_at: string; is_valid: boolean
  }>
  const injuries = (athlete.injuries ?? []) as Array<{
    id: string; diagnosis: string; severity: string;
    start_date: string; estimated_recovery: string | null; actual_recovery: string | null
  }>
  const documents = (athlete.documents ?? []) as Array<{
    id: string; name: string; category: string;
    status: string; expiry_date: string | null
  }>
  const subscriptions = (athlete.subscriptions ?? []) as Array<{
    id: string; status: string; start_date: string; end_date: string | null;
    plans: { name: string; billing_cycle: string } | null
  }>

  const archivedAt = (athlete as { archived_at?: string | null }).archived_at ?? null
  const clubRole = (athlete as { clubRole?: 'admin' | 'admin_athlete' | 'coach' | 'athlete' | null }).clubRole ?? null
  const isStaffOnly = clubRole === 'admin' || clubRole === 'coach'
  const ROLE_LABEL: Record<NonNullable<typeof clubRole>, string> = {
    admin: 'Administrador',
    admin_athlete: 'Admin + jugador',
    coach: 'Entrenador',
    athlete: 'Jugador',
  }
  const activeSub = subscriptions.find((s) => s.status === "active")
  const overduePayments = payments.filter((p) => p.status === "overdue")
  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter((a) => a.is_valid).length / attendance.length) * 100)
    : null

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12 pt-1">
      {isStaffOnly && (
        <div
          role="alert"
          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm"
        >
          <p className="font-bold text-blue-900 dark:text-blue-200">
            Este usuario ahora es {ROLE_LABEL[clubRole!]}
          </p>
          <p className="mt-1 text-blue-900/85 dark:text-blue-100/85">
            Su rol en el club ya no incluye jugador, por lo que esta ficha quedó archivada y no aparece en la nómina ni en la toma de asistencia.
          </p>
          <p className="mt-1 text-xs text-blue-800/80 dark:text-blue-100/70">
            Para verlo y editarlo como staff, ve a <Link href="/dashboard/settings/team" className="underline font-medium">Equipo</Link>.
          </p>
        </div>
      )}
      {archivedAt && !isStaffOnly && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <p className="font-bold text-amber-900 dark:text-amber-200">Alumno dado de baja</p>
          <p className="mt-1 text-amber-900/85 dark:text-amber-100/85">
            Ya no aparece en el listado ni puede fichar. El historial de pagos y sus registros en finanzas se conservan.
          </p>
          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-100/70">
            Fecha de baja: {new Date(archivedAt).toLocaleString('es-CL', { dateStyle: 'medium' })}
          </p>
        </div>
      )}
      {/* ── GREETING ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tighter flex items-center gap-3 flex-wrap">
            <span>
              {isStaffOnly ? `${ROLE_LABEL[clubRole!]}:` : 'Alumno:'}{' '}
              <span className="text-primary">{athlete.name.split(' ')[0]}.</span>
            </span>
            {clubRole && (
              <Badge
                variant="outline"
                className={`text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                  clubRole === 'admin' || clubRole === 'admin_athlete'
                    ? 'border-blue-500/40 text-blue-700 dark:text-blue-300'
                    : clubRole === 'coach'
                      ? 'border-purple-500/40 text-purple-700 dark:text-purple-300'
                      : 'border-border/50 text-muted-foreground'
                }`}
              >
                {ROLE_LABEL[clubRole]}
              </Badge>
            )}
          </h1>
          <p className="text-[15px] text-muted-foreground/70 font-normal mt-2 leading-relaxed">
            {activeSub ? `Plan: ${activeSub.plans?.name ?? ''}` : 'Sin plan activo'}
            {overduePayments.length > 0 && ` · ${overduePayments.length} pago${overduePayments.length > 1 ? 's' : ''} vencido${overduePayments.length > 1 ? 's' : ''}`}
            {athlete.status !== 'active' && ` · ${athlete.status === 'inactive' ? 'Inactivo' : 'Suspendido'}`}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 shrink-0 border border-border/40 rounded-xl px-4 py-3 bg-card/40">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/athletes">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Alumnos
          </Button>
        </Link>
        <div className="flex-1" />
        {!archivedAt && athlete.email && (
          <InviteAthleteButton athleteId={id} athleteEmail={athlete.email} />
        )}
        {!archivedAt && (
          <AthleteNotesButton athleteId={id} currentNotes={athlete.notes ?? null} />
        )}
        {!archivedAt && <LogInjuryForm athleteId={id} />}
        <ExportAthleteButton
          athlete={athlete}
          payments={payments}
          attendance={attendance}
        />
        {!archivedAt && <NewSubscriptionFromAthleteButton athleteId={id} />}
        {!archivedAt && (
          <Link href={`/dashboard/payments/new?athleteId=${id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Registrar Pago
            </Button>
          </Link>
        )}
        {!archivedAt && <ManualCheckInButton athleteId={id} />}
        {!archivedAt && (
          <Link href={`/dashboard/athletes/${id}/edit`}>
            <Button size="sm" className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Button>
          </Link>
        )}
        {!archivedAt && <ArchiveAthleteButton athleteId={id} athleteName={athlete.name} />}
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={athlete.photo_url ?? undefined} />
              <AvatarFallback className="text-2xl font-bold">
                {athlete.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{athlete.name}</h1>
                <HealthStatusBadge status={athlete.health_status as "healthy" | "injured" | "observation"} />
                <Badge variant={athlete.status === "active" ? "default" : "secondary"}>
                  {athlete.status === "active" ? "Activo" : athlete.status === "inactive" ? "Inactivo" : "Suspendido"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                {athlete.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {athlete.email}
                  </span>
                )}
                {athlete.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {athlete.phone}
                  </span>
                )}
                {athlete.document_number && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" /> {athlete.document_number}
                  </span>
                )}
              </div>
              {activeSub && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    Plan: {activeSub.plans?.name ?? "—"}
                  </Badge>
                  {activeSub.end_date && (() => {
                    const daysLeft = Math.ceil((new Date(activeSub.end_date!).getTime() - Date.now()) / 86400000)
                    return daysLeft >= 0 ? (
                      <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"} className="text-xs">
                        {daysLeft === 0 ? 'Vence hoy' : `${daysLeft}d restantes`}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Vencida</Badge>
                    )
                  })()}
                </div>
              )}
              {athlete.notes && (
                <div className="mt-2 p-2.5 bg-muted/50 rounded-md border">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Notas</p>
                  <p className="text-sm whitespace-pre-line">{athlete.notes}</p>
                </div>
              )}
            </div>

            {/* Semáforo */}
            <div className="text-center shrink-0">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 ${
                athlete.health_status === "healthy" && overduePayments.length === 0
                  ? "bg-green-50 border-green-400"
                  : athlete.health_status === "injured" || overduePayments.length > 0
                  ? "bg-red-50 border-red-400"
                  : "bg-yellow-50 border-yellow-400"
              }`}>
                {athlete.health_status === "healthy" && overduePayments.length === 0 ? "🟢" :
                 athlete.health_status === "injured" || overduePayments.length > 0 ? "🔴" : "🟡"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Elegibilidad</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Asistencia */}
        <div className="rounded-2xl bg-card p-5 h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <ClipboardCheck className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Asistencia</p>
          </div>
          <p className={`text-4xl font-black tracking-tight leading-none ${attendanceRate !== null && attendanceRate >= 70 ? 'text-primary' : attendanceRate !== null && attendanceRate >= 40 ? 'text-amber-500' : attendanceRate !== null ? 'text-red-500' : 'text-muted-foreground/30'}`}>
            {attendanceRate !== null ? `${attendanceRate}%` : '—'}
          </p>
          <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">tasa de asistencia</p>
        </div>

        {/* Pagos */}
        <Link href={`/dashboard/payments?athleteId=${id}`} className="block">
          <div className="rounded-2xl bg-card p-5 hover:bg-muted/40 dark:hover:bg-white/[0.04] transition-colors h-full">
            <div className="flex items-center gap-2.5 mb-5">
              <CreditCard className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Pagos</p>
            </div>
            <p className={`text-[28px] font-black tracking-tight leading-none uppercase ${overduePayments.length > 0 ? 'text-red-500' : 'text-foreground'}`}>
              {overduePayments.length > 0 ? overduePayments.length : 'Al día'}
            </p>
            <p className={`text-[13px] mt-2 font-normal ${overduePayments.length > 0 ? 'text-muted-foreground/50' : 'text-primary'}`}>
              {overduePayments.length > 0 ? `pago${overduePayments.length > 1 ? 's' : ''} vencido${overduePayments.length > 1 ? 's' : ''}` : 'sin deuda'}
            </p>
          </div>
        </Link>

        {/* Salud */}
        <div className="rounded-2xl bg-card p-5 h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <Activity className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Salud</p>
          </div>
          <p className={`text-[22px] font-black tracking-tight leading-none uppercase ${
            athlete.health_status === 'healthy' ? 'text-primary' :
            athlete.health_status === 'injured' ? 'text-red-500' : 'text-amber-500'
          }`}>
            {athlete.health_status === 'healthy' ? 'Apto' :
             athlete.health_status === 'injured' ? 'Lesionado' : 'Obs.'}
          </p>
          <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">estado físico actual</p>
        </div>

        {/* Documentos */}
        <div className="rounded-2xl bg-card p-5 h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <FileText className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Documentos</p>
          </div>
          <p className={`text-[28px] font-black tracking-tight leading-none uppercase ${
            documents.filter(d => d.status === 'expired').length > 0 ? 'text-amber-500' : 'text-foreground'
          }`}>
            {documents.filter(d => d.status === 'expired').length > 0
              ? documents.filter(d => d.status === 'expired').length
              : documents.length > 0 ? 'OK' : '—'}
          </p>
          <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">
            {documents.filter(d => d.status === 'expired').length > 0
              ? `vencido${documents.filter(d => d.status === 'expired').length > 1 ? 's' : ''}`
              : `${documents.length} doc${documents.length !== 1 ? 's' : ''} en total`}
          </p>
        </div>
      </div>

      {/* Sport-specific technical data */}
      {sportConfig && Object.keys(technicalMeta).length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">{sportConfig.sectionTitle}</p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {sportConfig.fields
                .filter((f) => technicalMeta[f.key] !== undefined && technicalMeta[f.key] !== null)
                .map((f) => (
                  <div key={f.key} className="text-sm">
                    <span className="text-muted-foreground">{f.label}: </span>
                    <span className="font-medium">
                      {getSportFieldDisplayValue(sportType, f.key, technicalMeta[f.key])}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: 4 pestañas de la Ficha 360° */}
      <div className="grid md:grid-cols-2 lg:grid-cols-[1fr_340px] gap-3 items-start">

        {/* 1. Pestaña Administrativa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Administrativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Plan Activo</p>
              <p className="font-medium">{activeSub?.plans?.name ?? "Sin plan"}</p>
            </div>
            <Separator />
            <AthleteBillingDayControl athleteId={id} initial={billingInfo} />
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Historial de Pagos</p>
                {payments.length > 0 && (
                  <Link href={`/dashboard/payments?athleteId=${id}`}
                    className="text-xs text-primary hover:underline">
                    Ver todos →
                  </Link>
                )}
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin registros</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium">{p.concept}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.due_date).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-semibold">
                          ${Number(p.amount).toLocaleString("es-CL")}
                        </span>
                        <Badge variant={
                          p.status === "paid" ? "default" :
                          p.status === "overdue" ? "destructive" : "secondary"
                        } className="text-xs">
                          {p.status === "paid" ? "✓" : p.status === "overdue" ? "!" : "·"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Historial de Suscripciones</p>
                <Link href={`/dashboard/subscriptions?athleteId=${id}`}
                  className="text-xs text-primary hover:underline">Ver →</Link>
              </div>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin suscripciones</p>
              ) : (
                <div className="space-y-1.5">
                  {subscriptions.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium truncate">{s.plans?.name ?? "Plan"}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-muted-foreground">
                          {new Date(s.start_date).toLocaleDateString("es-CL")}
                          {s.end_date ? ` → ${new Date(s.end_date).toLocaleDateString("es-CL")}` : ""}
                        </span>
                        <Badge variant={
                          s.status === "active" ? "default" :
                          s.status === "expired" ? "outline" :
                          s.status === "cancelled" ? "secondary" : "outline"
                        } className="text-xs">
                          {s.status === "active" ? "Activa" :
                           s.status === "expired" ? "Expirada" :
                           s.status === "cancelled" ? "Cancelada" : s.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Pestaña Salud y Bienestar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              Salud y Bienestar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Estado actual</p>
              <HealthStatusButton
                athleteId={id}
                current={athlete.health_status as "healthy" | "injured" | "observation"}
              />
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Historial de Lesiones</p>
              {injuries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin lesiones registradas</p>
              ) : (
                <div className="space-y-2">
                  {injuries.slice(0, 5).map((inj) => {
                    const active = !inj.actual_recovery
                    return (
                      <div key={inj.id} className={`text-sm rounded-md p-2 ${active ? 'bg-red-50 border border-red-100' : 'bg-muted/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{inj.diagnosis}</p>
                          {active && <ResolveInjuryButton injuryId={inj.id} athleteId={id} />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(inj.start_date).toLocaleDateString("es-CL")}
                          {inj.actual_recovery
                            ? ` → Alta: ${new Date(inj.actual_recovery).toLocaleDateString("es-CL")}`
                            : inj.estimated_recovery
                            ? ` → Est. alta: ${new Date(inj.estimated_recovery).toLocaleDateString("es-CL")}`
                            : " → En curso"}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {athlete.emergency_contact && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Contacto Emergencia</p>
                  <p className="font-medium text-sm">{athlete.emergency_contact}</p>
                  {athlete.emergency_phone && (
                    <p className="text-sm text-muted-foreground">{athlete.emergency_phone}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 3. Pestaña Rendimiento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Tasa de Asistencia</p>
              <span className="font-bold text-lg">
                {attendanceRate !== null ? (
                  <span className={attendanceRate >= 70 ? "text-green-600" : attendanceRate >= 40 ? "text-yellow-600" : "text-red-600"}>
                    {attendanceRate}%
                  </span>
                ) : "—"}
              </span>
            </div>
            <Separator />
            {(() => {
              const now = new Date()
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
              const thisMonth = attendance.filter((a) => a.checked_in_at >= monthStart)
              const validThisMonth = thisMonth.filter((a) => a.is_valid).length
              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Este mes</span>
                    <span className="font-semibold text-green-600">{validThisMonth} sesiones</span>
                  </div>
                  {(() => {
                    const sorted = attendance
                      .filter((a) => a.is_valid)
                      .map((a) => new Date(a.checked_in_at).toISOString().split('T')[0])
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .sort((a, b) => b.localeCompare(a))
                    let streak = 0
                    for (let i = 0; i < sorted.length; i++) {
                      const expected = new Date()
                      expected.setDate(expected.getDate() - i)
                      const eStr = expected.toISOString().split('T')[0]
                      if (sorted[i] === eStr) streak++
                      else break
                    }
                    if (streak === 0) return null
                    return (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Racha actual</span>
                        <span className={`font-bold ${streak >= 7 ? 'text-orange-500' : streak >= 3 ? 'text-yellow-600' : 'text-primary'}`}>
                          🔥 {streak} día{streak !== 1 ? 's' : ''} consecutivo{streak !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )
                  })()}
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Últimas 20 asistencias</p>
                    {attendance.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin registros</p>
                    ) : (
                      <div className="space-y-1">
                        {attendance.slice(0, 20).map((a) => (
                          <div key={a.id} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {new Date(a.checked_in_at).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                            </span>
                            <span className={`font-medium ${a.is_valid ? "text-green-600" : "text-red-500"}`}>
                              {a.is_valid ? "✓ Válido" : "✗ Inválido"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        {/* 4. Pestaña Documentos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin documentos cargados</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex justify-between items-center text-sm">
                    <span className="truncate flex-1">{doc.name}</span>
                    <Badge variant={
                      doc.status === "approved" ? "default" :
                      doc.status === "expired" ? "destructive" : "secondary"
                    } className="ml-2 text-xs">
                      {doc.status === "approved" ? "Vigente" :
                       doc.status === "expired" ? "Vencido" :
                       doc.status === "rejected" ? "Rechazado" : "Pendiente"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {athlete.birth_date && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Nacimiento: {new Date(athlete.birth_date).toLocaleDateString("es-CL")}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notas */}
      {athlete.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notas Internas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{athlete.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
