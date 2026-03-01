'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Payment {
  id: string
  concept: string
  amount: number
  status: string
  due_date: string
  paid_at: string | null
  created_at: string
  athletes?: { name: string } | null
  plans?: { name: string } | null
}

interface Props {
  payments: Payment[]
  filename?: string
}

export function ExportPaymentsButton({ payments, filename = 'pagos' }: Props) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (payments.length === 0) { toast.error('Sin pagos para exportar'); return }
    setLoading(true)
    try {
      const STATUS_LABELS: Record<string, string> = {
        paid: 'Pagado', pending: 'Pendiente', overdue: 'Vencido',
        failed: 'Fallido', cancelled: 'Cancelado',
      }

      const headers = ['Alumno', 'Concepto', 'Plan', 'Monto', 'Estado', 'Vencimiento', 'Pagado el', 'Creado']
      const rows = payments.map((p) => [
        p.athletes?.name ?? '',
        p.concept,
        p.plans?.name ?? '',
        Number(p.amount).toFixed(2),
        STATUS_LABELS[p.status] ?? p.status,
        p.due_date ? new Date(p.due_date).toLocaleDateString('es-CL') : '',
        p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-CL') : '',
        new Date(p.created_at).toLocaleDateString('es-CL'),
      ])

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${payments.length} pagos exportados`)
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
