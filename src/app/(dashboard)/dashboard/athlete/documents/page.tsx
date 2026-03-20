export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  approved: { label: "Aprobado",  variant: "default",     icon: CheckCircle },
  pending:  { label: "Pendiente", variant: "secondary",   icon: Clock },
  expired:  { label: "Vencido",   variant: "destructive", icon: AlertTriangle },
  rejected: { label: "Rechazado", variant: "destructive", icon: AlertTriangle },
}

export default async function AthleteDocumentsPage() {
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
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name, status, expiry_date, created_at')
    .eq('club_id', clubId)
    .eq('athlete_id', subStatus.athlete!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const docsList = documents ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Documentos</h1>
        <p className="text-muted-foreground">Documentos asociados a tu perfil</p>
      </div>

      {docsList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No tienes documentos registrados aún.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docsList.map((doc) => {
            const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending
            const IconComponent = cfg.icon
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <IconComponent className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.expiry_date
                        ? `Vence: ${new Date(doc.expiry_date).toLocaleDateString('es-CL')}`
                        : `Creado: ${new Date(doc.created_at).toLocaleDateString('es-CL')}`}
                    </p>
                  </div>
                  <Badge variant={cfg.variant} className="shrink-0">{cfg.label}</Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
