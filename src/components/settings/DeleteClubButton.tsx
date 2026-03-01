'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogTrigger,
} from '@/components/ui/dialog'
import { deleteClub } from '@/lib/actions/settings'
import { Trash2, AlertTriangle } from 'lucide-react'

interface Props {
  clubName: string
}

export function DeleteClubButton({ clubName }: Props) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const matches = confirm.trim().toLowerCase() === clubName.trim().toLowerCase()

  async function handle() {
    if (!matches) return
    setLoading(true)
    try {
      await deleteClub(confirm)
      toast.success('Club eliminado')
      router.push('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirm('') }}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Eliminar Club
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Eliminar Club Permanentemente
          </DialogTitle>
          <DialogDescription>
            Esta acción es <strong>irreversible</strong>. Se eliminarán todos los datos del club:
            atletas, pagos, horarios, documentos, inventario y más.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            Para confirmar, escribe el nombre exacto del club:
            <br />
            <strong className="font-mono mt-1 block">{clubName}</strong>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-name">Nombre del club</Label>
            <Input
              id="confirm-name"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={clubName}
              autoComplete="off"
            />
          </div>
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handle}
            disabled={!matches || loading}
          >
            <Trash2 className="w-4 h-4" />
            {loading ? 'Eliminando...' : 'Eliminar Club Para Siempre'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
