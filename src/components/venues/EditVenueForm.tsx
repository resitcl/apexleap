'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateVenue } from '@/lib/actions/venues'
import { Pencil } from 'lucide-react'

interface Props {
  venue: {
    id: string
    name: string
    address: string | null
    city: string | null
    lat: number | null
    lng: number | null
    geofence_radius: number
    capacity: number | null
    is_home_venue: boolean
    opening_time: string | null
    closing_time: string | null
  }
}

export function EditVenueForm({ venue }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:             venue.name,
    address:          venue.address          ?? '',
    city:             venue.city             ?? '',
    lat:              venue.lat              != null ? String(venue.lat)              : '',
    lng:              venue.lng              != null ? String(venue.lng)              : '',
    geofence_radius:  String(venue.geofence_radius ?? 100),
    capacity:         venue.capacity         != null ? String(venue.capacity)         : '',
    is_home_venue:    venue.is_home_venue,
    opening_time:     venue.opening_time     ?? '',
    closing_time:     venue.closing_time     ?? '',
  })

  function set(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      await updateVenue(venue.id, {
        name:            form.name,
        address:         form.address       || null,
        city:            form.city          || null,
        lat:             form.lat           ? Number(form.lat)    : null,
        lng:             form.lng           ? Number(form.lng)    : null,
        geofence_radius: Number(form.geofence_radius) || 100,
        capacity:        form.capacity      ? Number(form.capacity) : null,
        is_home_venue:   form.is_home_venue,
        opening_time:    form.opening_time  || null,
        closing_time:    form.closing_time  || null,
      })
      toast.success('Sede actualizada')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Sede</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="e-name">Nombre *</Label>
              <Input id="e-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="e-address">Dirección</Label>
              <Input id="e-address" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-city">Ciudad</Label>
              <Input id="e-city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-capacity">Aforo</Label>
              <Input id="e-capacity" type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-open">Apertura</Label>
              <Input id="e-open" type="time" value={form.opening_time} onChange={(e) => set('opening_time', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-close">Cierre</Label>
              <Input id="e-close" type="time" value={form.closing_time} onChange={(e) => set('closing_time', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Geofencing</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-lat" className="text-xs">Latitud</Label>
                <Input id="e-lat" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="-33.4372" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-lng" className="text-xs">Longitud</Label>
                <Input id="e-lng" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="-70.6506" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-radius" className="text-xs">Radio (m)</Label>
                <Input id="e-radius" type="number" min="10" value={form.geofence_radius} onChange={(e) => set('geofence_radius', e.target.value)} className="text-xs" />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_home_venue} onChange={(e) => set('is_home_venue', e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">Sede principal</p>
              <p className="text-xs text-muted-foreground">Sede de local / sede principal del club</p>
            </div>
          </label>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
