'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { reviewEnrollment } from '@/lib/actions/athlete-enrollment'

interface Props {
  athleteId: string
  athleteName: string
}

export function EnrollmentReviewActions({ athleteId, athleteName }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [notes, setNotes] = useState('')

  async function handleApprove() {
    setLoading(true)
    try {
      await reviewEnrollment(athleteId, 'approved', notes || undefined)
      toast.success(`${athleteName} ha sido aprobado. Se enviará un correo de notificación.`)
      setApproveOpen(false)
      setNotes('')
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aprobar')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      await reviewEnrollment(athleteId, 'rejected', notes || undefined)
      toast.success(`La solicitud de ${athleteName} ha sido rechazada.`)
      setRejectOpen(false)
      setNotes('')
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al rechazar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 pt-2 border-t">
      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogTrigger asChild>
          <Button className="flex-1 bg-green-600 hover:bg-green-700">
            <CheckCircle className="w-4 h-4 mr-2" /> Aprobar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de aprobar la solicitud de <strong>{athleteName}</strong>?
              Se enviará un correo notificándole que puede proceder con el pago.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approve-notes">Mensaje para el atleta (opcional)</Label>
            <Textarea
              id="approve-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: ¡Bienvenido al equipo! Te esperamos en los entrenamientos..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={loading || isPending}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={loading || isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading || isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Procesando...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar Aprobación</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="w-4 h-4 mr-2" /> Rechazar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de rechazar la solicitud de <strong>{athleteName}</strong>?
              Se enviará un correo notificándole la decisión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-notes">Motivo del rechazo (opcional)</Label>
            <Textarea
              id="reject-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: En este momento no tenemos cupos disponibles..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={loading || isPending}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={loading || isPending}
              variant="destructive"
            >
              {loading || isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Procesando...</>
              ) : (
                <><XCircle className="w-4 h-4 mr-2" /> Confirmar Rechazo</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
