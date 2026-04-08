'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserX } from 'lucide-react'
import { archiveAthlete } from '@/lib/actions/athletes'

interface Props {
  athleteId: string
  athleteName: string
}

export function ArchiveAthleteButton({ athleteId, athleteName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleArchive() {
    setLoading(true)
    try {
      await archiveAthlete(athleteId)
      toast.success('Alumno dado de baja. Sus pagos siguen en contabilidad.')
      setOpen(false)
      router.push('/dashboard/athletes')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al dar de baja')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <UserX className="h-3.5 w-3.5" />
        Dar de baja
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja a {athleteName}?</AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <span className="block">
                Dejará de aparecer en alumnos y no podrá fichar.{' '}
                <strong>Los pagos e historial financiero no se borran</strong> y seguirán contando en reportes e ingresos pasados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleArchive()}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Procesando…' : 'Dar de baja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
