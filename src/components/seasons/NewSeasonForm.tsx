'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createSeason } from '@/lib/actions/seasons'
import { Loader2, Plus } from 'lucide-react'

const SEASON_TYPES = [
  { value: 'apertura',     label: 'Apertura (1er semestre)' },
  { value: 'clausura',     label: 'Clausura (2do semestre)' },
  { value: 'pretemporada', label: 'Pre-temporada (verano)' },
  { value: 'other',        label: 'Otra' },
]

const currentYear = new Date().getFullYear()

export function NewSeasonForm() {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    type:        'clausura',
    year:        currentYear,
    name:        '',
    start_date:  '',
    end_date:    '',
    description: '',
  })

  function set(field: string, value: string | number) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-generate name when type/year change
      if (field === 'type' || field === 'year') {
        const typeLabel = SEASON_TYPES.find((t) => t.value === (field === 'type' ? value : next.type))?.label.split(' ')[0] ?? ''
        next.name = `${typeLabel} ${field === 'year' ? value : next.year}`
      }
      // Auto-fill dates when type/year change
      const t = field === 'type' ? String(value) : next.type
      const y = field === 'year' ? Number(value) : next.year
      if (field === 'type' || field === 'year') {
        if (t === 'apertura')     { next.start_date = `${y}-02-01`; next.end_date = `${y}-07-31` }
        if (t === 'clausura')     { next.start_date = `${y}-08-01`; next.end_date = `${y}-12-15` }
        if (t === 'pretemporada') { next.start_date = `${y}-01-05`; next.end_date = `${y}-01-31` }
      }
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    start(async () => {
      try {
        await createSeason({
          name:        form.name,
          type:        form.type as 'apertura' | 'clausura' | 'pretemporada' | 'other',
          year:        Number(form.year),
          start_date:  form.start_date,
          end_date:    form.end_date,
          description: form.description || null,
        })
        router.refresh()
        setForm({ type: 'clausura', year: currentYear, name: '', start_date: '', end_date: '', description: '' })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al crear temporada')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SEASON_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Año</label>
          <input
            type="number"
            value={form.year}
            min={2020} max={2035}
            onChange={(e) => set('year', e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Nombre</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ej: Apertura 2025"
          required
          className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Fecha inicio</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            required
            className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Fecha fin</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
            required
            className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Descripción (opcional)</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Ej: Temporada regular de la liga regional"
          className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Crear Temporada
      </button>
    </form>
  )
}
