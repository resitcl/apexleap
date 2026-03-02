'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Venue {
  id: string
  name: string
  address: string | null
  city: string | null
  capacity: number | null
  lat: number | null
  lng: number | null
  geofence_radius: number | null
  is_active: boolean
  activeSessions?: number
}

export function ExportVenuesButton({ venues }: { venues: Venue[] }) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (venues.length === 0) { toast.error('Sin sedes para exportar'); return }
    setLoading(true)
    try {
      const headers = ['Nombre', 'Dirección', 'Ciudad', 'Capacidad', 'Sesiones Activas', 'Latitud', 'Longitud', 'Radio Geofence (m)', 'Activa']
      const rows = venues.map((v) => [
        v.name,
        v.address ?? '',
        v.city ?? '',
        v.capacity != null ? String(v.capacity) : '',
        String(v.activeSessions ?? 0),
        v.lat != null ? String(v.lat) : '',
        v.lng != null ? String(v.lng) : '',
        v.geofence_radius != null ? String(v.geofence_radius) : '',
        v.is_active ? 'Sí' : 'No',
      ])

      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sedes-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${venues.length} sedes exportadas`)
    } catch {
      toast.error('Error al exportar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={loading}>
      <Download className="w-4 h-4" />
      Exportar CSV
    </Button>
  )
}
