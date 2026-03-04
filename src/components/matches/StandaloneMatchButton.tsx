'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, X, Loader2, Trophy } from 'lucide-react'
import { createMatch } from '@/lib/actions/matches'
import { getCompetitions } from '@/lib/actions/competitions'
import { getCategories } from '@/lib/actions/categories'

type CompOption = { id: string; name: string; type: string }
type CategoryOption = { id: string; name: string; color: string | null }

export function StandaloneMatchButton() {
  const [open, setOpen]          = useState(false)
  const [error, setError]        = useState('')
  const [isPending, start]       = useTransition()
  const [competitions, setComps] = useState<CompOption[]>([])
  const [categories, setCats]    = useState<CategoryOption[]>([])
  const [competitionId, setCompetitionId] = useState<string>('')
  const [categoryId, setCategoryId]       = useState<string>('')

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

  useEffect(() => {
    if (!open) return
    Promise.all([
      getCompetitions({ status: 'active',   limit: 50 }),
      getCompetitions({ status: 'upcoming', limit: 50 }),
      getCategories(true),
    ]).then(([a, u, cats]) => {
      setComps([...a.competitions, ...u.competitions].map((c) => ({ id: c.id, name: c.name, type: c.type })))
      setCats(cats.map((c) => ({ id: c.id, name: c.name, color: c.color ?? null })))
    }).catch(() => {})
  }, [open])

  function set(k: string, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function reset() {
    setForm({ opponent: '', match_date: new Date().toISOString().split('T')[0], location: '', is_home: true, home_score: '', away_score: '', status: 'scheduled', notes: '' })
    setCompetitionId('')
    setCategoryId('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.opponent.trim()) { setError('El rival es obligatorio'); return }
    setError('')
    start(async () => {
      try {
        await createMatch({
          competition_id: competitionId || null,
          category_id:    categoryId    || null,
          opponent:       form.opponent.trim(),
          match_date:     form.match_date,
          location:       form.location || undefined,
          is_home:        form.is_home,
          home_score:     form.status !== 'scheduled' && form.home_score !== '' ? Number(form.home_score) : null,
          away_score:     form.status !== 'scheduled' && form.away_score !== '' ? Number(form.away_score) : null,
          status:         form.status,
          notes:          form.notes || undefined,
        })
        setOpen(false)
        reset()
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
              <h2 className="text-base font-semibold">Nuevo partido / amistoso</h2>
              <button onClick={() => { setOpen(false); reset() }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">

                {/* Competition selector */}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Torneo / Campeonato
                  </label>
                  <select
                    value={competitionId}
                    onChange={e => setCompetitionId(e.target.value)}
                    className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">⚡ Amistoso (sin torneo)</option>
                    {competitions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Category selector */}
                {categories.length > 0 && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Categoría</label>
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Sin categoría —</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

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
                  <button type="button" onClick={() => set('is_home', true)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${form.is_home ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                    Nuestro equipo
                  </button>
                  <button type="button" onClick={() => set('is_home', false)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${!form.is_home ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                    Visita
                  </button>
                </div>

                {form.status !== 'scheduled' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {form.is_home ? 'Nuestro marcador' : 'Marcador rival'}
                      </label>
                      <input type="number" min="0" value={form.home_score}
                        onChange={e => set('home_score', e.target.value)} placeholder="0"
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        {form.is_home ? 'Marcador rival' : 'Nuestro marcador'}
                      </label>
                      <input type="number" min="0" value={form.away_score}
                        onChange={e => set('away_score', e.target.value)} placeholder="0"
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                    placeholder="Observaciones del partido..."
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setOpen(false); reset() }}
                  className="flex-1 h-9 rounded-lg border border-input text-sm hover:bg-accent transition-colors">
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
