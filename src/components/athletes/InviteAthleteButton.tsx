'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { sendAthleteInvitation } from '@/lib/actions/athletes'
import { Mail, Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface InviteAthleteButtonProps {
  athleteId: string
  athleteEmail: string | null
}

export function InviteAthleteButton({ athleteId, athleteEmail }: InviteAthleteButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Si no tiene email, mostramos el botón deshabilitado con tooltip
  if (!athleteEmail) {
    return (
      <Button variant="outline" size="sm" disabled title="El alumno no tiene email registrado">
        <Mail className="h-4 w-4 mr-2" />
        Enviar invitación
      </Button>
    )
  }

  async function handleInvite() {
    setStatus('loading')
    setErrorMsg(null)
    const result = await sendAthleteInvitation(athleteId)
    if (result.ok) {
      setStatus('success')
      // Resetear el estado después de 4 segundos
      setTimeout(() => setStatus('idle'), 4000)
    } else {
      setStatus('error')
      setErrorMsg(result.error)
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  if (status === 'success') {
    return (
      <Button variant="outline" size="sm" disabled className="text-green-600 border-green-300">
        <CheckCircle2 className="h-4 w-4 mr-2" />
        ¡Correo enviado!
      </Button>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled className="text-red-600 border-red-300">
          <XCircle className="h-4 w-4 mr-2" />
          Error al enviar
        </Button>
        {errorMsg && (
          <span className="text-xs text-red-500 max-w-[200px] truncate" title={errorMsg}>
            {errorMsg}
          </span>
        )}
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInvite}
      disabled={status === 'loading'}
      title={`Enviar invitación a ${athleteEmail}`}
    >
      {status === 'loading' ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Mail className="h-4 w-4 mr-2" />
      )}
      {status === 'loading' ? 'Enviando...' : 'Enviar invitación'}
    </Button>
  )
}
