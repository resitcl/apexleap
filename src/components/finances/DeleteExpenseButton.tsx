'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { deleteExpense } from '@/lib/actions/finances'
import { Trash2 } from 'lucide-react'

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm('¿Eliminar este egreso?')) return
    setLoading(true)
    try {
      await deleteExpense(expenseId)
      toast.success('Egreso eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handle} disabled={loading} className="text-destructive hover:text-destructive h-8 w-8 p-0 shrink-0">
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  )
}
