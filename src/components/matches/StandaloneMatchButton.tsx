'use client'

import { useState, useTransition, useEffect } from 'react'
import { Plus, X, Loader2, Trophy, ArrowRight, Check, Star, Users } from 'lucide-react'
import { toast } from 'sonner'
import { createMatch } from '@/lib/actions/matches'
import { getCompetitions } from '@/lib/actions/competitions'
import { getCategories } from '@/lib/actions/categories'
import { bulkAddAthletesToRoster, getAthletesSemaforo } from '@/lib/actions/rosters'

type CompOption = { id: string; name: string; type: string }
type CategoryOption = { id: string; name: string; color: string | null }
type AthleteOption = {
  id: string
  name: string
  semaforo: 'green' | 'yellow' | 'red'
  jersey_number: number | null
  category: string
}
type SelectedAthlete = { isStarter: boolean; isCaptain: boolean; number: string }

export function StandaloneMatchButton() {
  const [open, setOpen]          = useState(false)
  const [step, setStep]          = useState<1 | 2>(1)
  const [error, setError]        = useState('')
  const [isPending, start]       = useTransition()
  const [competitions, setComps] = useState<CompOption[]>([])
  const [categories, setCats]    = useState<CategoryOption[]>([])
  const [competitionId, setCompetitionId] = useState<string>('')
  const [categoryId, setCategoryId]       = useState<string>('')

  const [createdMatch, setCreatedMatch] = useState<{ id: string; rosterId: string | null; competitionId: string | null } | null>(null)
  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [loadingAthletes, setLoadingAthletes] = useState(false)
  const [selected, setSelected] = useState<Record<string, SelectedAthlete>>({})
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    opponent:   '',
    match_date: new Date().toISOString().split('T')[0],
    match_time: '',
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

  function resetAll() {
    setForm({ opponent: '', match_date: new Date().toISOString().split('T')[0], match_time: '', location: '', is_home: true, home_score: '', away_score: '', status: 'scheduled', notes: '' })
    setCompetitionId('')
    setCategoryId('')
    setError('')
    setStep(1)
    setCreatedMatch(null)
    setSelected({})
    setSearch('')
  }

  function closeModal() {
    setOpen(false)
    setTimeout(resetAll, 200)
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault()
    if (!form.opponent.trim()) { setError('El rival es obligatorio'); return }
    setError('')
    start(async () => {
      try {
        const match = await createMatch({
          competition_id: competitionId || null,
          category_id:    categoryId    || null,
          opponent:       form.opponent.trim(),
          match_date:     form.match_date,
          match_time:     form.match_time || null,
          location:       form.location || undefined,
          is_home:        form.is_home,
          home_score:     form.status !== 'scheduled' && form.home_score !== '' ? Number(form.home_score) : null,
          away_score:     form.status !== 'scheduled' && form.away_score !== '' ? Number(form.away_score) : null,
          status:         form.status,
          notes:          form.notes || undefined,
        }) as { id: string; roster_id: string | null }
        setCreatedMatch({ id: match.id, rosterId: match.roster_id, competitionId: competitionId || null })
        setStep(2)
        setLoadingAthletes(true)
        try {
          const list = await getAthletesSemaforo()
          setAthletes(list)
        } catch {
          toast.error('No se pudieron cargar los atletas')
        } finally {
          setLoadingAthletes(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  function toggleAthlete(id: string, jersey: number | null) {
    setSelected(prev => {
      if (prev[id]) {
        const { [id]: _omit, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: { isStarter: true, isCaptain: false, number: jersey != null ? String(jersey) : '' } }
    })
  }

  function updateSelected(id: string, patch: Partial<SelectedAthlete>) {
    setSelected(prev => prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev)
  }

  async function handleFinish(withAthletes: boolean) {
    if (!createdMatch) { closeModal(); return }
    if (!withAthletes || Object.keys(selected).length === 0 || !createdMatch.rosterId) {
      toast.success(withAthletes ? 'Partido creado' : 'Partido creado sin convocatoria')
      closeModal()
      return
    }
    setError('')
    start(async () => {
      try {
        const payload = Object.entries(selected).map(([athleteId, v]) => ({
          athleteId,
          isStarter: v.isStarter,
          isCaptain: v.isCaptain,
          number: v.number.trim() ? Number(v.number) : null,
        }))
        await bulkAddAthletesToRoster({
          rosterId: createdMatch.rosterId!,
          competitionId: createdMatch.competitionId,
          athletes: payload,
        })
        toast.success(`Partido y convocatoria creados (${payload.length} citados)`)
        closeModal()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al guardar convocatoria'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  const selectedCount = Object.keys(selected).length
  const filtered = athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))

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
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold">
                  {step === 1 ? 'Nuevo partido / amistoso' : 'Convocatoria'}
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className={`w-6 h-6 rounded-full text-xs font-medium inline-flex items-center justify-center ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}`}>
                    {step > 1 ? <Check className="w-3 h-3" /> : '1'}
                  </span>
                  <span className="w-4 h-px bg-border" />
                  <span className={`w-6 h-6 rounded-full text-xs font-medium inline-flex items-center justify-center ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    2
                  </span>
                </div>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {step === 1 && (
              <form onSubmit={handleCreateMatch} className="p-5 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Torneo / Campeonato
                    </label>
                    <select value={competitionId} onChange={e => setCompetitionId(e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">⚡ Amistoso (sin torneo)</option>
                      {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {categories.length > 0 && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Categoría</label>
                      <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                        className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">— Sin categoría —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Rival *</label>
                    <input value={form.opponent} onChange={e => set('opponent', e.target.value)}
                      placeholder="Nombre del equipo rival"
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Fecha</label>
                    <input type="date" value={form.match_date} onChange={e => set('match_date', e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Hora (opcional)</label>
                    <input type="time" value={form.match_time} onChange={e => set('match_time', e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Lugar</label>
                    <input value={form.location} onChange={e => set('location', e.target.value)}
                      placeholder="Cancha, estadio, etc."
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Estado</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="scheduled">Programado</option>
                      <option value="in_progress">En juego</option>
                      <option value="finished">Finalizado</option>
                    </select>
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
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          {form.is_home ? 'Marcador rival' : 'Nuestro marcador'}
                        </label>
                        <input type="number" min="0" value={form.away_score}
                          onChange={e => set('away_score', e.target.value)} placeholder="0"
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                      placeholder="Observaciones del partido..."
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                  </div>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal}
                    className="flex-1 h-9 rounded-lg border border-input text-sm hover:bg-accent transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isPending}
                    className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Continuar
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <div className="flex flex-col overflow-hidden flex-1">
                <div className="px-5 pt-4 pb-3 border-b border-border space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Cita a los jugadores. Marca <span className="font-medium">titulares</span> y <span className="font-medium">suplentes</span>. Puedes saltar y completar después.
                  </p>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar atleta..."
                      className="flex-1 h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <span className="text-xs text-muted-foreground">{selectedCount} citados</span>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 px-2 py-2">
                  {loadingAthletes ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando atletas...
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-10">No hay atletas activos.</p>
                  ) : (
                    <ul className="space-y-1">
                      {filtered.map(a => {
                        const sel = selected[a.id]
                        const semColor = a.semaforo === 'red' ? 'bg-red-500' : a.semaforo === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                        return (
                          <li key={a.id} className={`rounded-lg border ${sel ? 'border-primary/50 bg-primary/5' : 'border-transparent'} px-2 py-1.5`}>
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={!!sel}
                                onChange={() => toggleAthlete(a.id, a.jersey_number)} className="w-4 h-4 rounded" />
                              <span className={`w-2 h-2 rounded-full ${semColor}`} />
                              <span className="flex-1 text-sm">{a.name}</span>
                              <span className="text-[11px] text-muted-foreground">{a.category}</span>
                            </div>
                            {sel && (
                              <div className="flex items-center gap-2 pl-6 mt-1.5">
                                <div className="inline-flex rounded-md border border-input overflow-hidden">
                                  <button type="button" onClick={() => updateSelected(a.id, { isStarter: true })}
                                    className={`px-2 py-0.5 text-[11px] ${sel.isStarter ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}>
                                    Titular
                                  </button>
                                  <button type="button" onClick={() => updateSelected(a.id, { isStarter: false })}
                                    className={`px-2 py-0.5 text-[11px] ${!sel.isStarter ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'}`}>
                                    Suplente
                                  </button>
                                </div>
                                <input type="number" min="0" value={sel.number}
                                  onChange={e => updateSelected(a.id, { number: e.target.value })}
                                  placeholder="#"
                                  className="w-12 h-6 px-1.5 rounded border border-input bg-background text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring" />
                                <button type="button" onClick={() => updateSelected(a.id, { isCaptain: !sel.isCaptain })}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] ${sel.isCaptain ? 'bg-amber-500/15 text-amber-600' : 'text-muted-foreground hover:bg-accent'}`}
                                  title="Capitán">
                                  <Star className={`w-3 h-3 ${sel.isCaptain ? 'fill-amber-500' : ''}`} />
                                  Capitán
                                </button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {error && <p className="px-5 pt-2 text-xs text-destructive">{error}</p>}

                <div className="flex gap-3 px-5 py-4 border-t border-border">
                  <button type="button" onClick={() => handleFinish(false)} disabled={isPending}
                    className="flex-1 h-9 rounded-lg border border-input text-sm hover:bg-accent transition-colors disabled:opacity-50">
                    Saltar
                  </button>
                  <button type="button" onClick={() => handleFinish(true)}
                    disabled={isPending || selectedCount === 0}
                    className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2">
                    {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Guardar convocatoria
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
