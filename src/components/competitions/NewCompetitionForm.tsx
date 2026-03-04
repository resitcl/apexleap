'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createCompetition } from '@/lib/actions/competitions'
import { getCategories } from '@/lib/actions/categories'
import { Plus } from 'lucide-react'

type CategoryOption = { id: string; name: string }
type SeasonOption  = { id: string; name: string; type: string; year: number; is_active: boolean }

const TYPES = [
  { value: 'tournament',    label: 'Torneo' },
  { value: 'league',        label: 'Liga' },
  { value: 'friendly',      label: 'Amistoso' },
  { value: 'championship',  label: 'Campeonato' },
]

interface Props {
  seasons?: SeasonOption[]
  activeSeasonId?: string | null
}

export function NewCompetitionForm({ seasons = [], activeSeasonId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [form, setForm] = useState({
    name: '', type: 'tournament', sport: '',
    location: '', start_date: '', end_date: '',
    description: '', notes: '', category_id: '', season_id: '',
  })

  useEffect(() => {
    if (!open) return
    getCategories(true).then((data) => setCategories(data.map((c) => ({ id: c.id, name: c.name })))).catch(() => {})
    // Pre-select active season
    if (activeSeasonId) setForm((p) => ({ ...p, season_id: activeSeasonId }))
  }, [open, activeSeasonId])

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name)       { toast.error('El nombre es requerido'); return }
    if (!form.start_date) { toast.error('La fecha de inicio es requerida'); return }
    setLoading(true)
    try {
      await createCompetition({
        name: form.name,
        type: form.type as 'tournament' | 'league' | 'friendly' | 'championship',
        sport: form.sport || null,
        location: form.location || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        description: form.description || null,
        notes: form.notes || null,
        status: 'upcoming',
        category_id: form.category_id || null,
        season_id:   form.season_id   || null,
      })
      toast.success('Competencia creada')
      setOpen(false)
      setForm({ name: '', type: 'tournament', sport: '', location: '', start_date: '', end_date: '', description: '', notes: '', category_id: '', season_id: activeSeasonId ?? '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Nueva Competencia</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Competencia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Copa Regional 2026..." />
          </div>

          {seasons.length > 0 && (
            <div className="space-y-1.5">
              <Label>Temporada</Label>
              <select value={form.season_id} onChange={(e) => set('season_id', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Sin temporada —</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.is_active ? ' ★' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Todas las categorías —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sport">Deporte</Label>
              <Input id="sport" value={form.sport} onChange={(e) => set('sport', e.target.value)} placeholder="BJJ, Fútbol..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Ubicación</Label>
            <Input id="location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Coliseo Municipal..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Inicio *</Label>
              <Input id="start_date" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fin</Label>
              <Input id="end_date" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)}
              rows={2} placeholder="Detalles del evento..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
