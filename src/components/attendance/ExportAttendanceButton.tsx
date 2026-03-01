'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Record {
  id: string
  checked_in_at: string
  is_valid: boolean
  check_in_lat: number | null
  athletes?: { name: string } | null
}

interface Props {
  records: Record[]
}

export function ExportAttendanceButton({ records }: Props) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (records.length === 0) { toast.error('Sin registros para exportar'); return }
    setLoading(true)
    try {
      const headers = ['Alumno', 'Fecha', 'Hora', 'Válido', 'GPS']
      const rows = records.map((r) => {
        const dt = new Date(r.checked_in_at)
        return [
          r.athletes?.name ?? '',
          dt.toLocaleDateString('es-CL'),
          dt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          r.is_valid ? 'Sí' : 'No',
          r.check_in_lat ? 'Sí' : 'No',
        ]
      })

      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `asistencia-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${records.length} registros exportados`)
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
