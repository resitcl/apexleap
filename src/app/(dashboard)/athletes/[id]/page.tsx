import Link from "next/link"
import { notFound } from "next/navigation"
import { getAthleteById } from "@/lib/actions/athletes"
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
import { AthleteNotesButton } from "@/components/athletes/AthleteNotesButton"
import { ManualCheckInButton } from "@/components/athletes/ManualCheckInButton"
import { NewSubscriptionFromAthleteButton } from "@/components/athletes/NewSubscriptionFromAthleteButton"
import {
  ChevronLeft, Pencil, Phone, Mail, FileText,
  Calendar, CreditCard, CheckSquare, Activity, Heart,
  Repeat2, ClipboardCheck, DollarSign
} from "lucide-react"

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

  const activeSub = subscriptions.find((s) => s.status === "active")
  const overduePayments = payments.filter((p) => p.status === "overdue")
  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter((a) => a.is_valid).length / attendance.length) * 100)
    : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/athletes">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Alumnos
          </Button>
        </Link>
        <div className="flex-1" />
        {/* Acciones rápidas */}
        <Link href={`/dashboard/subscriptions/new?athleteId=${id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Repeat2 className="w-3.5 h-3.5" />
            Asignar Plan
          </Button>
        </Link>
        <Link href={`/dashboard/payments/new?athleteId=${id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Registrar Pago
          </Button>
        </Link>
        <ExportAthleteButton
          athlete={athlete}
          payments={payments}
          attendance={attendance}
        />
        <NewSubscriptionFromAthleteButton athleteId={id} />
        <ManualCheckInButton athleteId={id} />
        <AthleteNotesButton athleteId={id} currentNotes={athlete.notes ?? null} />
        <LogInjuryForm athleteId={id} />
        <Link href={`/dashboard/athletes/${id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
        </Link>
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

      {/* Tabs: 4 pestañas de la Ficha 360° */}
      <div className="grid md:grid-cols-2 gap-6">

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
