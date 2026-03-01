'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createVenue } from '@/lib/actions/venues'
import { Plus } from 'lucide-react'

export function NewVenueForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', address: '', city: '',
    lat: '', lng: '',
    geofence_radius: '100',
    capacity: '',
    is_home_venue: false,
  })

  function set(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      await createVenue({
        name: form.name,
        address: form.address || null,
        city: form.city || null,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null,
        geofence_radius: Number(form.geofence_radius) || 100,
        capacity: form.capacity ? Number(form.capacity) : null,
        is_home_venue: form.is_home_venue,
        is_active: true,
      })
      toast.success('Sede creada')
      setOpen(false)
      setForm({ name: '', address: '', city: '', lat: '', lng: '', geofence_radius: '100', capacity: '', is_home_venue: false })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Nueva Sede</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Sede</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Dojo Central, Cancha Norte..." />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Av. Providencia 1234" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Santiago" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Aforo máximo</Label>
              <Input id="capacity" type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="30" />
            </div>
          </div>

          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Geofencing QR Check-in</p>
            <p className="text-xs text-muted-foreground">Coordenadas GPS para validar presencia física en el check-in</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lat" className="text-xs">Latitud</Label>
                <Input id="lat" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="-33.4372" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lng" className="text-xs">Longitud</Label>
                <Input id="lng" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="-70.6506" className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="radius" className="text-xs">Radio (m)</Label>
                <Input id="radius" type="number" min="10" max="5000" value={form.geofence_radius}
                  onChange={(e) => set('geofence_radius', e.target.value)} className="text-xs" />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_home_venue} onChange={(e) => set('is_home_venue', e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">Sede principal</p>
              <p className="text-xs text-muted-foreground">Marcar como sede de local / sede principal del club</p>
            </div>
          </label>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Sede'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
