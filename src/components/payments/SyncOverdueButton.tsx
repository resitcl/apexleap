'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { syncOverduePayments } from '@/lib/actions/payments'
import { RefreshCw } from 'lucide-react'

export function SyncOverdueButton() {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try {
      const count = await syncOverduePayments()
      if (count === 0) {
        toast.info('No hay pagos pendientes vencidos por actualizar')
      } else {
        toast.success(`${count} pago${count !== 1 ? 's' : ''} marcado${count !== 1 ? 's' : ''} como vencido${count !== 1 ? 's' : ''}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al sincronizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handle}
      disabled={loading}
      className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30"
    >
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      Sincronizar Vencidos
    </Button>
  )
}
