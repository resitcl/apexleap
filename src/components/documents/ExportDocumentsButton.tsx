'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Doc {
  id: string
  name: string
  category: string
  status: string
  expiry_date: string | null
  athletes: { name: string } | null
}

export function ExportDocumentsButton({ docs, filename = 'documentos' }: { docs: Doc[]; filename?: string }) {
  function handleExport() {
    const BOM = '\uFEFF'
    const headers = ['Nombre', 'Categoría', 'Estado', 'Atleta', 'Vencimiento']
    const rows = docs.map((d) => [
      d.name,
      d.category,
      d.status === 'approved' ? 'Aprobado' : d.status === 'pending' ? 'Pendiente' : d.status === 'expired' ? 'Vencido' : 'Rechazado',
      d.athletes?.name ?? '—',
      d.expiry_date ? new Date(d.expiry_date + 'T12:00:00').toLocaleDateString('es-CL') : '—',
    ])
    const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
      <Download className="w-4 h-4" />
      Exportar CSV
    </Button>
  )
}
