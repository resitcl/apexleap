'use client'

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Search, X, SlidersHorizontal } from "lucide-react"

const STATUS_FILTERS = [
  { value: 'active',    label: 'Activos',     color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400' },
  { value: 'inactive',  label: 'Inactivos',   color: 'bg-zinc-500/10 text-zinc-600 border-zinc-200 dark:border-zinc-700 dark:text-zinc-400' },
  { value: 'suspended', label: 'Suspendidos', color: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800 dark:text-orange-400' },
]

const HEALTH_FILTERS = [
  { value: 'healthy',     label: 'Aptos',       dot: 'bg-emerald-500' },
  { value: 'observation', label: 'Observación', dot: 'bg-amber-400' },
  { value: 'injured',     label: 'Lesionados',  dot: 'bg-red-500' },
]

export function AthletesSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const currentSearch = searchParams.get('search') ?? ''
  const currentStatus = searchParams.get('status')
  const currentHealth = searchParams.get('health')
  const hasFilters = currentSearch || currentStatus || currentHealth
  const activeCount = [currentStatus, currentHealth].filter(Boolean).length

  return (
    <div className="space-y-2.5">
      {/* Search + filter count */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre, email o RUT..."
            className="pl-9 h-9"
            defaultValue={currentSearch}
            onChange={(e) => {
              const val = e.target.value
              clearTimeout((window as typeof window & { _st?: ReturnType<typeof setTimeout> })._st)
              ;(window as typeof window & { _st?: ReturnType<typeof setTimeout> })._st = setTimeout(
                () => updateParams('search', val || null), 350
              )
            }}
          />
          {currentSearch && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => updateParams('search', null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeCount} filtro{activeCount > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Filter pills row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mr-1">Estado</span>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => updateParams('status', currentStatus === f.value ? null : f.value)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              currentStatus === f.value
                ? f.color + ' shadow-sm'
                : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="w-px h-4 bg-border mx-1" />

        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mr-1">Salud</span>
        {HEALTH_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => updateParams('health', currentHealth === f.value ? null : f.value)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              currentHealth === f.value
                ? 'bg-foreground text-background border-foreground shadow-sm'
                : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
            {f.label}
          </button>
        ))}

        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent transition-all ml-1"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}
