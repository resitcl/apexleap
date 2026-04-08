'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { updateClubSettings, uploadClubLogo } from '@/lib/actions/settings'
import { useBrandPrimaryFromClubSettings } from '@/lib/club-branding'
import { CLUB_LOGO_MAX_BYTES } from '@/lib/constants'
import { Upload } from 'lucide-react'

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
    /** Preferencia de marca en UI: se lee de `settings` si existe */
    settings?: unknown
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
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:          defaultValues?.name          ?? '',
    slug:          defaultValues?.slug          ?? '',
    description:   defaultValues?.description   ?? '',
    sport_type:    defaultValues?.sport_type    ?? '',
    logo_url:      defaultValues?.logo_url      ?? '',
    primary_color: defaultValues?.primary_color ?? '#34d399',
    use_brand_primary_for_ui: useBrandPrimaryFromClubSettings(defaultValues?.settings),
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

  async function handleLogoFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen')
      return
    }
    if (file.size > CLUB_LOGO_MAX_BYTES) {
      toast.error(`La imagen no puede superar ${CLUB_LOGO_MAX_BYTES / (1024 * 1024)} MB`)
      return
    }
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const url = await uploadClubLogo(fd)
      setForm((p) => ({ ...p, logo_url: url }))
      toast.success('Logo subido correctamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir el logo')
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
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
        use_brand_primary_for_ui: form.use_brand_primary_for_ui,
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
        <CardContent className="grid gap-6">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 space-y-4">
            <div>
              <p className="text-sm font-semibold">Marca del club</p>
              <p className="text-xs text-muted-foreground mt-1">
                Logo y color en el panel, portal del atleta, acceso <span className="font-mono">/[slug]/signin</span> y landing. El interruptor solo afecta botones destacados, anillos de foco y el estilo activo del menú (verde ApexLeap vs tu color).
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-3">
                <Label>Logo</Label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center shrink-0">
                    {form.logo_url ? (
                      <Image
                        src={form.logo_url}
                        alt="Logo del club"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground text-center px-1">Sin logo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => handleLogoFile(e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit gap-2"
                      disabled={logoUploading}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      {logoUploading ? 'Subiendo…' : 'Subir imagen'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG o WebP · máx. {CLUB_LOGO_MAX_BYTES / (1024 * 1024)} MB · cuadrada recomendada.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="logo_url">URL del logo (opcional)</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    value={form.logo_url}
                    onChange={(e) => set('logo_url', e.target.value)}
                    placeholder="https://… si ya está alojado fuera de ApexLeap"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="space-y-1.5 flex-1">
                    <Label htmlFor="primary_color">Color primario</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        id="primary_color"
                        value={form.primary_color}
                        onChange={(e) => set('primary_color', e.target.value)}
                        className="w-10 h-10 rounded-md border border-input cursor-pointer p-1 shrink-0"
                      />
                      <Input value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)} className="flex-1 font-mono" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/80 px-3 py-3 flex flex-row items-center justify-between gap-4 sm:min-w-[280px]">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold leading-tight">Color en la interfaz</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Actívalo para usar este color (y su degradado en el menú) en lugar del verde estándar.
                      </p>
                    </div>
                    <Switch
                      checked={form.use_brand_primary_for_ui}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, use_brand_primary_for_ui: v }))}
                      aria-label="Usar color de marca en botones y menú"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

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
