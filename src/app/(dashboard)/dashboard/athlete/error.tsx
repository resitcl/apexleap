'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Error boundary del portal del atleta. Sin esto, cualquier excepción no capturada en un
 * server component deja pantalla en negro (Next no muestra nada). Aquí mostramos un mensaje
 * amable con botón de reintento.
 */
export default function AthletePortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[portal atleta] error no capturado:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 gap-5">
      <div className="w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/25 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-lg font-black tracking-tight">No pudimos cargar esta sección</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ocurrió un problema al mostrar esta página. Puedes reintentar; si el problema persiste,
          contacta al club.
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
