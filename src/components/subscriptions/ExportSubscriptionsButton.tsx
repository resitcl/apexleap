'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Sub {
  id: string
  status: string
  start_date: string
  end_date: string | null
  athletes: { name: string } | null
  plans: { name: string; price: number; billing_cycle: string } | null
}

interface Props {
  subscriptions: Sub[]
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activa', paused: 'Pausada', cancelled: 'Cancelada', expired: 'Expirada',
}
const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Mensual', quarterly: 'Trimestral', semiannual: 'Semestral',
  annual: 'Anual', single: 'Único',
}

export function ExportSubscriptionsButton({ subscriptions }: Props) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (subscriptions.length === 0) { toast.error('Sin suscripciones para exportar'); return }
    setLoading(true)
    try {
      const headers = ['Alumno', 'Plan', 'Ciclo', 'Precio', 'Estado', 'Inicio', 'Vencimiento']
      const rows = subscriptions.map((s) => [
        s.athletes?.name ?? '',
        s.plans?.name ?? '',
        CYCLE_LABELS[s.plans?.billing_cycle ?? ''] ?? (s.plans?.billing_cycle ?? ''),
        s.plans?.price != null ? String(s.plans.price) : '',
        STATUS_LABELS[s.status] ?? s.status,
        s.start_date ? new Date(s.start_date + 'T12:00:00').toLocaleDateString('es-CL') : '',
        s.end_date   ? new Date(s.end_date   + 'T12:00:00').toLocaleDateString('es-CL') : 'Sin fecha',
      ])

      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `suscripciones-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${subscriptions.length} suscripciones exportadas`)
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
