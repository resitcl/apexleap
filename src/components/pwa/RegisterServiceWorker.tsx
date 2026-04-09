'use client'

import { useEffect } from 'react'

/**
 * Registra el SW público en producción para cumplir requisitos de instalación PWA.
 * En desarrollo no se registra (evita caches raros con HMR).
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* noop — no bloquear la app si SW falla */
    })
  }, [])

  return null
}
