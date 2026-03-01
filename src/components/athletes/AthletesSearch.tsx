'use client'

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"

const STATUS_FILTERS = [
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'suspended', label: 'Suspendidos' },
]

const HEALTH_FILTERS = [
  { value: 'healthy', label: '🟢 Aptos' },
  { value: 'observation', label: '🟡 Observación' },
  { value: 'injured', label: '🔴 Lesionados' },
]

export function AthletesSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const currentSearch = searchParams.get('search') ?? ''
  const currentStatus = searchParams.get('status')
  const currentHealth = searchParams.get('health')
  const hasFilters = currentSearch || currentStatus || currentHealth

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o RUT..."
          className="pl-9"
          defaultValue={currentSearch}
          onChange={(e) => {
            const val = e.target.value
            clearTimeout((window as typeof window & { _searchTimeout?: ReturnType<typeof setTimeout> })._searchTimeout)
            ;(window as typeof window & { _searchTimeout?: ReturnType<typeof setTimeout> })._searchTimeout = setTimeout(
              () => updateParams('search', val || null),
              400
            )
          }}
        />
        {currentSearch && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => updateParams('search', null)}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Estado:</span>
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} onClick={() => updateParams('status', currentStatus === f.value ? null : f.value)}>
            <Badge variant={currentStatus === f.value ? 'default' : 'outline'}>
              {f.label}
            </Badge>
          </button>
        ))}

        <span className="text-sm text-muted-foreground ml-2">Salud:</span>
        {HEALTH_FILTERS.map((f) => (
          <button key={f.value} onClick={() => updateParams('health', currentHealth === f.value ? null : f.value)}>
            <Badge variant={currentHealth === f.value ? 'default' : 'outline'}>
              {f.label}
            </Badge>
          </button>
        ))}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="text-muted-foreground gap-1"
          >
            <X className="w-3 h-3" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  )
}
