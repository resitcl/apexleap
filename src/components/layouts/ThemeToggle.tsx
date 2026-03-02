'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const options = [
    { value: 'light',  icon: Sun,     label: 'Claro'   },
    { value: 'dark',   icon: Moon,    label: 'Oscuro'  },
    { value: 'system', icon: Monitor, label: 'Sistema' },
  ] as const

  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={`flex-1 flex items-center justify-center py-1 rounded-md transition-colors ${
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  )
}
