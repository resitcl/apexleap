export const dynamic = "force-dynamic"

import { getVenues } from "@/lib/actions/venues"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, Users, Home } from "lucide-react"
import { NewVenueForm } from "@/components/venues/NewVenueForm"

export default async function VenuesPage() {
  let venues: Awaited<ReturnType<typeof getVenues>> = []

  try {
    venues = await getVenues()
  } catch { /* show empty */ }

  const active = venues.filter((v) => v.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Sedes</h1>
          <p className="text-muted-foreground">
            {active} sede{active !== 1 ? "s" : ""} activa{active !== 1 ? "s" : ""}
          </p>
        </div>
        <NewVenueForm />
      </div>

      {venues.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <MapPin className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin sedes configuradas</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Agrega las instalaciones de tu club. Configura las coordenadas GPS para
              activar el geofencing del check-in QR.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Card key={venue.id} className={venue.is_active ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {venue.is_home_venue && <Home className="w-4 h-4 text-primary shrink-0" />}
                  <span className="truncate">{venue.name}</span>
                  {!venue.is_active && <Badge variant="secondary" className="text-xs ml-auto">Inactiva</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {venue.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{venue.address}{venue.city ? `, ${venue.city}` : ""}</span>
                  </div>
                )}

                {venue.capacity && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Aforo: {venue.capacity} personas</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="w-4 h-4 shrink-0 text-blue-500" />
                  {venue.lat && venue.lng ? (
                    <span className="text-muted-foreground font-mono text-xs">
                      {Number(venue.lat).toFixed(4)}, {Number(venue.lng).toFixed(4)}
                      <span className="ml-1 text-blue-600 font-sans font-medium">(radio: {venue.geofence_radius}m)</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 text-xs">Sin coordenadas GPS</span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap pt-1">
                  {venue.is_home_venue && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Home className="w-3 h-3" /> Principal
                    </Badge>
                  )}
                  <Badge variant={venue.lat && venue.lng ? "default" : "secondary"} className="text-xs">
                    {venue.lat && venue.lng ? "Geofencing activo" : "Sin GPS"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
