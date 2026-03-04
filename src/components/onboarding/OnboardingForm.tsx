'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { createClubForUser, joinClubBySlug } from '@/lib/actions/onboarding'
import { ArrowRight, Loader2, Building2, LogIn } from 'lucide-react'

const SPORT_TYPES = [
  'Jiu-Jitsu', 'Muay Thai', 'Boxeo', 'MMA', 'Karate', 'Taekwondo',
  'Judo', 'Kickboxing', 'Fútbol', 'Básquetbol', 'Vóley',
  'Natación', 'Tenis', 'Yoga', 'Crossfit', 'Otro',
]

export function OnboardingForm() {
  const [tab, setTab]       = useState<'create' | 'join'>('create')
  const [loading, setLoading] = useState(false)

  // ── Create club form ─────────────────────────────────────────
  const [form, setForm] = useState({
    name: '', slug: '', sport_type: '', country: 'Chile', city: '', timezone: 'America/Santiago',
  })

  function handleNameChange(value: string) {
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)
    setForm((p) => ({ ...p, name: value, slug }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre del club es requerido'); return }
    if (!form.slug.trim()) { toast.error('El identificador URL es requerido'); return }
    setLoading(true)
    try {
      await createClubForUser({
        name: form.name, slug: form.slug,
        sport_type: form.sport_type || undefined,
        country: form.country, city: form.city || undefined, timezone: form.timezone,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el club')
      setLoading(false)
    }
  }

  // ── Join club form ────────────────────────────────────────────
  const [joinSlug, setJoinSlug] = useState('')
  const [joinRole, setJoinRole] = useState<'admin' | 'coach' | 'athlete'>('admin')

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinSlug.trim()) { toast.error('Escribe el identificador del club'); return }
    setLoading(true)
    try {
      await joinClubBySlug(joinSlug.trim().toLowerCase(), joinRole)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al unirse al club')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted">
        <button
          type="button"
          onClick={() => setTab('create')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'create' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Crear mi club
        </button>
        <button
          type="button"
          onClick={() => setTab('join')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'join' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Unirme a un club
        </button>
      </div>

      {/* ── CREATE ── */}
      {tab === 'create' && (
        <form onSubmit={handleCreate} className="space-y-6">
          <Card>
            <CardContent className="pt-6 grid gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre del club *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ej: Dojo Samurai, Club Atlético Norte..."
                  className="text-lg h-12"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">
                  Identificador URL
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    apexleap.app/<strong>{form.slug || 'mi-club'}</strong>
                  </span>
                </Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="mi-club"
                />
                <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sport_type">Disciplina</Label>
                  <select
                    id="sport_type"
                    value={form.sport_type}
                    onChange={(e) => setForm((p) => ({ ...p, sport_type: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Seleccionar...</option>
                    {SPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Santiago" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">¿Qué se crea automáticamente?</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>Tu cuenta de administrador vinculada al club</li>
              <li>4 reglas de bloqueo predefinidas (mora, lesión, asistencia)</li>
              <li>Acceso a todos los módulos del sistema</li>
            </ul>
          </div>
          <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Creando tu club...</> : <>Crear Club y Comenzar<ArrowRight className="w-5 h-5" /></>}
          </Button>
        </form>
      )}

      {/* ── JOIN ── */}
      {tab === 'join' && (
        <form onSubmit={handleJoin} className="space-y-6">
          <Card>
            <CardContent className="pt-6 grid gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="join-slug">Identificador del club *</Label>
                <Input
                  id="join-slug"
                  value={joinSlug}
                  onChange={(e) => setJoinSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="Ej: dojo-samurai"
                  className="text-lg h-12"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  El administrador del club debe enviarte este identificador.
                  Ej: apexleap.app/<strong>{joinSlug || 'dojo-samurai'}</strong>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Tu rol en el club</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'admin',   label: 'Administrador', desc: 'Acceso total' },
                    { value: 'coach',   label: 'Entrenador',    desc: 'Nóminas, asistencia' },
                    { value: 'athlete', label: 'Atleta',        desc: 'Portal personal' },
                  ] as const).map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setJoinRole(r.value)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        joinRole === r.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-border/80'
                      }`}
                    >
                      <p className="text-xs font-semibold">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium">¿Cómo obtengo el identificador?</p>
            <p className="mt-1 text-blue-700/80 dark:text-blue-400/80">
              Pídele al Super Admin o al administrador del club que te envíe el <strong>slug</strong> del club.
              Lo encontrarán en <span className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 px-1 rounded">Super Admin → Clubs → detalle del club</span>.
            </p>
          </div>
          <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Uniéndose...</> : <>Unirme al Club<ArrowRight className="w-5 h-5" /></>}
          </Button>
        </form>
      )}
    </div>
  )
}
