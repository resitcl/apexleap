'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Competition {
  id: string
  name: string
  type: string
  status: string
  sport: string | null
  location: string | null
  start_date: string
  end_date: string | null
  rosters: unknown[]
}

const TYPE_LABELS: Record<string, string> = {
  tournament: 'Torneo', league: 'Liga', friendly: 'Amistoso', championship: 'Campeonato',
}
const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Próximo', active: 'En curso', finished: 'Finalizado', cancelled: 'Cancelado',
}

export function ExportCompetitionsButton({ competitions }: { competitions: Competition[] }) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (competitions.length === 0) { toast.error('Sin competencias para exportar'); return }
    setLoading(true)
    try {
      const headers = ['Nombre', 'Tipo', 'Estado', 'Deporte', 'Lugar', 'Inicio', 'Fin', 'Nóminas']
      const rows = competitions.map((c) => [
        c.name,
        TYPE_LABELS[c.type] ?? c.type,
        STATUS_LABELS[c.status] ?? c.status,
        c.sport ?? '',
        c.location ?? '',
        c.start_date ? new Date(c.start_date + 'T12:00:00').toLocaleDateString('es-CL') : '',
        c.end_date   ? new Date(c.end_date   + 'T12:00:00').toLocaleDateString('es-CL') : '',
        String((c.rosters as unknown[])?.length ?? 0),
      ])

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `competencias-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${competitions.length} competencias exportadas`)
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
