export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, Clock, CheckCircle, AlertTriangle, Calendar, Repeat2, ShieldCheck, Info } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"
import { getAthletePaymentStatus } from "@/lib/actions/billing"
import { formatPeriod } from "@/lib/billing-utils"
import { PayNowButton } from "@/components/athlete/PayNowButton"
import { getClubSettings } from "@/lib/actions/settings"
import { getEnabledPaymentMethodIdsFromClubSettings } from "@/lib/payment-methods"
import { AthleteSectionHeader } from "@/components/athlete/AthleteSectionHeader"
import { FlowPaymentBanner } from "@/components/athlete/FlowPaymentBanner"

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

  // Get detailed payment status with periods
  const paymentStatus = await getAthletePaymentStatus(athleteId).catch(() => null)

  // Get club settings for bank info and enabled payment methods (used in PayNow modal)
  const clubSettings = await getClubSettings().catch(() => null)
  const rawSettings = (clubSettings?.settings ?? {}) as Record<string, unknown>
  const paymentSettingsBlock = rawSettings.payment_settings as {
    bank_info?: Record<string, string> | null
    cash_instructions?: string
    flow?: { checkout_url?: string; checkoutUrl?: string }
  } | null | undefined
  const mergedBank = {
    ...((rawSettings.bank_info as Record<string, string> | undefined) ?? {}),
    ...((paymentSettingsBlock?.bank_info as Record<string, string> | undefined) ?? {}),
  }
  const bankInfo = Object.keys(mergedBank).length > 0 ? mergedBank : null
  const enabledMethods = getEnabledPaymentMethodIdsFromClubSettings(rawSettings)
  const cashInstructions = paymentSettingsBlock?.cash_instructions ?? undefined
  const flowCheckoutUrl =
    paymentSettingsBlock?.flow?.checkout_url?.trim() ||
    paymentSettingsBlock?.flow?.checkoutUrl?.trim() ||
    null

  const { data: payments } = await supabase
    .from('payments')
    .select('id, concept, amount, status, due_date, paid_at, created_at, period_start, period_end')
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
  const totalOverdue = overduePayments.reduce((sum, p) => sum + Number(p.amount), 0)

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
    <div className="space-y-8 pb-12 pt-1">
      <AthleteSectionHeader
        icon={CreditCard}
        title="Mis pagos"
        description="Estado de tu plan, historial de transacciones y cuotas mensuales pendientes."
      />

      <FlowPaymentBanner />

      {/* Subscription status banner */}
      {sub && plan ? (
        <Card className={`rounded-2xl border ${daysLeft !== null && daysLeft <= 7 ? "border-orange-500/30 bg-orange-500/5" : "border-primary/20 bg-primary/5"} shadow-sm relative overflow-hidden`}>
          {daysLeft !== null && daysLeft <= 7 && <div className="absolute inset-0 bg-orange-500/10 animate-pulse" />}
          <CardContent className="py-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${daysLeft !== null && daysLeft <= 7 ? "bg-orange-500/20 border-orange-500/30" : "bg-primary/20 border-primary/30"}`}>
                  <ShieldCheck className={`w-8 h-8 ${daysLeft !== null && daysLeft <= 7 ? "text-orange-500" : "text-primary"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-black text-xl tracking-tight leading-none">{plan.name}</p>
                    <Badge className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 ${daysLeft !== null && daysLeft <= 7 ? "bg-orange-500 text-white" : "bg-primary text-primary-foreground"}`}>Activa</Badge>
                  </div>
                  <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground/80 mt-2">
                    ${plan.price.toLocaleString('es-CL')} <span className="text-muted-foreground/40 mx-1">/</span> {BILLING_LABEL[plan.billing_cycle] ?? plan.billing_cycle}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto p-4 sm:p-0 bg-background/50 sm:bg-transparent rounded-xl border sm:border-0 border-white/[0.04]">
                {daysLeft !== null ? (
                  <>
                    <p className={`text-3xl font-black tracking-tighter ${daysLeft !== null && daysLeft <= 7 ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]" : "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]"}`}>{daysLeftLabel}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      Vence: <strong className="text-foreground">{new Date(sub.end_date!).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Suscripción Indefinida</p>
                )}
              </div>
            </div>
            
            {/* Period coverage info */}
            {paymentStatus?.currentPeriod && (
              <div className="mt-6 pt-5 border-t border-border/30 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center border border-white/[0.04]">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Período actual</p>
                    <p className="text-xs font-bold mt-0.5 text-foreground">
                      {formatPeriod(new Date(paymentStatus.currentPeriod.start), new Date(paymentStatus.currentPeriod.end))}
                    </p>
                  </div>
                </div>
                {paymentStatus.nextBillingDate && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center border border-white/[0.04]">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">Próximo pago</p>
                      <p className="text-xs font-bold mt-0.5 text-foreground">
                        {new Date(paymentStatus.nextBillingDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-dashed border-white/[0.05] bg-muted/5">
          <CardContent className="py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center">
                <Repeat2 className="w-6 h-6 text-muted-foreground/50 shrink-0" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">No tienes una suscripción base en el club.</p>
            </div>
            <Link href="/dashboard/athlete/select-plan">
              <Button size="lg" className="font-bold uppercase tracking-widest text-xs">Asociar Plan</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pay Now CTA — shown when athlete has an active subscription */}
      {sub && plan && (
        <PayNowButton
          planName={plan.name}
          planPrice={plan.price}
          planCycle={plan.billing_cycle}
          hasOverdue={overduePayments.length > 0}
          hasPending={pendingPayments.length > 0}
          bankInfo={bankInfo}
          enabledMethods={enabledMethods}
          cashInstructions={cashInstructions}
          flowCheckoutUrl={flowCheckoutUrl}
        />
      )}

      {/* Alerts */}
      <div className="space-y-3">
        {overduePayments.length > 0 && (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/10">
            <CardContent className="py-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-destructive font-black tracking-tight uppercase">
                    ATENCIÓN: Tienes {overduePayments.length} pago{overduePayments.length > 1 ? "s" : ""} vencido{overduePayments.length > 1 ? "s" : ""} (Total: ${totalOverdue.toLocaleString('es-CL')})
                  </p>
                  <p className="text-xs text-destructive/80 font-medium mt-1">
                    Contacta a la administración del club para regularizar la situación y evitar bloqueos en tu perfil.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {pendingPayments.length > 0 && overduePayments.length === 0 && (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/10">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-sm text-amber-600 font-bold uppercase tracking-tight">
                Hay {pendingPayments.length} pago{pendingPayments.length > 1 ? "s" : ""} pendiente{pendingPayments.length > 1 ? "s" : ""} de validación en curso.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm hover:border-primary/20 transition-colors">
          <CardContent className="py-6 text-center">
            <p className="text-3xl sm:text-4xl font-black text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]">${totalPaid.toLocaleString('es-CL')}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Pagos Confirmados</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
          <CardContent className="py-6 text-center">
            <p className={`text-3xl sm:text-4xl font-black ${pendingPayments.length > 0 ? "text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" : "text-muted-foreground/30"}`}>
              {pendingPayments.length}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/[0.04] bg-card shadow-sm">
          <CardContent className="py-6 text-center">
            <p className={`text-3xl sm:text-4xl font-black ${overduePayments.length > 0 ? "text-destructive drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]" : "text-muted-foreground/30"}`}>
              {overduePayments.length}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Vencidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card className="rounded-2xl border border-white/[0.04] bg-card shadow-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/30 bg-muted/10 px-6 sm:px-8 pt-6">
          <CardTitle className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Historial y Transacciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {paymentsList.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground/70">No hay transacciones registradas.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/20">
              {paymentsList.map((p) => {
                const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending
                const hasPeriod = p.period_start && p.period_end
                const isPaid = p.status === 'paid'
                const isOverdue = p.status === 'overdue'

                return (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 sm:px-8 py-5 hover:bg-muted/5 transition-colors">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPaid ? 'bg-primary/10 border-primary/20 text-primary' : 
                      isOverdue ? 'bg-destructive/10 border-destructive/20 text-destructive' : 
                      'bg-muted border-white/[0.04] text-muted-foreground'
                    }`}>
                      {isPaid ? <CheckCircle className="w-5 h-5" /> : 
                       isOverdue ? <AlertTriangle className="w-5 h-5" /> : 
                       <Clock className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black tracking-tight text-foreground truncate">{p.concept ?? 'Pago recurrente'}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">
                        {hasPeriod && (
                          <span className="flex items-center gap-1.5 bg-background border border-white/[0.04] px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3 h-3 text-primary" />
                            Cubre {formatPeriod(new Date(p.period_start!), new Date(p.period_end!))}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {p.due_date && `Vence: ${new Date(p.due_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`}
                        </span>
                        {p.paid_at && (
                          <span className="flex items-center gap-1 text-primary">
                            • Pagado: {new Date(p.paid_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 gap-2 sm:gap-1">
                      <p className="font-black text-xl tracking-tighter text-foreground">${Number(p.amount).toLocaleString('es-CL')}</p>
                      <Badge className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 ${
                        isPaid ? 'bg-primary text-primary-foreground' : 
                        isOverdue ? 'bg-destructive text-destructive-foreground' : 
                        'bg-muted text-muted-foreground'
                      }`}>
                        {cfg.label}
                      </Badge>
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
