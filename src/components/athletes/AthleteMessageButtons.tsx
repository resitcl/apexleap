'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MessageSquare, DollarSign, Loader2 } from 'lucide-react'
import { sendMessageToAthlete, sendPaymentRequest } from '@/lib/actions/communications'

export function AthleteMessageButtons({ athleteId, hasEmail }: { athleteId: string; hasEmail: boolean }) {
  const [msgOpen, setMsgOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const noEmailTitle = hasEmail ? undefined : 'El alumno no tiene email registrado'

  async function sendMsg() {
    setLoading(true)
    try {
      const res = await sendMessageToAthlete(athleteId, { subject, body })
      if (res.ok) {
        toast.success('Mensaje enviado')
        setMsgOpen(false); setSubject(''); setBody('')
      } else toast.error(res.error ?? 'No se pudo enviar')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  async function requestPay() {
    setLoading(true)
    try {
      const res = await sendPaymentRequest(athleteId, note)
      if (res.ok) {
        toast.success('Solicitud de pago enviada')
        setNote('')
      } else toast.error(res.error ?? 'No se pudo enviar')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
      setPayOpen(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMsgOpen(true)} disabled={!hasEmail} title={noEmailTitle}>
        <MessageSquare className="w-3.5 h-3.5" /> Enviar mensaje
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPayOpen(true)} disabled={!hasEmail} title={noEmailTitle}>
        <DollarSign className="w-3.5 h-3.5" /> Solicitar pago
      </Button>

      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar mensaje</DialogTitle>
            <DialogDescription>
              Se envía por correo a este alumno. Variables: {'{{nombre}}'}, {'{{plan}}'}, {'{{deuda}}'}, {'{{club}}'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-subject">Asunto</Label>
              <Input id="m-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej: Aviso importante" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-body">Mensaje</Label>
              <Textarea id="m-body" rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder={'Hola {{nombre}},\n\n…'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsgOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={sendMsg} disabled={loading || !subject.trim() || !body.trim()} className="gap-1.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={payOpen} onOpenChange={setPayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Solicitar pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará un correo con el monto pendiente y un botón para pagar en el portal. Puedes agregar una nota.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="p-note">Nota (opcional)</Label>
            <Textarea id="p-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Recuerda regularizar antes del viernes." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={requestPay} disabled={loading}>{loading ? '…' : 'Enviar solicitud'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
