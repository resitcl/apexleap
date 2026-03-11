'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarPlus } from 'lucide-react'
import { createEvent } from '@/lib/actions/events'

const EVENT_TYPES = [
  { value: 'tournament', label: 'Torneo / Campeonato' },
  { value: 'seminar', label: 'Seminario' },
  { value: 'workshop', label: 'Taller / Workshop' },
  { value: 'meeting', label: 'Reunión de Equipo' },
  { value: 'graduation', label: 'Graduación / Examen' },
  { value: 'open_mat', label: 'Open Mat / Entrenamiento Libre' },
  { value: 'friendly', label: 'Encuentro Amistoso' },
  { value: 'exhibition', label: 'Exhibición' },
  { value: 'other', label: 'Otro' },
]

export function NewEventDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    event_type: 'tournament',
    event_date: new Date().toISOString().split('T')[0],
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
    is_visible_to_athletes: true,
  })

  function handleChange(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.event_date) {
      toast.error('Nombre y fecha son requeridos')
      return
    }
    setLoading(true)
    try {
      await createEvent({
        name: form.name,
        description: form.description || null,
        event_type: form.event_type,
        event_date: form.event_date,
        end_date: form.end_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location || null,
        is_visible_to_athletes: form.is_visible_to_athletes,
      })
      toast.success('Evento creado correctamente')
      setOpen(false)
      setForm({
        name: '', description: '', event_type: 'tournament',
        event_date: new Date().toISOString().split('T')[0],
        end_date: '', start_time: '', end_time: '', location: '',
        is_visible_to_athletes: true,
      })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <CalendarPlus className="w-4 h-4" />
        Nuevo Evento
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Nuevo Evento</h2>
                    <p className="text-sm text-muted-foreground">
                      Torneos, seminarios, reuniones y más. Visible para tus alumnos.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-name">Nombre del Evento *</Label>
                    <Input
                      id="ev-name"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Ej: Torneo Nacional IBJJF 2026"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-type">Tipo de Evento *</Label>
                    <select
                      id="ev-type"
                      value={form.event_type}
                      onChange={(e) => handleChange('event_type', e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ev-date">Fecha de Inicio *</Label>
                      <Input
                        id="ev-date"
                        type="date"
                        value={form.event_date}
                        onChange={(e) => handleChange('event_date', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ev-end-date">Fecha de Término</Label>
                      <Input
                        id="ev-end-date"
                        type="date"
                        value={form.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Opcional, si dura más de un día</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="ev-start-time">Hora Inicio</Label>
                      <Input
                        id="ev-start-time"
                        type="time"
                        value={form.start_time}
                        onChange={(e) => handleChange('start_time', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ev-end-time">Hora Término</Label>
                      <Input
                        id="ev-end-time"
                        type="time"
                        value={form.end_time}
                        onChange={(e) => handleChange('end_time', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-location">Ubicación</Label>
                    <Input
                      id="ev-location"
                      value={form.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="Ej: Polideportivo Municipal, Santiago"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ev-desc">Descripción</Label>
                    <textarea
                      id="ev-desc"
                      value={form.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      placeholder="Detalles adicionales sobre el evento..."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="ev-visible"
                      type="checkbox"
                      checked={form.is_visible_to_athletes}
                      onChange={(e) => handleChange('is_visible_to_athletes', e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="ev-visible" className="text-sm font-normal">
                      Visible para alumnos desde su portal
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 pt-0">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Evento'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}
