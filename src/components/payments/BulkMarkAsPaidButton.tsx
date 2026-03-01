'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { bulkMarkAsPaid } from '@/lib/actions/payments'
import { CheckCheck } from 'lucide-react'

interface Props {
  ids: string[]
  label?: string
}

export function BulkMarkAsPaidButton({ ids, label }: Props) {
  const [loading, setLoading] = useState(false)

  if (ids.length === 0) return null

  async function handle() {
    if (!confirm(`¿Marcar ${ids.length} pago${ids.length !== 1 ? 's' : ''} como pagados?`)) return
    setLoading(true)
    try {
      const count = await bulkMarkAsPaid(ids)
      toast.success(`${count} pago${count !== 1 ? 's' : ''} marcado${count !== 1 ? 's' : ''} como pagados`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}
      className="gap-2 text-green-700 border-green-300 hover:bg-green-50">
      <CheckCheck className="w-4 h-4" />
      {label ?? `Marcar ${ids.length} como pagado${ids.length !== 1 ? 's' : ''}`}
    </Button>
  )
}
