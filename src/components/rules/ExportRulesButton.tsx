'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Rule {
  id: string
  name: string
  type: string
  severity: string
  action: string
  is_active: boolean
  condition: Record<string, unknown>
}

interface Props {
  rules: Rule[]
  affected?: Record<string, number>
  lastTrigger?: Record<string, string | null>
}

const TYPE_LABELS: Record<string, string> = {
  financial: 'Financiero', attendance: 'Asistencia',
  discipline: 'Disciplina', documentation: 'Documentación',
}
const SEVERITY_LABELS: Record<string, string> = {
  high: 'Alta', medium: 'Media', low: 'Baja',
}
const ACTION_LABELS: Record<string, string> = {
  block: 'Bloquear', warn: 'Advertir', notify: 'Notificar',
}

function formatCondition(cond: Record<string, unknown>): string {
  return Object.entries(cond)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ')
}

export function ExportRulesButton({ rules, affected = {}, lastTrigger = {} }: Props) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (rules.length === 0) { toast.error('Sin reglas para exportar'); return }
    setLoading(true)
    try {
      const headers = ['Nombre', 'Tipo', 'Severidad', 'Acción', 'Activa', 'Afectados', 'Última Activación', 'Condición']
      const rows = rules.map((r) => {
        const last = lastTrigger[r.type]
        return [
          r.name,
          TYPE_LABELS[r.type]     ?? r.type,
          SEVERITY_LABELS[r.severity] ?? r.severity,
          ACTION_LABELS[r.action] ?? r.action,
          r.is_active ? 'Sí' : 'No',
          String(affected[r.type] ?? 0),
          last ? new Date(last).toLocaleDateString('es-CL') : '',
          r.condition ? formatCondition(r.condition) : '',
        ]
      })

      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reglas-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${rules.length} reglas exportadas`)
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
