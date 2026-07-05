'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Props {
  athlete: {
    name: string
    email: string | null
    phone: string | null
    document_number: string | null
    birth_date: string | null
    status: string
    health_status: string
    notes: string | null
  }
  payments: { concept: string; amount: number; status: string; due_date: string }[]
  attendance: { checked_in_at: string; is_valid: boolean }[]
}

export function ExportAthleteButton({ athlete, payments, attendance }: Props) {
  function handle() {
    const BOM = '\uFEFF'
    const lines: string[] = []

    lines.push(`"Ficha Atleta: ${athlete.name}"`)
    lines.push(`"Generado";"${new Date().toLocaleDateString('es-CL')}"`)
    lines.push('')
    lines.push('"DATOS PERSONALES"')
    lines.push(`"Nombre";"${athlete.name}"`)
    lines.push(`"Email";"${athlete.email ?? '—'}"`)
    lines.push(`"Teléfono";"${athlete.phone ?? '—'}"`)
    lines.push(`"RUT/Doc";"${athlete.document_number ?? '—'}"`)
    lines.push(`"Nacimiento";"${athlete.birth_date ? new Date(athlete.birth_date + 'T12:00:00').toLocaleDateString('es-CL') : '—'}"`)
    lines.push(`"Estado";"${athlete.status}"`)
    lines.push(`"Salud";"${athlete.health_status}"`)
    if (athlete.notes) lines.push(`"Notas";"${athlete.notes.replace(/"/g, '""')}"`)

    if (payments.length > 0) {
      lines.push('')
      lines.push('"PAGOS"')
      lines.push('"Concepto";"Monto";"Estado";"Vencimiento"')
      for (const p of payments) {
        lines.push(`"${p.concept}";"${p.amount}";"${p.status}";"${new Date(`${p.due_date}T12:00:00`).toLocaleDateString('es-CL')}"`)
      }
    }

    if (attendance.length > 0) {
      lines.push('')
      lines.push('"ASISTENCIA"')
      lines.push('"Fecha";"Válida"')
      for (const a of attendance) {
        lines.push(`"${new Date(a.checked_in_at).toLocaleDateString('es-CL')}";"${a.is_valid ? 'Sí' : 'No'}"`)
      }
    }

    const csv = BOM + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `atleta-${athlete.name.toLowerCase().replace(/\s+/g, '-')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} className="gap-1.5">
      <Download className="w-3.5 h-3.5" />
      Exportar CSV
    </Button>
  )
}
