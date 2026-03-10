'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, ExternalLink, Send, RefreshCw } from 'lucide-react'

interface Props {
  templateId: string
  agreementId: string | null
  status: string
  signingUrl: string | null
}

export function AgreementSignButton({ templateId, agreementId, status, signingUrl }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreateAndSend() {
    setLoading(true)
    try {
      const res = await fetch('/api/agreements/create-and-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, agreementId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar')
      }

      if (data.signingUrl) {
        // Open signing URL in new tab
        window.open(data.signingUrl, '_blank')
        toast.success('Documento enviado a firma. Se abrirá una nueva pestaña.')
      } else {
        toast.success('Documento creado. Procesando firma...')
      }

      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar')
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckStatus() {
    if (!agreementId) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/agreements/${agreementId}/status`, {
        method: 'POST',
      })

      const data = await res.json()

      if (data.status === 'signed' || data.status === 'completed') {
        toast.success('¡Documento firmado exitosamente!')
        router.refresh()
      } else {
        toast.info('El documento aún no ha sido firmado')
      }
    } catch (err) {
      toast.error('Error al verificar estado')
    } finally {
      setLoading(false)
    }
  }

  // Not created yet - show create button
  if (status === 'not_created' || status === 'expired') {
    return (
      <Button 
        onClick={handleCreateAndSend} 
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {status === 'expired' ? 'Renovar y Firmar' : 'Crear y Firmar'}
      </Button>
    )
  }

  // Pending - needs to be sent to GESTDOC
  if (status === 'pending') {
    return (
      <Button 
        onClick={handleCreateAndSend} 
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        Enviar a Firma
      </Button>
    )
  }

  // Sent to sign - show signing URL and check status
  if (status === 'sent_to_sign') {
    return (
      <div className="flex gap-2">
        {signingUrl && (
          <Button 
            onClick={() => window.open(signingUrl, '_blank')}
            className="flex-1 gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Firmar con Clave Única
          </Button>
        )}
        <Button 
          variant="outline"
          onClick={handleCheckStatus}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Verificar
        </Button>
      </div>
    )
  }

  return null
}
