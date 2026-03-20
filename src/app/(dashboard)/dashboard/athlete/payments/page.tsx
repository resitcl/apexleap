export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid:      { label: "Pagado",    variant: "default" },
  pending:   { label: "Pendiente", variant: "secondary" },
  overdue:   { label: "Vencido",   variant: "destructive" },
  failed:    { label: "Fallido",   variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
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

  // Fetch payments for this athlete
  const clubId = await getClubId()
  const supabase = createAdminClient()
  const { data: payments } = await supabase
    .from('payments')
    .select('id, concept, amount, status, due_date, paid_at, created_at')
    .eq('club_id', clubId)
    .eq('athlete_id', subStatus.athlete!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const paymentsList = payments ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Pagos</h1>
        <p className="text-muted-foreground">Historial de pagos y cuotas pendientes</p>
      </div>

      {paymentsList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No tienes pagos registrados aún.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paymentsList.map((p) => {
            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {p.status === 'paid' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : p.status === 'overdue' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.concept ?? 'Pago'}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.due_date ? `Vence: ${new Date(p.due_date).toLocaleDateString('es-CL')}` : ''}
                      {p.paid_at ? ` · Pagado: ${new Date(p.paid_at).toLocaleDateString('es-CL')}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">${Number(p.amount).toLocaleString('es-CL')}</p>
                    <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
