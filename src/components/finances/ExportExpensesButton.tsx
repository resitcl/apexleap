'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Expense {
  id: string
  concept: string
  amount: number | string
  category: string
  date: string
  paid_to: string | null
  notes: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Arriendo', salary: 'Salarios', supplies: 'Insumos',
  maintenance: 'Mantención', marketing: 'Marketing', other: 'Otros',
}

export function ExportExpensesButton({ expenses, month }: { expenses: Expense[]; month: string }) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (expenses.length === 0) { toast.error('Sin egresos para exportar'); return }
    setLoading(true)
    try {
      const headers = ['Concepto', 'Categoría', 'Monto', 'Fecha', 'Pagado a', 'Notas']
      const rows = expenses.map((e) => [
        e.concept,
        CATEGORY_LABELS[e.category] ?? e.category,
        String(Number(e.amount)),
        new Date(e.date + 'T12:00:00').toLocaleDateString('es-CL'),
        e.paid_to ?? '',
        e.notes ?? '',
      ])

      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `egresos-${month}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${expenses.length} egresos exportados`)
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
