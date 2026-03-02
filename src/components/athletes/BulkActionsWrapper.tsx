'use client'

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckSquare, Square, Users, ChevronDown, ChevronUp } from "lucide-react"
import { bulkUpdateAthleteStatus } from "@/lib/actions/athletes"

interface Athlete {
  id: string
  name: string
  photo_url?: string | null
  status: string
  health_status: string
}

interface Props {
  athletes: Athlete[]
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido',
}
const HEALTH_DOT: Record<string, string> = {
  healthy: 'bg-green-500', observation: 'bg-yellow-400', injured: 'bg-red-500',
}

export function BulkActionsWrapper({ athletes }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const selectAll = () => setSelected(new Set(athletes.map((a) => a.id)))
  const clearAll  = () => setSelected(new Set())

  async function handleBulkStatus(status: 'active' | 'inactive' | 'suspended') {
    if (selected.size === 0) return
    const label = STATUS_LABELS[status]?.toLowerCase() ?? status
    if (!confirm(`¿Marcar ${selected.size} atleta(s) como ${label}?`)) return
    setLoading(true)
    try {
      const result = await bulkUpdateAthleteStatus(Array.from(selected), status)
      toast.success(`${result.updated} atleta(s) actualizados`)
      clearAll()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  function handleBulkExport() {
    if (selected.size === 0) return
    const sel = athletes.filter((a) => selected.has(a.id))
    const csv = [
      ['"Nombre"', '"Estado"', '"Salud"'],
      ...sel.map((a) => [`"${a.name}"`, `"${STATUS_LABELS[a.status] ?? a.status}"`, `"${a.health_status}"`]),
    ].map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `seleccion-${new Date().toISOString().split('T')[0]}.csv`; link.click()
    URL.revokeObjectURL(url)
    toast.success(`${sel.length} atletas exportados`)
  }

  const hasSelection = selected.size > 0

  return (
    <div className="space-y-2">
      {/* Toggle button */}
      <button
        onClick={() => { setOpen((p) => !p); clearAll() }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Users className="w-3.5 h-3.5" />
        Acciones masivas
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
          {/* Select all / clear */}
          <div className="flex items-center gap-3">
            <button
              onClick={selected.size === athletes.length ? clearAll : selectAll}
              className="flex items-center gap-1.5 text-xs font-medium hover:text-primary transition-colors"
            >
              {selected.size === athletes.length
                ? <CheckSquare className="w-4 h-4 text-primary" />
                : <Square className="w-4 h-4" />}
              {selected.size === athletes.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
            {hasSelection && (
              <>
                <span className="text-xs text-muted-foreground">{selected.size} seleccionado(s)</span>
                <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Limpiar
                </button>
              </>
            )}
          </div>

          {/* Athletes list */}
          <div className="grid gap-1.5 max-h-72 overflow-y-auto pr-1">
            {athletes.map((athlete) => {
              const isSel = selected.has(athlete.id)
              const dot = HEALTH_DOT[athlete.health_status] ?? 'bg-gray-400'
              return (
                <label
                  key={athlete.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer border transition-all ${
                    isSel ? 'border-primary/40 bg-primary/5' : 'border-transparent hover:bg-accent/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggle(athlete.id)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={athlete.photo_url ?? undefined} />
                    <AvatarFallback className="text-xs">{athlete.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <span className="text-sm flex-1 truncate">{athlete.name}</span>
                  <span className={`text-xs shrink-0 ${athlete.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {STATUS_LABELS[athlete.status] ?? athlete.status}
                  </span>
                  <Link
                    href={`/dashboard/athletes/${athlete.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-muted-foreground hover:text-primary shrink-0"
                  >
                    Ver →
                  </Link>
                </label>
              )
            })}
          </div>

          {/* Actions */}
          {hasSelection && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
              <span className="text-xs text-muted-foreground font-medium">Cambiar estado:</span>
              <button onClick={() => handleBulkStatus('active')} disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium disabled:opacity-50 transition-colors">
                Activar
              </button>
              <button onClick={() => handleBulkStatus('inactive')} disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium disabled:opacity-50 transition-colors">
                Inactivar
              </button>
              <button onClick={() => handleBulkStatus('suspended')} disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-50 transition-colors">
                Suspender
              </button>
              <div className="w-px h-5 bg-border" />
              <button onClick={handleBulkExport} disabled={loading}
                className="px-3 py-1.5 rounded-lg border border-input hover:bg-accent text-xs font-medium disabled:opacity-50 transition-colors">
                Exportar selección CSV
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
