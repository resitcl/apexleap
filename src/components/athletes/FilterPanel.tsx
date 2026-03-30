'use client'

import { useState } from 'react'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'

export function FilterPanel({ children, activeFilterCount }: { children: React.ReactNode; activeFilterCount: number }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${
          open || activeFilterCount > 0
            ? 'bg-primary/10 text-primary border-primary/25'
            : 'border-white/[0.06] text-muted-foreground/60 hover:text-foreground hover:border-white/[0.12] bg-transparent'
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filtros
        {activeFilterCount > 0 && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        <div className="rounded-xl border border-white/[0.04] bg-muted/5 p-5 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
