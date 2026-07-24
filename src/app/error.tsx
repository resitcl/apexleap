'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { reportClientError } from '@/lib/client-error-report'

/**
 * Error boundary a nivel raíz. Captura excepciones de render que escapan a los boundaries
 * de segmento y las reporta a /api/client-errors. Sin esto, un throw fuera del portal del
 * atleta muestra el mensaje genérico de Next ("Application error…") sin pista del origen.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] error no capturado:', error)
    reportClientError({
      boundary: 'app/error',
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-black tracking-tight">Ocurrió un problema</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No pudimos cargar esta página. Puedes reintentar; si el problema persiste, contacta al club.
        </p>
      </div>
      <button
        onClick={reset}
        className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  )
}
