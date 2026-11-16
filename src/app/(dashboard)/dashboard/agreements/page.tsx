export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getCurrentUserPendingAgreements } from "@/lib/actions/agreements"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, FileText, Shield } from "lucide-react"
import { AgreementAcceptForm } from "@/components/agreements/AgreementAcceptForm"

/**
 * Acuerdos que el alumno debe aceptar antes de usar la plataforma (términos y condiciones,
 * reglamento, autorizaciones). Cada uno se lee aquí mismo y se acepta con un clic.
 */
export default async function AgreementsPage() {
  const result = await getCurrentUserPendingAgreements({ withContent: true })

  // Nada pendiente: no hay nada que hacer en esta pantalla.
  if (!result.hasPending) {
    redirect("/dashboard")
  }

  const { agreements, athleteName } = result
  const firstName = athleteName?.trim().split(" ")[0]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Shield className="w-14 h-14 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">
          {agreements.length === 1 ? "Un documento por aceptar" : `${agreements.length} documentos por aceptar`}
        </h1>
        <p className="text-muted-foreground">
          {firstName ? `Hola ${firstName}, antes ` : "Antes "}
          de continuar lee {agreements.length === 1 ? "este documento" : "cada documento"} y acéptalo.
        </p>
      </div>

      {/* Agreements List */}
      <div className="space-y-4">
        {agreements.map((agreement, index) => (
          <Card key={agreement.templateId} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base">{agreement.templateName}</CardTitle>
                    {agreement.templateDescription && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {agreement.templateDescription}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={agreement.status} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <AgreementAcceptForm
                templateId={agreement.templateId}
                version={agreement.version}
                content={agreement.content ?? ""}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Al presionar «Acepto» queda registrada tu aceptación con la fecha y la hora.
        Cuando no queden documentos pendientes podrás usar la plataforma normalmente.
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: "not_accepted" | "expired" }) {
  if (status === "expired") {
    return (
      <Badge variant="destructive" className="gap-1 shrink-0">
        <AlertTriangle className="w-3 h-3" />
        Vencido
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 shrink-0">
      <FileText className="w-3 h-3" />
      Pendiente
    </Badge>
  )
}
