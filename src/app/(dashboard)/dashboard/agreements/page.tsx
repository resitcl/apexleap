export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getCurrentUserPendingAgreements } from "@/lib/actions/agreements"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, Clock, AlertTriangle, Shield } from "lucide-react"
import { AgreementSignButton } from "@/components/agreements/AgreementSignButton"

export default async function AgreementsPage() {
  const result = await getCurrentUserPendingAgreements()

  // If no pending agreements, redirect to dashboard
  if (!result.hasPending) {
    redirect("/dashboard")
  }

  const { agreements, athleteName } = result

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Shield className="w-16 h-16 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">Acuerdos Pendientes</h1>
        <p className="text-muted-foreground">
          {athleteName ? `Hola ${athleteName.split(' ')[0]}, ` : ''}
          antes de continuar debes firmar los siguientes documentos
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Firma con Clave Única</h3>
              <p className="text-sm text-blue-700 mt-1">
                Los documentos serán firmados electrónicamente usando tu Clave Única del Estado de Chile, 
                lo que les otorga validez legal según la Ley 19.799.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agreements List */}
      <div className="space-y-3">
        {agreements.map((agreement, index) => (
          <Card key={agreement.templateId} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{index + 1}</span>
                  </div>
                  <div>
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
              <AgreementSignButton
                templateId={agreement.templateId}
                agreementId={agreement.agreementId}
                status={agreement.status}
                signingUrl={agreement.signingUrl}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Una vez firmados todos los documentos, podrás acceder al sistema normalmente.
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'signed':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
          <CheckCircle className="w-3 h-3" />
          Firmado
        </Badge>
      )
    case 'sent_to_sign':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1">
          <Clock className="w-3 h-3" />
          Pendiente de firma
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
          <FileText className="w-3 h-3" />
          Listo para enviar
        </Badge>
      )
    case 'expired':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Expirado
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <FileText className="w-3 h-3" />
          Sin crear
        </Badge>
      )
  }
}
