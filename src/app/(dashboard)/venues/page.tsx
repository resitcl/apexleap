export const dynamic = "force-dynamic"

import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VenuesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sedes</h1>
          <p className="text-muted-foreground">Gestión de instalaciones y espacios</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="w-4 h-4" />
          Nueva Sede
        </Button>
      </div>

      <Card>
        <CardContent className="py-20 text-center">
          <MapPin className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold text-lg mb-1">Sin sedes configuradas</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Configura las instalaciones de tu club: dirección, coordenadas GPS para el
            geofencing del check-in QR, aforo y horarios de apertura. <strong>Próximamente.</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
