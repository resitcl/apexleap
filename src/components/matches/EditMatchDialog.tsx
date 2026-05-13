'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2 } from 'lucide-react'
import { updateMatch } from '@/lib/actions/matches'
import { Button } from '@/components/ui/button'

export type EditableMatchRow = {
  id: string
  competition_id: string | null
  opponent: string | null
  match_date: string
  location: string | null
  is_home: boolean
  home_score: number | null
  away_score: number | null
  status: string
  notes: string | null
}

export function EditMatchDialog({ match }: { match: EditableMatchRow }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const [form, setForm] = useState({
    opponent: match.opponent ?? '',
    match_date: match.match_date,
    location: match.location ?? '',
    is_home: match.is_home,
    home_score: match.home_score != null ? String(match.home_score) : '',
    away_score: match.away_score != null ? String(match.away_score) : '',
    status: match.status,
    notes: match.notes ?? '',
  })

  function set(k: keyof typeof form, v: string | boolean) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function resetFromProps() {
    setForm({
      opponent: match.opponent ?? '',
      match_date: match.match_date,
      location: match.location ?? '',
      is_home: match.is_home,
      home_score: match.home_score != null ? String(match.home_score) : '',
      away_score: match.away_score != null ? String(match.away_score) : '',
      status: match.status,
      notes: match.notes ?? '',
    })
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.opponent.trim()) {
      setError('El rival es obligatorio')
      return
    }
    setError('')
    start(async () => {
      try {
        await updateMatch(match.id, match.competition_id, {
          opponent: form.opponent.trim(),
          match_date: form.match_date,
          location: form.location || undefined,
          is_home: form.is_home,
          status: form.status,
          notes: form.notes || undefined,
          home_score:
            form.status !== 'scheduled' && form.home_score !== '' ? Number(form.home_score) : null,
          away_score:
            form.status !== 'scheduled' && form.away_score !== '' ? Number(form.away_score) : null,
        })
        setOpen(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => {
          resetFromProps()
          setOpen(true)
        }}
      >
        <Pencil className="size-3.5" />
        Editar
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Editar partido</h2>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  resetFromProps()
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Rival *</label>
                <input
                  value={form.opponent}
                  onChange={(e) => set('opponent', e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                <input
                  type="date"
                  value={form.match_date}
                  onChange={(e) => set('match_date', e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Lugar</label>
                <input
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Condición:</span>
                <button
                  type="button"
                  onClick={() => set('is_home', true)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${form.is_home ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  Local
                </button>
                <button
                  type="button"
                  onClick={() => set('is_home', false)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${!form.is_home ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  Visita
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="scheduled">Programado</option>
                  <option value="in_progress">En juego</option>
                  <option value="finished">Finalizado</option>
                </select>
              </div>
              {form.status !== 'scheduled' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {form.is_home ? 'Marcador local (tabla)' : 'Marcador visita'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.home_score}
                      onChange={(e) => set('home_score', e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {form.is_home ? 'Marcador visita' : 'Marcador local (tabla)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.away_score}
                      onChange={(e) => set('away_score', e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setOpen(false)
                    resetFromProps()
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={pending}>
                  {pending && <Loader2 className="size-3.5 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
