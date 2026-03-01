'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

interface Athlete {
  id: string
  name: string
  email: string | null
  phone: string | null
  document_number: string | null
  status: string
  health_status: string
  birth_date: string | null
  created_at: string
  subscriptions?: Array<{ status: string; plans: { name: string } | null }> | null
  payments?: Array<{ status: string; paid_at: string | null; payment_method: string | null }> | null
  attendance?: Array<{ checked_in_at: string }> | null
}

interface Props {
  athletes: Athlete[]
}

export function ExportAthletesButton({ athletes }: Props) {
  const [loading, setLoading] = useState(false)

  function handleExport() {
    if (athletes.length === 0) { toast.error('Sin alumnos para exportar'); return }
    setLoading(true)
    try {
      const STATUS_LABELS: Record<string, string> = {
        active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido',
      }
      const HEALTH_LABELS: Record<string, string> = {
        healthy: 'Saludable', injured: 'Lesionado', observation: 'Observación',
      }

      const METHOD_LABELS: Record<string, string> = {
        cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta',
        webpay: 'Webpay', mercadopago: 'MercadoPago', flow: 'Flow',
      }

      const headers = ['Nombre', 'Email', 'Teléfono', 'RUT/Doc', 'Estado', 'Salud', 'Plan Activo', 'Último Método Pago', 'Streak Semanas', 'Nacimiento', 'Registrado']
      const rows = athletes.map((a) => {
        const activePlan = (a.subscriptions ?? []).find((s) => s.status === 'active')?.plans?.name ?? ''
        const lastPaid = (a.payments ?? [])
          .filter((p) => p.status === 'paid' && p.paid_at)
          .sort((x, y) => new Date(y.paid_at!).getTime() - new Date(x.paid_at!).getTime())[0]
        const lastMethod = lastPaid?.payment_method ? (METHOD_LABELS[lastPaid.payment_method] ?? lastPaid.payment_method) : ''
        const att = a.attendance ?? []
        const weekSet = new Set(att.map((r) => {
          const d = new Date(r.checked_in_at)
          const jan1 = new Date(d.getFullYear(), 0, 1)
          return `${d.getFullYear()}-${Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`
        }))
        const nowW = (() => { const d = new Date(); const j = new Date(d.getFullYear(),0,1); return `${d.getFullYear()}-${Math.ceil(((d.getTime()-j.getTime())/86400000+j.getDay()+1)/7)}` })()
        let streak = 0
        let wN = parseInt(nowW.split('-')[1])
        let wY = parseInt(nowW.split('-')[0])
        while (weekSet.has(`${wY}-${wN}`)) {
          streak++; wN--
          if (wN < 1) { wY--; wN = 52 }
          if (streak > 52) break
        }
        return [
          a.name,
          a.email ?? '',
          a.phone ?? '',
          a.document_number ?? '',
          STATUS_LABELS[a.status] ?? a.status,
          HEALTH_LABELS[a.health_status] ?? a.health_status,
          activePlan,
          lastMethod,
          streak > 0 ? `${streak}` : '0',
          a.birth_date ? new Date(a.birth_date + 'T12:00:00').toLocaleDateString('es-CL') : '',
          new Date(a.created_at).toLocaleDateString('es-CL'),
        ]
      })

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `alumnos-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${athletes.length} alumnos exportados`)
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
