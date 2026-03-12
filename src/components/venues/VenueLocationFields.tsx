'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Loader2, LocateFixed, ExternalLink, Move, Crosshair } from 'lucide-react'
import { VenuePinMap } from '@/components/venues/VenuePinMap'

interface Props {
  address: string
  city: string
  lat: string
  lng: string
  radius: string
  onAddressChange: (value: string) => void
  onCityChange: (value: string) => void
  onRadiusChange: (value: string) => void
  onLocationResolved: (location: { lat: string; lng: string }) => void
}

export function VenueLocationFields({
  address,
  city,
  lat,
  lng,
  radius,
  onAddressChange,
  onCityChange,
  onRadiusChange,
  onLocationResolved,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [resolvedLabel, setResolvedLabel] = useState('')
  const [isAdjustMode, setIsAdjustMode] = useState(false)

  const searchQuery = useMemo(() => {
    return [address.trim(), city.trim()].filter(Boolean).join(', ')
  }, [address, city])

  const hasCoordinates = lat.trim() !== '' && lng.trim() !== ''
  const latNumber = hasCoordinates ? Number(lat) : null
  const lngNumber = hasCoordinates ? Number(lng) : null
  const validMap = latNumber != null && lngNumber != null && !Number.isNaN(latNumber) && !Number.isNaN(lngNumber)

  async function resolveAddress() {
    if (!searchQuery) {
      toast.error('Ingresa una dirección para ubicar la sede')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo ubicar la dirección')
        return
      }

      onLocationResolved({ lat: String(data.lat), lng: String(data.lng) })
      setResolvedLabel(data.label ?? searchQuery)
      toast.success('Ubicación encontrada en el mapa')
    } catch {
      toast.error('Error al buscar la ubicación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium">Ubicación y geofencing</p>
        <p className="text-xs text-muted-foreground mt-1">
          Usa la dirección exacta de la sede. Nosotros ubicamos el punto en el mapa para validar el check-in por GPS.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" value={address} onChange={(e) => onAddressChange(e.target.value)} placeholder="Av. Providencia 1234" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" value={city} onChange={(e) => onCityChange(e.target.value)} placeholder="Santiago" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="radius">Radio permitido (m)</Label>
          <Input id="radius" type="number" min="10" max="5000" value={radius} onChange={(e) => onRadiusChange(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="gap-2" onClick={resolveAddress} disabled={loading || !searchQuery}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          Buscar en mapa
        </Button>
        {validMap ? (
          <Button
            type="button"
            variant={isAdjustMode ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setIsAdjustMode((value) => !value)}
          >
            {isAdjustMode ? <Crosshair className="w-4 h-4" /> : <Move className="w-4 h-4" />}
            {isAdjustMode ? 'Terminar ajuste' : 'Ajustar pin'}
          </Button>
        ) : null}
        {hasCoordinates ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700">
            <MapPin className="w-3 h-3" />
            Ubicación lista
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            Pendiente de ubicar
          </span>
        )}
      </div>

      {resolvedLabel ? (
        <div className="rounded-md bg-background px-3 py-2 text-xs text-muted-foreground border">
          {resolvedLabel}
        </div>
      ) : null}

      {validMap ? (
        <div className="space-y-2">
          <VenuePinMap
            lat={latNumber}
            lng={lngNumber}
            draggable={isAdjustMode}
            onChange={onLocationResolved}
          />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {isAdjustMode ? 'Arrastra el pin para refinar la ubicación exacta.' : 'El punto se calculó desde la dirección ingresada.'}
            </span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${latNumber}&mlon=${lngNumber}#map=17/${latNumber}/${lngNumber}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Ver mapa completo
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
