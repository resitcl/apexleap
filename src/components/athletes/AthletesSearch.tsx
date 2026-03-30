'use client'

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Search, X } from "lucide-react"

const STATUS_FILTERS = [
  { value: 'active',    label: 'Activos' },
  { value: 'inactive',  label: 'Inactivos' },
  { value: 'suspended', label: 'Suspendidos' },
]

const HEALTH_FILTERS = [
  { value: 'healthy',     label: 'Aptos',       dot: 'bg-emerald-400' },
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

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o RUT..."
          className="w-full h-11 pl-11 pr-10 rounded-xl border border-white/[0.06] bg-muted/20 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
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
          <button className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 transition-all" onClick={() => updateParams('search', null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Estado + Salud inline */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 items-center">
        {/* Estado */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Estado</span>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => updateParams('status', currentStatus === f.value ? null : f.value)}
                className={`inline-flex items-center h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                  currentStatus === f.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_8px_rgba(var(--primary),0.2)]'
                    : 'border-white/[0.06] text-muted-foreground/60 hover:border-primary/30 hover:text-foreground bg-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.06] hidden sm:block" />

        {/* Salud */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Salud</span>
          <div className="flex gap-1">
            {HEALTH_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => updateParams('health', currentHealth === f.value ? null : f.value)}
                className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                  currentHealth === f.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_8px_rgba(var(--primary),0.2)]'
                    : 'border-white/[0.06] text-muted-foreground/60 hover:border-primary/30 hover:text-foreground bg-transparent'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentHealth === f.value ? 'bg-primary-foreground' : f.dot}`} />
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
