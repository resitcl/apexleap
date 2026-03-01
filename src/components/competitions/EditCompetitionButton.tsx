'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Pencil } from "lucide-react"
import { updateCompetition } from "@/lib/actions/competitions"

const TYPES = [
  { value: 'tournament',   label: 'Torneo' },
  { value: 'league',       label: 'Liga' },
  { value: 'friendly',     label: 'Amistoso' },
  { value: 'championship', label: 'Campeonato' },
]
const STATUSES = [
  { value: 'upcoming',  label: 'Próximo' },
  { value: 'active',    label: 'En curso' },
  { value: 'finished',  label: 'Finalizado' },
  { value: 'cancelled', label: 'Cancelado' },
]

interface Props {
  competition: {
    id: string
    name: string
    type: string
    status: string
    sport: string | null
    location: string | null
    start_date: string
    end_date: string | null
    description: string | null
    notes: string | null
  }
}

export function EditCompetitionButton({ competition }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:        competition.name,
    type:        competition.type,
    status:      competition.status,
    sport:       competition.sport ?? '',
    location:    competition.location ?? '',
    start_date:  competition.start_date,
    end_date:    competition.end_date ?? '',
    description: competition.description ?? '',
    notes:       competition.notes ?? '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!form.start_date)  { toast.error('La fecha de inicio es obligatoria'); return }
    setLoading(true)
    try {
      await updateCompetition(competition.id, {
        name:        form.name.trim(),
        type:        form.type as 'tournament' | 'league' | 'friendly' | 'championship',
        status:      form.status as 'upcoming' | 'active' | 'finished' | 'cancelled',
        sport:       form.sport || null,
        location:    form.location || null,
        start_date:  form.start_date,
        end_date:    form.end_date || null,
        description: form.description || null,
        notes:       form.notes || null,
      })
      toast.success('Competencia actualizada')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Pencil className="w-3.5 h-3.5" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar competencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Deporte</Label>
                <input value={form.sport} onChange={(e) => set('sport', e.target.value)} placeholder="Opcional"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <Label>Lugar</Label>
                <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Ciudad, país..."
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha inicio</Label>
                <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <Label>Fecha fin</Label>
                <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
                placeholder="Opcional"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="space-y-1">
              <Label>Notas internas</Label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
                placeholder="Opcional"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
