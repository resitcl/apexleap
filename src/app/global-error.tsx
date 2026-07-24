'use client'

import { useEffect } from 'react'
import { reportClientError } from '@/lib/client-error-report'

/**
 * Boundary global: reemplaza al root layout completo cuando un error ocurre en el propio layout
 * o por encima de él. IMPORTANTE: globals.css NO está cargado aquí, así que NO se pueden usar
 * clases de Tailwind ni variables del tema — todo es estilo inline con colores fijos.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] global error:', error)
    reportClientError({
      boundary: 'global-error',
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    })
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: 24,
          textAlign: 'center',
          background: '#0a0a0a',
          color: '#fafafa',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}
        >
          ⚠️
        </div>
        <div style={{ maxWidth: 420 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Ocurrió un problema</h2>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#a1a1aa', margin: 0 }}>
            No pudimos cargar la aplicación. Puedes reintentar o volver al inicio.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              height: 44,
              padding: '0 24px',
              borderRadius: 12,
              border: 'none',
              background: '#34d399',
              color: '#052e16',
              fontWeight: 800,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
          {/* Navegación dura a propósito: global-error corre fuera del árbol del router,
              donde <Link> no es confiable. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              height: 44,
              padding: '0 24px',
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.08)',
              color: '#fafafa',
              fontWeight: 700,
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Volver al inicio
          </a>
        </div>
      </body>
    </html>
  )
}
