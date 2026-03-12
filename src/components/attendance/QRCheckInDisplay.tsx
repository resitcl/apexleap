'use client'

import { useEffect, useState, useRef } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, QrCode, Loader2, Printer, MapPin, ChevronDown } from "lucide-react"
import { toast } from "sonner"

interface Venue {
  id: string
  name: string
  address: string | null
  qr_token: string | null
  lat: number | null
  lng: number | null
  geofence_radius: number | null
}

interface Props {
  venues?: Venue[]
}

export function QRCheckInDisplay({ venues: initialVenues }: Props) {
  const [venues, setVenues] = useState<Venue[]>(initialVenues ?? [])
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [appUrl, setAppUrl] = useState("")
  const [loading, setLoading] = useState(!initialVenues)
  const [regenerating, setRegenerating] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAppUrl(window.location.origin)
  }, [])

  // Fetch venues if not provided as props
  useEffect(() => {
    if (initialVenues) {
      setVenues(initialVenues)
      if (initialVenues.length > 0 && !selectedVenueId) {
        setSelectedVenueId(initialVenues[0].id)
      }
      return
    }
    async function fetchVenues() {
      try {
        const res = await fetch("/api/venues")
        if (res.ok) {
          const data = await res.json()
          setVenues(data)
          if (data.length > 0) setSelectedVenueId(data[0].id)
        }
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }
    fetchVenues()
  }, [initialVenues, selectedVenueId])

  const selectedVenue = venues.find((v) => v.id === selectedVenueId)
  const checkInUrl = selectedVenue?.qr_token ? `${appUrl}/check-in/v/${selectedVenue.qr_token}` : ""

  async function regenerateQR() {
    if (!selectedVenue) return
    setRegenerating(true)
    try {
      const res = await fetch(`/api/venues/${selectedVenue.id}/regenerate-qr`, { method: "POST" })
      const data = await res.json()
      if (res.ok && data.qrToken) {
        setVenues((prev) =>
          prev.map((v) => v.id === selectedVenue.id ? { ...v, qr_token: data.qrToken } : v)
        )
        toast.success("QR regenerado. El código anterior ya no será válido.")
      } else {
        toast.error(data.error ?? "Error al regenerar QR")
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setRegenerating(false)
    }
  }

  function handlePrint() {
    if (!printRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) { toast.error('Permite las ventanas emergentes para imprimir'); return }
    const canvas = printRef.current.querySelector('canvas')
    const dataUrl = canvas?.toDataURL('image/png') ?? ''
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>QR Check-in - ${selectedVenue?.name ?? 'Sede'}</title>
      <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 40px; }
        img { width: 300px; height: 300px; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        p { color: #666; font-size: 14px; margin: 4px 0; }
        .footer { margin-top: 20px; font-size: 11px; color: #999; }
      </style></head>
      <body>
        <h1>${selectedVenue?.name ?? 'Check-in'}</h1>
        ${selectedVenue?.address ? `<p>📍 ${selectedVenue.address}</p>` : ''}
        <p style="margin: 16px 0;">Escanea este código con tu celular para registrar asistencia</p>
        <img src="${dataUrl}" />
        <p class="footer">Powered by ApexLeap</p>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print(); printWindow.close() }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Check-in QR
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {loading ? (
          <div className="w-[200px] h-[200px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No hay sedes configuradas</p>
            <p className="text-xs mt-1">Crea una sede con dirección y coordenadas GPS para habilitar el check-in QR</p>
          </div>
        ) : (
          <>
            {/* Venue selector */}
            {venues.length > 1 && (
              <div className="w-full">
                <div className="relative">
                  <select
                    value={selectedVenueId ?? ""}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    className="w-full h-9 px-3 pr-8 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 pointer-events-none text-muted-foreground" />
                </div>
              </div>
            )}

            {/* QR Code */}
            {selectedVenue?.qr_token ? (
              <div ref={printRef} className="p-4 bg-white rounded-xl border-2 border-dashed">
                <QRCodeCanvas value={checkInUrl || ' '} size={200} level="M" marginSize={1} />
              </div>
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground">
                <p className="text-xs text-center px-4">Sin token QR. Haz clic en regenerar.</p>
              </div>
            )}

            {/* Venue info */}
            <div className="text-center">
              <p className="text-sm font-medium">{selectedVenue?.name}</p>
              {selectedVenue?.address && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {selectedVenue.address}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Los alumnos escanean este código con su celular para registrar asistencia
              </p>
              {selectedVenue?.lat && selectedVenue?.geofence_radius && (
                <p className="text-xs text-green-600 mt-1">
                  📍 Geofencing activo · Radio: {selectedVenue.geofence_radius}m
                </p>
              )}
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">QR fijo — no expira</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={regenerateQR}
                disabled={regenerating}
              >
                {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Regenerar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
