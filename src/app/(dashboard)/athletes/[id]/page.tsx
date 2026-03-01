import Link from "next/link"
import { notFound } from "next/navigation"
import { getAthleteById } from "@/lib/actions/athletes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { HealthStatusBadge } from "@/components/athletes/HealthStatusBadge"
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
    id: string; status: string; plans: { name: string } | null
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
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Plan: {activeSub.plans?.name ?? "—"}
                  </Badge>
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
              <p className="text-xs text-muted-foreground mb-2">Últimos Pagos</p>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin registros</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <span className="truncate flex-1">{p.concept}</span>
                      <Badge variant={
                        p.status === "paid" ? "default" :
                        p.status === "overdue" ? "destructive" : "secondary"
                      } className="ml-2 text-xs">
                        {p.status === "paid" ? "Pagado" : p.status === "overdue" ? "Vencido" : "Pendiente"}
                      </Badge>
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
              <HealthStatusBadge status={athlete.health_status as "healthy" | "injured" | "observation"} />
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Historial de Lesiones</p>
              {injuries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin lesiones registradas</p>
              ) : (
                <div className="space-y-2">
                  {injuries.slice(0, 3).map((inj) => (
                    <div key={inj.id} className="text-sm">
                      <p className="font-medium">{inj.diagnosis}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inj.start_date).toLocaleDateString("es-CL")}
                        {inj.actual_recovery
                          ? ` → Alta: ${new Date(inj.actual_recovery).toLocaleDateString("es-CL")}`
                          : inj.estimated_recovery
                          ? ` → Est. alta: ${new Date(inj.estimated_recovery).toLocaleDateString("es-CL")}`
                          : " → En curso"}
                      </p>
                    </div>
                  ))}
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
            <div>
              <p className="text-xs text-muted-foreground mb-2">Últimas 14 asistencias</p>
              {attendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin registros</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {attendance.slice(0, 14).map((a) => (
                    <div
                      key={a.id}
                      title={new Date(a.checked_in_at).toLocaleDateString("es-CL")}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                        a.is_valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {a.is_valid ? "✓" : "×"}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
