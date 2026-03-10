'use client'

import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  defaultExpanded?: boolean
  activeFiltersCount?: number
  onClearAll?: () => void
}

export function CollapsibleFilters({ 
  children, 
  defaultExpanded = false,
  activeFiltersCount = 0,
  onClearAll,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="border rounded-lg bg-card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onClearAll()
              }}
            >
              <X className="w-3 h-3 mr-1" />
              Limpiar
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
