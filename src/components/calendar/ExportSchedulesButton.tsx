'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Schedule {
  id: string
  name: string
  day_of_week: number[]
  start_time: string
  end_time: string
  venue: string | null
  capacity: number | null
  description: string | null
  is_active: boolean
  attendance?: unknown[]
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function ExportSchedulesButton({ schedules }: { schedules: Schedule[] }) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (schedules.length === 0) { toast.error('Sin sesiones para exportar'); return }
    setLoading(true)
    try {
      const headers = ['Nombre', 'Días', 'Inicio', 'Fin', 'Sede', 'Capacidad', 'Total Check-ins', 'Ocupación %', 'Descripción', 'Activa']
      const rows = schedules.map((s) => {
        const totalAtt = s.attendance?.length ?? 0
        const occPct = s.capacity && s.capacity > 0
          ? Math.round((totalAtt / s.capacity) * 100)
          : null
        return [
          s.name,
          (s.day_of_week as number[]).map((d) => DAYS[d] ?? d).join(', '),
          s.start_time,
          s.end_time,
          s.venue ?? '',
          s.capacity != null ? String(s.capacity) : '',
          String(totalAtt),
          occPct != null ? `${occPct}%` : '',
          s.description ?? '',
          s.is_active ? 'Sí' : 'No',
        ]
      })

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sesiones-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${schedules.length} sesiones exportadas`)
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
