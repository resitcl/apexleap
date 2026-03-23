export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Clock, CheckCircle, AlertTriangle, Calendar, Repeat2, ShieldCheck } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid:      { label: "Pagado",    variant: "default" },
  pending:   { label: "Pendiente", variant: "secondary" },
  overdue:   { label: "Vencido",   variant: "destructive" },
  failed:    { label: "Fallido",   variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
}

const BILLING_LABEL: Record<string, string> = {
  monthly: "mensual", quarterly: "trimestral", semiannual: "semestral", annual: "anual", single: "pago único",
}

export default async function AthletePaymentsPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const subStatus = await getMySubscriptionStatus().catch(() => null)
  if (!subStatus?.hasAthleteProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tu perfil de atleta aún no ha sido vinculado.</p>
      </div>
    )
  }

  const clubId = await getClubId()
  const supabase = createAdminClient()
  const athleteId = subStatus.athlete!.id

  const { data: payments } = await supabase
    .from('payments')
    .select('id, concept, amount, status, due_date, paid_at, created_at')
    .eq('club_id', clubId)
    .eq('athlete_id', athleteId)
    .order('due_date', { ascending: false })
    .limit(50)

  const paymentsList = payments ?? []

  const sub = subStatus.subscription
  const plan = sub ? (sub.plans as unknown as { id: string; name: string; price: number; billing_cycle: string } | null) : null

  const pendingPayments = paymentsList.filter((p) => p.status === 'pending')
  const overduePayments = paymentsList.filter((p) => p.status === 'overdue')
  const totalPaid = paymentsList.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)

  // Days until subscription expires
  let daysLeft: number | null = null
  let daysLeftLabel = ""
  let daysLeftColor = "text-green-600"
  if (sub?.end_date) {
    const end = new Date(sub.end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) { daysLeftLabel = "Vencida"; daysLeftColor = "text-red-600" }
    else if (daysLeft <= 7) { daysLeftLabel = `${daysLeft} días`; daysLeftColor = "text-orange-500" }
    else if (daysLeft <= 30) { daysLeftLabel = `${daysLeft} días`; daysLeftColor = "text-yellow-600" }
    else { daysLeftLabel = `${daysLeft} días`; daysLeftColor = "text-green-600" }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Pagos</h1>
        <p className="text-muted-foreground">Estado de suscripción, historial y cuotas pendientes</p>
      </div>

      {/* Subscription status banner */}
      {sub && plan ? (
        <Card className={`border-2 ${daysLeft !== null && daysLeft <= 7 ? "border-orange-300 bg-orange-50/40" : "border-green-200 bg-green-50/30"}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-8 h-8 shrink-0 ${daysLeft !== null && daysLeft <= 7 ? "text-orange-500" : "text-green-600"}`} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-base">{plan.name}</p>
                    <Badge variant="default" className="text-xs">Activa</Badge>
                    <span className="text-xs text-muted-foreground">{BILLING_LABEL[plan.billing_cycle] ?? plan.billing_cycle}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    ${plan.price.toLocaleString('es-CL')} / {BILLING_LABEL[plan.billing_cycle] ?? plan.billing_cycle}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {daysLeft !== null ? (
                  <>
                    <p className={`text-2xl font-bold ${daysLeftColor}`}>{daysLeftLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence: {new Date(sub.end_date!).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin fecha de vencimiento</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="py-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Repeat2 className="w-7 h-7 text-muted-foreground/50 shrink-0" />
              <p className="text-sm text-muted-foreground">No tienes una suscripción activa.</p>
            </div>
            <Link href="/dashboard/athlete/select-plan">
              <Button size="sm">Elegir un plan</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {overduePayments.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">
              Tienes {overduePayments.length} pago{overduePayments.length > 1 ? "s" : ""} vencido{overduePayments.length > 1 ? "s" : ""}. Contáctate con el club para regularizar.
            </p>
          </CardContent>
        </Card>
      )}
      {pendingPayments.length > 0 && overduePayments.length === 0 && (
        <Card className="border-yellow-300 bg-yellow-50/40">
          <CardContent className="py-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700 font-medium">
              Tienes {pendingPayments.length} pago{pendingPayments.length > 1 ? "s" : ""} pendiente{pendingPayments.length > 1 ? "s" : ""} de confirmación.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString('es-CL')}</p>
            <p className="text-xs text-muted-foreground mt-1">Total pagado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className={`text-2xl font-bold ${pendingPayments.length > 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
              {pendingPayments.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className={`text-2xl font-bold ${overduePayments.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {overduePayments.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Vencidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsList.length === 0 ? (
            <div className="py-10 text-center">
              <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No tienes pagos registrados aún.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paymentsList.map((p) => {
                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending
                return (
                  <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      p.status === 'paid' ? 'bg-green-100' : p.status === 'overdue' ? 'bg-red-100' : 'bg-muted'
                    }`}>
                      {p.status === 'paid'
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : p.status === 'overdue'
                          ? <AlertTriangle className="w-4 h-4 text-destructive" />
                          : <Clock className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.concept ?? 'Pago'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {p.due_date
                          ? `Vence: ${new Date(p.due_date).toLocaleDateString('es-CL')}`
                          : ''}
                        {p.paid_at
                          ? ` · Pagado: ${new Date(p.paid_at).toLocaleDateString('es-CL')}`
                          : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">${Number(p.amount).toLocaleString('es-CL')}</p>
                      <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
