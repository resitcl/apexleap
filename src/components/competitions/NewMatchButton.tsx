'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { createMatch } from '@/lib/actions/matches'

interface Props {
  competitionId: string
}

export function NewMatchButton({ competitionId }: Props) {
  const [open, setOpen]   = useState(false)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  const [form, setForm] = useState({
    opponent:   '',
    match_date: new Date().toISOString().split('T')[0],
    location:   '',
    is_home:    true,
    home_score: '',
    away_score: '',
    status:     'scheduled',
    notes:      '',
  })

  function set(k: string, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.opponent.trim()) { setError('El rival es obligatorio'); return }
    setError('')
    start(async () => {
      try {
        await createMatch({
          competition_id: competitionId,
          opponent:       form.opponent.trim(),
          match_date:     form.match_date,
          location:       form.location || undefined,
          is_home:        form.is_home,
          home_score:     form.home_score !== '' ? Number(form.home_score) : null,
          away_score:     form.away_score !== '' ? Number(form.away_score) : null,
          status:         form.status,
          notes:          form.notes || undefined,
        })
        setOpen(false)
        setForm({ opponent: '', match_date: new Date().toISOString().split('T')[0], location: '', is_home: true, home_score: '', away_score: '', status: 'scheduled', notes: '' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
        Nuevo partido
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold">Nuevo partido</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Rival *</label>
                  <input
                    value={form.opponent}
                    onChange={e => set('opponent', e.target.value)}
                    placeholder="Nombre del equipo rival"
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                  <input
                    type="date"
                    value={form.match_date}
                    onChange={e => set('match_date', e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Estado</label>
                  <select
                    value={form.status}
                    onChange={e => set('status', e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="scheduled">Programado</option>
                    <option value="in_progress">En juego</option>
                    <option value="finished">Finalizado</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Lugar</label>
                  <input
                    value={form.location}
                    onChange={e => set('location', e.target.value)}
                    placeholder="Cancha, estadio, etc."
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-3">
                  <label className="text-sm font-medium">Local:</label>
                  <button
                    type="button"
                    onClick={() => set('is_home', true)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${form.is_home ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                  >
                    Nuestro equipo
                  </button>
                  <button
                    type="button"
                    onClick={() => set('is_home', false)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${!form.is_home ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                  >
                    Visita
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {form.is_home ? 'Nuestro marcador' : 'Marcador rival'}
                  </label>
                  <input
                    type="number" min="0"
                    value={form.home_score}
                    onChange={e => set('home_score', e.target.value)}
                    placeholder="—"
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {form.is_home ? 'Marcador rival' : 'Nuestro marcador'}
                  </label>
                  <input
                    type="number" min="0"
                    value={form.away_score}
                    onChange={e => set('away_score', e.target.value)}
                    placeholder="—"
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 h-9 rounded-lg border border-input text-sm hover:bg-accent transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2">
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
