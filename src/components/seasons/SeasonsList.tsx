'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveSeason, deleteSeason } from '@/lib/actions/seasons'
import { CheckCircle2, Trash2, Loader2, Star } from 'lucide-react'

type Season = {
  id: string
  name: string
  type: string
  year: number
  start_date: string
  end_date: string
  is_active: boolean
  description: string | null
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  apertura:     { label: 'Apertura',     color: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400'  },
  clausura:     { label: 'Clausura',     color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  pretemporada: { label: 'Pre-temporada',color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  other:        { label: 'Otra',         color: 'bg-zinc-100  text-zinc-600  dark:bg-zinc-800     dark:text-zinc-400'  },
}

interface Props {
  seasons: Season[]
}

export function SeasonsList({ seasons }: Props) {
  const router = useRouter()
  const [pendingId, setPendingId]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, start]          = useTransition()

  async function handleActivate(id: string) {
    setPendingId(id)
    start(async () => {
      try { await setActiveSeason(id); router.refresh() }
      catch (e) { alert(e instanceof Error ? e.message : 'Error') }
      finally { setPendingId(null) }
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar temporada "${name}"?`)) return
    setDeletingId(id)
    start(async () => {
      try { await deleteSeason(id); router.refresh() }
      catch (e) { alert(e instanceof Error ? e.message : 'Error') }
      finally { setDeletingId(null) }
    })
  }

  if (seasons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Sin temporadas registradas. Crea la primera arriba.
      </p>
    )
  }

  // Group by year desc
  const byYear: Record<number, Season[]> = {}
  seasons.forEach((s) => {
    if (!byYear[s.year]) byYear[s.year] = []
    byYear[s.year].push(s)
  })
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  return (
    <div className="space-y-5">
      {years.map((year) => (
        <div key={year}>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
            {year}
          </p>
          <div className="space-y-2">
            {byYear[year].map((season) => {
              const meta = TYPE_META[season.type] ?? TYPE_META.other
              const isActivating = pendingId === season.id && isPending
              const isDeleting   = deletingId === season.id && isPending
              return (
                <div
                  key={season.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                    season.is_active
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-card hover:bg-accent/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {season.is_active && (
                      <Star className="w-4 h-4 text-primary shrink-0 fill-primary" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm leading-tight">{season.name}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                        {season.is_active && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary text-primary-foreground">
                            Activa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(season.start_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                        {' — '}
                        {new Date(season.end_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {season.description && (
                        <p className="text-xs text-muted-foreground truncate">{season.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!season.is_active && (
                      <button
                        onClick={() => handleActivate(season.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                      >
                        {isActivating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Activar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(season.id, season.name)}
                      disabled={isPending || season.is_active}
                      title={season.is_active ? 'No puedes eliminar la temporada activa' : 'Eliminar'}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
