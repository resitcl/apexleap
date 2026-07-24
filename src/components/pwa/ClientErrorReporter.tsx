'use client'

import { useEffect } from 'react'
import { reportClientError } from '@/lib/client-error-report'

/**
 * Escucha errores globales del navegador (window.onerror + unhandledrejection) y los reporta.
 * Captura la clase de crash que los error boundaries de React NO atrapan — p.ej. los fallos de
 * commit del DOM en React 19 ("insertBefore"/"removeChild" en navegaciones, ver SplashRemover).
 */
export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) =>
      reportClientError({
        type: 'window.onerror',
        message: e.message,
        stack: e.error?.stack,
        source: e.filename,
        line: e.lineno,
        col: e.colno,
      })

    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as Error | undefined
      reportClientError({
        type: 'unhandledrejection',
        message: reason?.message ?? String(e.reason),
        stack: reason?.stack,
      })
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
