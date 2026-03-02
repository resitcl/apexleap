'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Coach {
  id: string
  name: string
  email: string | null
  phone: string | null
  specialty: string | null
  salary_type: string
  salary_amount: number | null
  is_active: boolean
  created_at: string
}

const SALARY_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fijo mensual', per_session: 'Por sesión', percentage: '% ingresos',
}

export function ExportCoachesButton({ coaches }: { coaches: Coach[] }) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (coaches.length === 0) { toast.error('Sin coaches para exportar'); return }
    setLoading(true)
    try {
      const headers = ['Nombre', 'Email', 'Teléfono', 'Especialidad', 'Tipo Salario', 'Monto', 'Activo', 'Registrado']
      const rows = coaches.map((c) => [
        c.name,
        c.email ?? '',
        c.phone ?? '',
        c.specialty ?? '',
        SALARY_TYPE_LABELS[c.salary_type] ?? c.salary_type,
        c.salary_amount != null ? Number(c.salary_amount).toFixed(2) : '',
        c.is_active ? 'Sí' : 'No',
        new Date(c.created_at).toLocaleDateString('es-CL'),
      ])

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nomina-coaches-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${coaches.length} coaches exportados`)
    } catch {
      toast.error('Error al exportar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={loading}>
      <Download className="w-4 h-4" />
      Exportar Nómina
    </Button>
  )
}
