export const dynamic = "force-dynamic"

import { getVenues } from "@/lib/actions/venues"
import { getSchedules } from "@/lib/actions/schedules"
import { getClubInfo } from "@/lib/actions/club-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPage,
  DashboardPageHeader,
} from "@/components/ui/dashboard-kit"
import { MapPin, Navigation, Users, Home, Clock } from "lucide-react"
import { NewVenueForm } from "@/components/venues/NewVenueForm"
import { VenueToggleButton } from "@/components/venues/VenueToggleButton"
import { EditVenueForm } from "@/components/venues/EditVenueForm"
import { DeleteVenueButton } from "@/components/venues/DeleteVenueButton"
import { ExportVenuesButton } from "@/components/venues/ExportVenuesButton"
import { VenueQRButton } from "@/components/venues/VenueQRButton"

export default async function VenuesPage() {
  let venues: Awaited<ReturnType<typeof getVenues>> = []
  let schedules: Awaited<ReturnType<typeof getSchedules>> = []
  let clubInfo = { id: '', name: 'Club', slug: 'club', logo_url: null as string | null }

  try {
    ;[venues, schedules, clubInfo] = await Promise.all([getVenues(), getSchedules(), getClubInfo()])
  } catch { /* show empty */ }

  const sessionsByVenue = schedules
    .filter((s) => s.is_active)
    .reduce<Record<string, number>>((acc, s) => {
      const vid = (s.venues as { id: string } | null)?.id ?? ''
      if (vid) acc[vid] = (acc[vid] ?? 0) + 1
      return acc
    }, {})

  const active = venues.filter((v) => v.is_active).length
  const maxCapVenue = venues.filter((v) => v.is_active && v.capacity).reduce<typeof venues[number] | null>((best, v) => (!best || (v.capacity ?? 0) > (best.capacity ?? 0) ? v : best), null)
  const totalCapacity = venues.filter((v) => v.is_active && v.capacity).reduce((sum, v) => sum + (v.capacity ?? 0), 0)
  const totalSessions = Object.values(sessionsByVenue).reduce((sum, count) => sum + count, 0)
  const capacityEnabledVenues = venues.filter((v) => v.is_active && v.capacity && v.capacity > 0)
  const avgUtilization = capacityEnabledVenues.length > 0
    ? Math.round(capacityEnabledVenues
      .map((v) => {
        const sessions = sessionsByVenue[v.id] ?? 0
        const maxPossible = v.capacity! * 7
        return sessions > 0 ? Math.min(Math.round((sessions / maxPossible) * 100), 100) : 0
      })
      .reduce((sum, pct) => sum + pct, 0) / capacityEnabledVenues.length)
    : 0

  return (
    <DashboardPage>
      <DashboardPageHeader
        title="Sedes"
        subtitle={
          <>
            {active} sede{active !== 1 ? "s" : ""} activa{active !== 1 ? "s" : ""}
            {(() => {
              const totalCap = venues.filter((v) => v.is_active && v.capacity).reduce((sum, v) => sum + (v.capacity ?? 0), 0)
              return totalCap > 0 ? <span className="ml-2 font-medium">· {totalCap} personas de aforo total</span> : null
            })()}
            {(() => {
              const totalSessions = Object.values(sessionsByVenue).reduce((s, n) => s + n, 0)
              return totalSessions > 0 ? (
                <span className="ml-2 text-muted-foreground/70">· {totalSessions} sesión{totalSessions !== 1 ? 'es' : ''} activa{totalSessions !== 1 ? 's' : ''}</span>
              ) : null
            })()}
            {(() => {
              const withCap = venues.filter((v) => v.is_active && v.capacity && v.capacity > 0)
              if (withCap.length === 0) return null
              const utilPcts = withCap.map((v) => {
                const sessions = sessionsByVenue[v.id] ?? 0
                const maxPossible = v.capacity! * 7
                return sessions > 0 ? Math.min(Math.round((sessions / maxPossible) * 100), 100) : 0
              })
              const avgUtil = Math.round(utilPcts.reduce((s, p) => s + p, 0) / utilPcts.length)
              const color = avgUtil >= 70 ? 'text-green-600' : avgUtil >= 40 ? 'text-yellow-600' : 'text-muted-foreground/70'
              return <span className={`ml-2 ${color}`}>· utilización ~{avgUtil}%</span>
            })()}
          </>
        }
        actions={
          <>
            <ExportVenuesButton venues={venues.map((v) => ({ ...v, activeSessions: sessionsByVenue[v.id] ?? 0 }))} />
            <NewVenueForm />
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardMetricCard
          label="Sedes activas"
          value={active}
          description="Infraestructura operativa"
          icon={<Home className="w-4 h-4" />}
          tone="default"
          valueClassName="text-3xl"
        />
        <DashboardMetricCard
          label="Aforo total"
          value={totalCapacity > 0 ? totalCapacity.toLocaleString("es-CL") : "—"}
          description="Capacidad combinada"
          icon={<Users className="w-4 h-4" />}
          tone="info"
          valueClassName="text-3xl"
        />
        <DashboardMetricCard
          label="Sesiones activas"
          value={totalSessions}
          description="Uso del calendario"
          icon={<Clock className="w-4 h-4" />}
          tone="success"
          valueClassName="text-3xl"
        />
        <DashboardMetricCard
          label="Utilización"
          value={capacityEnabledVenues.length > 0 ? `${avgUtilization}%` : "—"}
          description="Promedio estimado"
          icon={<Navigation className="w-4 h-4" />}
          tone={avgUtilization >= 70 ? "success" : avgUtilization >= 40 ? "warning" : "default"}
          valueClassName="text-3xl"
        />
      </div>

      {venues.length === 0 ? (
        <DashboardEmptyState
          icon={<MapPin className="w-8 h-8" />}
          title="Sin sedes configuradas"
          description="Agrega las instalaciones de tu club. Configura las coordenadas GPS para activar el geofencing del check-in QR."
          action={<NewVenueForm />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Card key={venue.id} className={venue.is_active ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {venue.is_home_venue && <Home className="w-4 h-4 text-primary shrink-0" />}
                  <span className="truncate">{venue.name}</span>
                  {!venue.is_active && <Badge variant="secondary" className="text-xs ml-auto">Inactiva</Badge>}
                  {maxCapVenue && venue.id === maxCapVenue.id && venue.is_active && (
                    <Badge className="text-xs ml-auto bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">🏟 Mayor aforo</Badge>
                  )}
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

                {(venue.opening_time || venue.closing_time) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {venue.opening_time ? venue.opening_time.slice(0, 5) : '—'}
                      {' · '}
                      {venue.closing_time ? venue.closing_time.slice(0, 5) : '—'}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="w-4 h-4 shrink-0 text-blue-500" />
                  {venue.lat && venue.lng ? (
                    <span className="text-muted-foreground text-xs">
                      Ubicación verificada en mapa
                      <span className="ml-1 text-blue-600 font-medium">(radio: {venue.geofence_radius}m)</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 text-xs">Sin ubicación verificada</span>
                  )}
                </div>

                {(() => {
                  const scheds = (venue as unknown as { schedules: Array<{ id: string; is_active: boolean }> }).schedules ?? []
                  const activeCount = scheds.filter((s) => s.is_active).length
                  if (activeCount === 0) return null
                  return (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>{activeCount} sesión{activeCount !== 1 ? 'es' : ''} activa{activeCount !== 1 ? 's' : ''}</span>
                    </div>
                  )
                })()}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex gap-2 flex-wrap">
                    {venue.is_home_venue && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Home className="w-3 h-3" /> Principal
                      </Badge>
                    )}
                    <Badge variant={venue.lat && venue.lng ? "default" : "secondary"} className="text-xs">
                      {venue.lat && venue.lng ? "Geofencing activo" : "Sin GPS"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <VenueQRButton 
                      venueId={venue.id} 
                      venueName={venue.name}
                      clubName={clubInfo.name}
                      clubSlug={clubInfo.slug}
                    />
                    <VenueToggleButton venueId={venue.id} isActive={venue.is_active} />
                    <EditVenueForm venue={venue} />
                    <DeleteVenueButton venueId={venue.id} venueName={venue.name} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardPage>
  )
}
