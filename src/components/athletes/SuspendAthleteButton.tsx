'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PauseCircle, PlayCircle } from 'lucide-react'
import { suspendAthlete, reactivateAthlete } from '@/lib/actions/athletes'

export function SuspendAthleteButton({ athleteId, status }: { athleteId: string; status: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isSuspended = status === 'suspended'

  async function handle() {
    setLoading(true)
    try {
      if (isSuspended) {
        await reactivateAthlete(athleteId)
        toast.success('Alumno reactivado — facturación reanudada')
      } else {
        await suspendAthlete(athleteId)
        toast.success('Alumno suspendido — facturación en pausa')
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        {isSuspended ? (
          <><PlayCircle className="w-3.5 h-3.5" /> Reactivar</>
        ) : (
          <><PauseCircle className="w-3.5 h-3.5" /> Suspender</>
        )}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSuspended ? '¿Reactivar alumno?' : '¿Suspender temporalmente?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isSuspended
                ? 'Volverá a estado activo y se reanudará la facturación desde el período actual (no se cobra el tiempo que estuvo suspendido).'
                : 'El alumno queda suspendido y se pausa la facturación: no se generan cuotas nuevas mientras esté suspendido. Las cuotas vencidas existentes se mantienen. Puedes reactivarlo cuando vuelva a entrenar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handle} disabled={loading} className={isSuspended ? '' : 'bg-amber-500 hover:bg-amber-500/90'}>
              {loading ? '…' : isSuspended ? 'Reactivar' : 'Suspender'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
