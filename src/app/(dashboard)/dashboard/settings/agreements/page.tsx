export const dynamic = "force-dynamic"

import Link from "next/link"
import { getAgreementTemplates } from "@/lib/actions/agreements"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Settings, CheckCircle, Clock } from "lucide-react"
import { NewAgreementTemplateButton } from "@/components/agreements/NewAgreementTemplateButton"
import { EditAgreementTemplateButton } from "@/components/agreements/EditAgreementTemplateButton"

export default async function AgreementsSettingsPage() {
  let templates: Awaited<ReturnType<typeof getAgreementTemplates>> = []
  let error: string | null = null

  try {
    templates = await getAgreementTemplates(false) // Include inactive
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar templates"
  }

  const activeCount = templates.filter(t => t.is_active).length
  const requiredCount = templates.filter(t => t.is_active && t.is_required_for_enrollment).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Acuerdos y Contratos</h1>
          <p className="text-muted-foreground">
            Configura los documentos que los atletas deben firmar con Clave Única
          </p>
        </div>
        <NewAgreementTemplateButton />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{activeCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Requeridos para Inscripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{requiredCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="text-2xl font-bold">{templates.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-800">Variables Disponibles</h3>
              <p className="text-sm text-blue-700 mt-1">
                Usa estas variables en el contenido del template y serán reemplazadas automáticamente:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  '{{athlete_name}}', '{{athlete_rut}}', '{{athlete_email}}',
                  '{{club_name}}', '{{club_address}}', '{{current_date}}', '{{current_year}}'
                ].map(v => (
                  <code key={v} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                    {v}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin templates de acuerdo</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Crea tu primer template para que los atletas puedan firmar
            </p>
            <NewAgreementTemplateButton />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
            <Card key={template.id} className={!template.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <FileText className="w-8 h-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{template.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        v{template.version}
                      </Badge>
                      {!template.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          Inactivo
                        </Badge>
                      )}
                      {template.is_required_for_enrollment && template.is_active && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          Requerido
                        </Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {template.valid_months ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Válido por {template.valid_months} meses
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Permanente
                        </span>
                      )}
                      <span>
                        Creado: {new Date(template.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </div>
                  <EditAgreementTemplateButton template={template} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
