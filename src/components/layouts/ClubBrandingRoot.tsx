'use client'

import { useLayoutEffect, useMemo } from 'react'

/**
 * Aplica variables de marca en `document.documentElement` para que:
 * - En `.dark`, el bloque de `globals.css` no deje fijo el verde (#34d399) por encima del árbol del club.
 * - Portales (p. ej. Clerk) que montan fuera del div del layout hereden el mismo `--primary`.
 */
export function ClubBrandingRoot({ varsJson }: { varsJson: string }) {
  const vars = useMemo(() => {
    try {
      const parsed = JSON.parse(varsJson) as Record<string, string>
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }, [varsJson])

  useLayoutEffect(() => {
    const root = document.documentElement
    const keys = Object.keys(vars)
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v)
    }
    return () => {
      for (const k of keys) {
        root.style.removeProperty(k)
      }
    }
  }, [vars])

  return null
}
