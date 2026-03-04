'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteSupplier } from '@/lib/actions/suppliers'

export function DeleteSupplierButton({ supplierId }: { supplierId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [isPending, start] = useTransition()

  function handleClick() {
    if (!confirm) { setConfirm(true); return }
    start(async () => {
      try {
        await deleteSupplier(supplierId)
        toast.success('Proveedor eliminado')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar')
        setConfirm(false)
      }
    })
  }

  return (
    <Button
      variant="ghost" size="sm"
      className={`h-8 px-2 gap-1 ${confirm ? 'text-destructive border border-destructive' : 'text-muted-foreground hover:text-destructive'}`}
      onClick={handleClick}
      onBlur={() => setConfirm(false)}
      disabled={isPending}
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      {confirm && <span className="text-xs">¿Confirmar?</span>}
    </Button>
  )
}
