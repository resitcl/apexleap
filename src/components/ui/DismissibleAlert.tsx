'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  dismissKey: string
  children: React.ReactNode
}

export function DismissibleAlert({ dismissKey, children }: Props) {
  const [visible, setVisible] = useState(false)
  const storageKey = `alert-dismissed:${dismissKey}`

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored !== '1') setVisible(true)
  }, [storageKey])

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
  }

  return (
    <div className="relative">
      {children}
      <button
        onClick={dismiss}
        title="Marcar como visto"
        className="absolute top-3 right-3 z-10 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
