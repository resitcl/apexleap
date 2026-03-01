'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { updateClubSettings } from '@/lib/actions/settings'

const SPORT_TYPES = [
  'Jiu-Jitsu', 'Muay Thai', 'Boxeo', 'MMA', 'Karate', 'Taekwondo',
  'Judo', 'Lucha', 'Kickboxing', 'Fútbol', 'Básquetbol', 'Vóley',
  'Natación', 'Tenis', 'Atletismo', 'Yoga', 'Crossfit', 'Otro',
]

const TIMEZONES = [
  'America/Santiago', 'America/Buenos_Aires', 'America/Lima',
  'America/Bogota', 'America/Mexico_City', 'America/New_York',
]

interface Props {
  defaultValues?: {
    name?: string
    slug?: string
    description?: string
    sport_type?: string
    logo_url?: string
    primary_color?: string
    country?: string
    city?: string
    address?: string
    phone?: string
    email?: string
    website?: string
    timezone?: string
  }
}

export function ClubSettingsForm({ defaultValues }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:          defaultValues?.name          ?? '',
    slug:          defaultValues?.slug          ?? '',
    description:   defaultValues?.description   ?? '',
    sport_type:    defaultValues?.sport_type    ?? '',
    logo_url:      defaultValues?.logo_url      ?? '',
    primary_color: defaultValues?.primary_color ?? '#6366f1',
    country:       defaultValues?.country       ?? 'Chile',
    city:          defaultValues?.city          ?? '',
    address:       defaultValues?.address       ?? '',
    phone:         defaultValues?.phone         ?? '',
    email:         defaultValues?.email         ?? '',
    website:       defaultValues?.website       ?? '',
    timezone:      defaultValues?.timezone      ?? 'America/Santiago',
  })

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre del club es requerido'); return }
    setLoading(true)
    try {
      await updateClubSettings({
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        sport_type: form.sport_type || undefined,
        logo_url: form.logo_url || undefined,
        primary_color: form.primary_color || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        timezone: form.timezone,
      })
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidad del Club</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej: Dojo Samurai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Identificador URL</Label>
              <Input id="slug" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="dojo-samurai" />
              <p className="text-xs text-muted-foreground">Solo letras, números y guiones</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Breve descripción del club..."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sport_type">Deporte / Disciplina</Label>
              <select
                id="sport_type"
                value={form.sport_type}
                onChange={(e) => set('sport_type', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccionar...</option>
                {SPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="primary_color">Color primario</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="primary_color"
                  value={form.primary_color}
                  onChange={(e) => set('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-md border border-input cursor-pointer p-1"
                />
                <Input value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)} className="flex-1 font-mono" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="country">País</Label>
            <Input id="country" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Chile" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">Ciudad</Label>
            <Input id="city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Santiago" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Av. Principal 123, Local 4" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+56 9 1234 5678" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="club@ejemplo.cl" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="website">Sitio web</Label>
            <Input id="website" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://www.miclub.cl" />
          </div>
        </CardContent>
      </Card>

      {/* Regional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="timezone">Zona horaria</Label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => set('timezone', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </form>
  )
}
