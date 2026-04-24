'use client'

import { useEffect } from 'react'

export function SplashRemover() {
  useEffect(() => {
    const el = document.getElementById('__splash')
    if (!el) return
    el.style.opacity = '0'
    const t = setTimeout(() => el.remove(), 300)
    return () => clearTimeout(t)
  }, [])
  return null
}
