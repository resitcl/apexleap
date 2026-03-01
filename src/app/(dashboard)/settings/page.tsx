export const dynamic = "force-dynamic"

import { getClubSettings } from "@/lib/actions/settings"
import { ClubSettingsForm } from "@/components/settings/ClubSettingsForm"
import { Card, CardContent } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default async function SettingsPage() {
  let club = null
  let error: string | null = null

  try {
    club = await getClubSettings()
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar configuración"
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu club en ApexLeap</p>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conecta tu cuenta a un club para ver la configuración
            </p>
          </CardContent>
        </Card>
      ) : (
        <ClubSettingsForm defaultValues={club ?? undefined} />
      )}
    </div>
  )
}
