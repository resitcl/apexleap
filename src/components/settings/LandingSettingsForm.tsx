'use client'

import { useState, useTransition } from 'react'
import { updateLandingSettings, type LandingInput } from '@/lib/actions/landing'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ExternalLink, Globe, Users, FlaskConical, Save, Eye, Film, Trophy, CalendarDays, BarChart3, BarChart2 } from 'lucide-react'

interface Props {
  slug: string
  initial: LandingInput & { landing_enabled: boolean }
}

export function LandingSettingsForm({ slug, initial }: Props) {
  const [isPending, start] = useTransition()
  const [form, setForm] = useState<LandingInput>({
    landing_enabled:           initial.landing_enabled,
    landing_headline:          initial.landing_headline ?? '',
    landing_description:       initial.landing_description ?? '',
    landing_cta_label:         initial.landing_cta_label ?? 'Iniciar sesión',
    landing_show_team:         initial.landing_show_team ?? true,
    landing_show_athletes:     initial.landing_show_athletes ?? false,
    landing_show_about:        initial.landing_show_about ?? true,
    landing_show_media:        initial.landing_show_media ?? false,
    landing_show_results:      initial.landing_show_results ?? false,
    landing_show_schedule:     initial.landing_show_schedule ?? false,
    landing_show_stats:        initial.landing_show_stats ?? false,
    landing_trial_enabled:     initial.landing_trial_enabled ?? false,
    landing_trial_description: initial.landing_trial_description ?? '',
    landing_trial_contact:     initial.landing_trial_contact ?? '',
    analytics_ga4_id:          initial.analytics_ga4_id ?? '',
  })

  function set(key: keyof LandingInput, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handleSave() {
    start(async () => {
      const result = await updateLandingSettings(form)
      if (!result.ok) toast.error(result.error)
      else toast.success('Landing page actualizada')
    })
  }

  const publicUrl = `/club/${slug}`

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Status + preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" /> Estado del landing
          </CardTitle>
          <CardDescription>
            Cuando está activo, tu página pública es accesible en{' '}
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5 font-medium">
              /club/{slug} <ExternalLink className="w-3 h-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="landing-enabled" className="text-sm font-medium">
              {form.landing_enabled ? '✅ Landing activo' : '⏸ Landing desactivado'}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {form.landing_enabled
                ? 'Cualquier persona puede ver esta página'
                : 'La página no es visible para el público'}
            </p>
          </div>
          <Switch
            id="landing-enabled"
            checked={form.landing_enabled}
            onCheckedChange={(v: boolean) => set('landing_enabled', v)}
          />
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contenido principal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Título principal (headline)">
            <input
              type="text"
              value={form.landing_headline ?? ''}
              onChange={e => set('landing_headline', e.target.value)}
              placeholder={`Bienvenido a tu academia`}
              maxLength={120}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si lo dejas vacío se usará «Bienvenido a [nombre del club]»
            </p>
          </Field>

          <Field label="Descripción del landing">
            <textarea
              value={form.landing_description ?? ''}
              onChange={e => set('landing_description', e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Explica brevemente qué hace especial a tu club..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Si está vacío se usa la descripción general del club (configuración → general)
            </p>
          </Field>

          <Field label="Texto del botón de acceso">
            <input
              type="text"
              value={form.landing_cta_label ?? ''}
              onChange={e => set('landing_cta_label', e.target.value)}
              placeholder="Iniciar sesión"
              maxLength={40}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Team section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> Sección de entrenadores
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="show-team" className="text-sm font-medium">
              Mostrar equipo de entrenadores
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Muestra los perfiles de los coaches activos del club
            </p>
          </div>
          <Switch
            id="show-team"
            checked={form.landing_show_team}
            onCheckedChange={(v: boolean) => set('landing_show_team', v)}
          />
        </CardContent>
      </Card>

      {/* Dynamic sections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4" /> Secciones dinámicas
          </CardTitle>
          <CardDescription>
            Activa qué información del club se muestra en la landing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: 'landing_show_about',    id: 'show-about',    icon: BarChart2,   label: 'Sobre el club',         hint: 'Nombre, deporte, descripción y categorías' },
            { key: 'landing_show_athletes', id: 'show-athletes', icon: Users,       label: 'Nuestros atletas',      hint: 'Muestra los jugadores/alumnos activos con foto' },
            { key: 'landing_show_stats',    id: 'show-stats',    icon: BarChart3,   label: 'Estadísticas del club', hint: 'Atletas activos, partidos jugados, victorias' },
            { key: 'landing_show_results',  id: 'show-results',  icon: Trophy,      label: 'Últimos resultados',    hint: 'Los 5 partidos más recientes con marcador' },
            { key: 'landing_show_schedule', id: 'show-schedule', icon: CalendarDays,label: 'Próximos partidos',     hint: 'Calendario de los próximos encuentros' },
            { key: 'landing_show_media',    id: 'show-media',    icon: Film,        label: 'Galería / Media Hub',   hint: 'Muestra contenido marcado como "Publicar en landing"' },
          ] as Array<{ key: keyof LandingInput; id: string; icon: React.ElementType; label: string; hint: string }>).map(({ key, id, icon: Icon, label, hint }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
                </div>
              </div>
              <Switch
                id={id}
                checked={!!form[key]}
                onCheckedChange={(v: boolean) => set(key, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trial class */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> Clase de prueba
          </CardTitle>
          <CardDescription>
            Permite que personas interesadas soliciten una clase de prueba directamente desde la landing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="trial-enabled" className="text-sm font-medium">
                Activar solicitud de clase de prueba
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Muestra un formulario de contacto en la landing
              </p>
            </div>
            <Switch
              id="trial-enabled"
              checked={form.landing_trial_enabled}
              onCheckedChange={(v: boolean) => set('landing_trial_enabled', v)}
            />
          </div>

          {form.landing_trial_enabled && (
            <>
              <Field label="Descripción de la clase de prueba">
                <textarea
                  value={form.landing_trial_description ?? ''}
                  onChange={e => set('landing_trial_description', e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="¡Ven a conocernos sin compromiso! Primera clase gratuita..."
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </Field>

              <Field label="Contacto alternativo (opcional)">
                <input
                  type="text"
                  value={form.landing_trial_contact ?? ''}
                  onChange={e => set('landing_trial_contact', e.target.value)}
                  placeholder="+56 9 1234 5678 / info@miclub.cl"
                  maxLength={200}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se muestra bajo el formulario como alternativa de contacto directo
                </p>
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Google Analytics
          </CardTitle>
          <CardDescription>
            Conecta Google Analytics 4 para ver el tráfico de tu landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field label="Measurement ID (GA4)">
            <input
              type="text"
              value={form.analytics_ga4_id ?? ''}
              onChange={e => set('analytics_ga4_id', e.target.value)}
              placeholder="G-XXXXXXXXXX"
              maxLength={30}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Encuéntralo en Google Analytics → Admin → Data Streams → tu stream → Measurement ID
            </p>
          </Field>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending} className="gap-2">
          {isPending ? null : <Save className="w-4 h-4" />}
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        {form.landing_enabled && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye className="w-4 h-4" /> Ver landing
          </a>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      {children}
    </div>
  )
}
