'use client'

import { useEffect } from 'react'

/**
 * Oculta el splash sin removerlo del DOM.
 *
 * Importante: NO llamar a `el.remove()` aquí. El splash es un hijo del <body>
 * renderizado por React; quitarlo con DOM API rompe el tree de React 19 y
 * provoca `insertBefore` / `removeChild` "Failed to execute" en navegaciones.
 */
export function SplashRemover() {
  useEffect(() => {
    const el = document.getElementById('__splash')
    if (!el) return
    el.style.transition = 'opacity .3s ease'
    el.style.opacity = '0'
    el.style.pointerEvents = 'none'
    const t = setTimeout(() => {
      el.style.display = 'none'
    }, 300)
    return () => clearTimeout(t)
  }, [])
  return null
}
