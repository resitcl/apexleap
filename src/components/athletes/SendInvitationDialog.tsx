'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendClubInvitationEmail } from '@/lib/actions/athletes'
import { Mail, Loader2, CheckCircle2, Send } from 'lucide-react'

export function SendInvitationDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleClose(value: boolean) {
    if (!value) {
      // Reset al cerrar
      setEmail('')
      setStatus('idle')
      setErrorMsg(null)
    }
    setOpen(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg(null)

    const result = await sendClubInvitationEmail(email.trim())

    if (result.ok) {
      setStatus('success')
    } else {
      setStatus('error')
      setErrorMsg(result.error)
    }
  }

  function handleSendAnother() {
    setEmail('')
    setStatus('idle')
    setErrorMsg(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 h-10 rounded-xl font-black uppercase tracking-widest text-xs"
        >
          <Mail className="w-4 h-4" />
          Enviar invitación
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invitar a la academia
          </DialogTitle>
          <DialogDescription>
            Ingresa el correo de la persona que quieres invitar. Le llegará un email
            con un link para inscribirse en tu club.
          </DialogDescription>
        </DialogHeader>

        {status === 'success' ? (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">¡Invitación enviada!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Se envió el correo a <strong>{email}</strong> con el link de inscripción.
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handleSendAnother}>
                Enviar otra
              </Button>
              <Button className="flex-1" onClick={() => handleClose(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="invite-email">Correo electrónico</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={status === 'loading'}
                autoFocus
                required
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              La persona recibirá un correo con el link para crear su cuenta e inscribirse en tu academia.
            </p>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
                disabled={status === 'loading'}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={status === 'loading' || !email.trim()}
                className="gap-2"
              >
                {status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {status === 'loading' ? 'Enviando...' : 'Enviar invitación'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
