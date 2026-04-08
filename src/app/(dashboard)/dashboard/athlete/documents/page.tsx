export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, AlertTriangle, Clock, DownloadCloud } from "lucide-react"
import { AthleteSectionHeader } from "@/components/athlete/AthleteSectionHeader"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  approved: { label: "Aprobado",  bg: "bg-emerald-500/10 border-emerald-500/20",  text: "text-emerald-500",  icon: CheckCircle },
  pending:  { label: "Pendiente", bg: "bg-amber-500/10 border-amber-500/20",   text: "text-amber-500",    icon: Clock },
  expired:  { label: "Vencido",   bg: "bg-destructive/10 border-destructive/20", text: "text-destructive",  icon: AlertTriangle },
  rejected: { label: "Rechazado", bg: "bg-destructive/10 border-destructive/20", text: "text-destructive",  icon: AlertTriangle },
}

export default async function AthleteDocumentsPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const subStatus = await getMySubscriptionStatus().catch(() => null)
  if (!subStatus?.hasAthleteProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground font-medium">Tu perfil de atleta aún no ha sido vinculado.</p>
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
    <div className="space-y-8 pb-12 pt-1">
      <AthleteSectionHeader
        icon={FileText}
        title="Mis documentos"
        description="Archivos, fichas médicas y contratos asociados a tu cuenta deportiva en el club."
      />

      {docsList.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-white/[0.05] bg-muted/5">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex flex-col items-center justify-center border border-white/[0.04]">
              <FileText className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground mb-1 uppercase">Sin documentos</h3>
              <p className="text-muted-foreground text-sm font-medium">No tienes documentos registrados en la plataforma aún.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {docsList.map((doc) => {
            const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending
            const IconComponent = cfg.icon
            
            return (
              <Card key={doc.id} className="rounded-2xl border-white/[0.04] bg-card hover:bg-muted/5 transition-colors shadow-sm group">
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg}`}>
                      <IconComponent className={`w-6 h-6 ${cfg.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-lg sm:text-base tracking-tight truncate text-foreground group-hover:text-primary transition-colors">
                        {doc.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">
                        {doc.expiry_date ? (
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Vence: <strong className="text-foreground">{new Date(doc.expiry_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Subido: <strong className="text-foreground">{new Date(doc.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-border/30">
                    <Badge className={`text-[10px] uppercase font-black tracking-widest px-3 py-1 ${doc.status === 'approved' ? 'bg-emerald-500 text-emerald-950' : doc.status === 'pending' ? 'bg-amber-500 text-amber-950' : 'bg-destructive text-destructive-foreground'}`}>
                      {cfg.label}
                    </Badge>
                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                      <DownloadCloud className="w-4 h-4" />
                    </button>
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
