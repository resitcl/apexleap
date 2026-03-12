'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createSchedule, updateSchedule } from '@/lib/actions/schedules'

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

interface Props {
  scheduleId?: string
  venues?: Array<{
    id: string
    name: string
    address?: string | null
    city?: string | null
  }>
  defaultValues?: {
    name?: string
    description?: string
    day_of_week?: number[]
    start_time?: string
    end_time?: string
    start_date?: string
    end_date?: string | null
    capacity?: number | null
    venue_id?: string | null
    access_rule?: string
    is_active?: boolean
  }
}

export function ScheduleForm({ scheduleId, defaultValues, venues = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name:         defaultValues?.name         ?? '',
    description:  defaultValues?.description  ?? '',
    start_time:   defaultValues?.start_time   ?? '08:00',
    end_time:     defaultValues?.end_time     ?? '09:30',
    start_date:   defaultValues?.start_date   ?? new Date().toISOString().split('T')[0],
    end_date:     defaultValues?.end_date     ?? '',
    capacity:     String(defaultValues?.capacity ?? ''),
    venue_id:     defaultValues?.venue_id     ?? '',
    access_rule:  defaultValues?.access_rule  ?? 'subscription',
    is_active:    defaultValues?.is_active    ?? true,
  })

  const [selectedDays, setSelectedDays] = useState<number[]>(defaultValues?.day_of_week ?? [1, 3, 5])

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre es requerido'); return }
    if (selectedDays.length === 0) { toast.error('Selecciona al menos un día'); return }
    if (!form.start_time || !form.end_time) { toast.error('Hora de inicio y fin requeridas'); return }
    if (form.start_time >= form.end_time) { toast.error('La hora de fin debe ser mayor que la de inicio'); return }

    setLoading(true)
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        day_of_week: selectedDays,
        start_time: form.start_time,
        end_time: form.end_time,
        start_date: form.start_date,
        end_date: form.end_date || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        venue_id: form.venue_id || null,
        access_rule: form.access_rule as 'open' | 'subscription' | 'profile',
        is_active: form.is_active,
      }

      if (scheduleId) {
        await updateSchedule(scheduleId, payload)
        toast.success('Sesión actualizada')
      } else {
        await createSchedule(payload)
        toast.success('Sesión creada correctamente')
      }
      router.push('/dashboard/calendar')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre de la sesión *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Jiu-Jitsu Intermedio"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Descripción opcional..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venue_id">Sede</Label>
            <select
              id="venue_id"
              value={form.venue_id}
              onChange={(e) => setForm((p) => ({ ...p, venue_id: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sin sede asignada</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}{venue.city ? ` · ${venue.city}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Asigna la sede para habilitar geofencing y QR fijo de asistencia en esa ubicación.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Días y Horario</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Días de la semana *</Label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`w-12 h-10 rounded-md text-sm font-medium border transition-colors ${
                    selectedDays.includes(d.value)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-accent'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Inicio *</Label>
              <Input
                id="start_time"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">Fin *</Label>
              <Input
                id="end_time"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Desde *</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Hasta (opcional)</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración de Acceso</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="access_rule">Tipo de acceso</Label>
            <select
              id="access_rule"
              value={form.access_rule}
              onChange={(e) => setForm((p) => ({ ...p, access_rule: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="subscription">Requiere suscripción activa</option>
              <option value="open">Abierta (sin requisitos)</option>
              <option value="profile">Requiere perfil completo</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Cupo máximo</Label>
            <Input
              id="capacity"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
              placeholder="Sin límite"
              min="1"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="w-4 h-4 rounded border-input"
            />
            <Label htmlFor="is_active" className="cursor-pointer">Sesión activa</Label>
          </div>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : scheduleId ? 'Actualizar Sesión' : 'Crear Sesión'}
        </Button>
      </div>
    </form>
  )
}
