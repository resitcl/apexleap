export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getAthletePortal } from "@/lib/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle, AlertTriangle, Trophy, FileText, CreditCard, User } from "lucide-react"

const SEMAFORO_CONFIG = {
  green:  { label: "Apto para entrenar",  bg: "bg-green-500",  text: "text-green-700",  border: "border-green-200",  card: "bg-green-50",  emoji: "🟢" },
  yellow: { label: "En Observación",      bg: "bg-yellow-400", text: "text-yellow-700", border: "border-yellow-200", card: "bg-yellow-50", emoji: "🟡" },
  red:    { label: "Acceso Restringido",  bg: "bg-red-500",    text: "text-red-700",    border: "border-red-200",    card: "bg-red-50",    emoji: "🔴" },
}

const BILLING_LABEL: Record<string, string> = {
  monthly: "mensual", quarterly: "trimestral", semiannual: "semestral", annual: "anual",
}

export default async function AthletePage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

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
  const todayDate = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })

  if (!athlete) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mi Portal</h1>
          <p className="text-muted-foreground capitalize">{todayDate}</p>
        </div>

        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Perfil no vinculado</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
              Tu cuenta no está vinculada a un perfil de atleta. Solicita al administrador del club que asigne tu email a tu ficha.
            </p>
            <Link href="/dashboard">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">Ir al Dashboard</Badge>
            </Link>
          </CardContent>
        </Card>

        {sessions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Sesiones de Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{s.start_time.slice(0, 5)}</span>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
  const expiredDocs = documents.filter((d) => d.status === "expired" || (d.expiry_date && d.expiry_date < new Date().toISOString().split("T")[0]))

  const nowTime = new Date().toTimeString().slice(0, 5)
  const nextSession = sessions.find((s) => s.start_time >= nowTime) ?? sessions[sessions.length - 1] ?? null

  const daysUntilExpiry = activeSub?.end_date
    ? Math.ceil((new Date(activeSub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hola, {athlete.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground capitalize">{todayDate}</p>
        </div>
        <Link href={`/dashboard/athletes/${athlete.id}`}>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent text-xs">Ver ficha completa</Badge>
        </Link>
      </div>

      {/* Semáforo */}
      <Card className={`border-2 ${cfg.border} ${cfg.card}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
              <span className="text-2xl">{cfg.emoji}</span>
            </div>
            <div>
              <p className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</p>
              {semaforo === "red" && athlete.health_status === "injured" && (
                <p className="text-sm text-red-600">🩹 Tienes una lesión activa registrada</p>
              )}
              {semaforo === "red" && (athlete as { payments?: Payment[] }).payments?.some((p) => p.status === "overdue") && (
                <p className="text-sm text-red-600">💳 Tienes pagos vencidos pendientes</p>
              )}
              {semaforo === "yellow" && (
                <p className="text-sm text-yellow-600">Estás en período de observación. Consulta con tu entrenador.</p>
              )}
              {semaforo === "green" && (
                <p className="text-sm text-green-600">Todo en orden — ¡listo para entrenar!</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{monthCheckIns}</div>
            <p className="text-xs text-muted-foreground mt-1">Check-ins este mes</p>
          </CardContent>
        </Card>
        <Card className={pendingPayments.length > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="py-4 text-center">
            <div className={`text-3xl font-bold ${pendingPayments.length > 0 ? "text-red-600" : "text-green-600"}`}>
              {pendingPayments.length > 0 ? pendingPayments.length : "✓"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingPayments.length > 0 ? `Pago${pendingPayments.length !== 1 ? "s" : ""} pendiente${pendingPayments.length !== 1 ? "s" : ""}` : "Pagos al día"}
            </p>
          </CardContent>
        </Card>
        <Card className={expiredDocs.length > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="py-4 text-center">
            <div className={`text-3xl font-bold ${expiredDocs.length > 0 ? "text-orange-600" : "text-green-600"}`}>
              {expiredDocs.length > 0 ? expiredDocs.length : "✓"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {expiredDocs.length > 0 ? "Doc. vencidos" : "Documentos OK"}
            </p>
          </CardContent>
        </Card>
        <Card className={daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "border-yellow-200 bg-yellow-50" : ""}>
          <CardContent className="py-4 text-center">
            <div className={`text-3xl font-bold ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "text-yellow-600" : "text-blue-600"}`}>
              {daysUntilExpiry !== null ? `${daysUntilExpiry}d` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Vence membresía</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan activo */}
      {activeSub && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Mi Membresía
            </CardTitle>
            <Badge className="bg-green-100 text-green-700 border-green-200">Activa</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{activeSub.plans?.name ?? "Plan activo"}</p>
                {activeSub.plans?.price && (
                  <p className="text-sm text-muted-foreground">
                    ${activeSub.plans.price.toLocaleString("es-CL")} / {BILLING_LABEL[activeSub.plans.billing_cycle ?? "monthly"] ?? activeSub.plans.billing_cycle}
                  </p>
                )}
              </div>
              {activeSub.end_date && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Vence</p>
                  <p className="text-sm font-medium">{new Date(activeSub.end_date + "T12:00:00").toLocaleDateString("es-CL")}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próxima sesión */}
      {nextSession && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Próxima Clase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{nextSession.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              🕐 {nextSession.start_time.slice(0, 5)} – {nextSession.end_time.slice(0, 5)}
              {nextSession.capacity && <span className="ml-2">· {nextSession.capacity} cupos</span>}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagos pendientes */}
      {pendingPayments.length > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Pagos Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPayments.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-red-100 last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.concept || "Cuota"}</p>
                  {p.due_date && (
                    <p className="text-xs text-muted-foreground">
                      Vence: {new Date(p.due_date + "T12:00:00").toLocaleDateString("es-CL")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-700">${Number(p.amount).toLocaleString("es-CL")}</span>
                  <Badge variant={p.status === "overdue" ? "destructive" : "secondary"} className="text-xs">
                    {p.status === "overdue" ? "Vencido" : "Pendiente"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Próximas competencias */}
      {upcomingComps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Mis Competencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingComps.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    📅 {new Date(c.start_date + "T12:00:00").toLocaleDateString("es-CL")}
                    {c.location && <span className="ml-2">· 📍 {c.location}</span>}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documentos vencidos */}
      {expiredDocs.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <FileText className="w-4 h-4" />
              Documentos por Renovar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {expiredDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-1.5">
                <p className="text-sm">{d.name}</p>
                {d.expiry_date && (
                  <p className="text-xs text-orange-600">
                    Venció: {new Date(d.expiry_date + "T12:00:00").toLocaleDateString("es-CL")}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Links rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/dashboard/athletes/${athlete.id}`}>
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Mi Ficha Completa</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/attendance">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Check-in QR</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/payments">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Mis Pagos</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/calendar">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Calendario</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
