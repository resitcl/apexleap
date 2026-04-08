'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createAthlete, updateAthlete } from '@/lib/actions/athletes'
import type { AthleteInput } from '@/lib/actions/athletes'
import {
  cleanTournamentHistoryEntries,
  getSportConfig,
  isMartialArtsAcademySport,
  parseTournamentHistory,
  type TournamentHistoryEntry,
} from '@/lib/sport-fields'
import { MartialArtsTournamentHistory } from '@/components/athletes/MartialArtsTournamentHistory'
import { SportSpecificFields } from '@/components/athletes/SportSpecificFields'

type CategoryOption = { id: string; name: string; color?: string | null }
type TechnicalMeta = Record<string, unknown>

const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  document_number: z.string().optional(),
  birth_date: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  notes: z.string().optional(),
  health_status: z.enum(['healthy', 'injured', 'observation']),
  status: z.enum(['active', 'inactive', 'suspended']),
  jersey_number: z.number().int().min(1).max(999).nullable().optional(),
  category: z.string().min(1).default('General'),
  category_id: z.string().uuid().nullable().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  athleteId?: string
  defaultValues?: Partial<FormValues & { jersey_number?: number | null; category?: string; category_id?: string | null }>
  categories?: CategoryOption[]
  sportType?: string | null
  defaultTechnicalMeta?: TechnicalMeta
}

export function AthleteForm({ athleteId, defaultValues, categories = [], sportType, defaultTechnicalMeta }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = !!athleteId
  const sportConfig = getSportConfig(sportType)
  const showMartialArtsTournaments = isMartialArtsAcademySport(sportType ?? undefined)
  const [technicalMeta, setTechnicalMeta] = useState<TechnicalMeta>(() => {
    const m = { ...(defaultTechnicalMeta ?? {}) }
    if (showMartialArtsTournaments) delete m.tournament_history
    return m
  })
  const [tournamentEntries, setTournamentEntries] = useState<TournamentHistoryEntry[]>(() =>
    showMartialArtsTournaments ? parseTournamentHistory(defaultTechnicalMeta ?? {}) : []
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      document_number: '',
      birth_date: '',
      emergency_contact: '',
      emergency_phone: '',
      notes: '',
      health_status: 'healthy',
      status: 'active',
      jersey_number: null,
      category: 'General',
      category_id: null,
      ...defaultValues,
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const cleanMeta: TechnicalMeta = {}
      for (const [k, v] of Object.entries(technicalMeta)) {
        if (k === 'tournament_history') continue
        if (v !== null && v !== undefined && v !== '') cleanMeta[k] = v
      }

      if (showMartialArtsTournaments) {
        const tournamentsClean = cleanTournamentHistoryEntries(tournamentEntries)
        if (tournamentsClean) cleanMeta.tournament_history = tournamentsClean
        delete cleanMeta.competition_record
        delete cleanMeta.fights
      }

      const input: AthleteInput = {
        ...values,
        jersey_number: sportConfig?.hideJerseyNumber ? null : (values.jersey_number ?? null),
        category: values.category || 'General',
        category_id: values.category_id ?? null,
        technical_meta: cleanMeta,
        performance_meta: {},
      }

      if (isEditing) {
        await updateAthlete(athleteId, input)
        toast.success('Alumno actualizado correctamente')
        router.push(`/dashboard/athletes/${athleteId}`)
      } else {
        const athlete = await createAthlete(input)
        toast.success('Alumno creado correctamente')
        router.push(`/dashboard/athletes/${athlete.id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form id="athlete-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Datos Personales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos Personales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Nombre completo *</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" {...form.register('phone')} placeholder="+56 9 1234 5678" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="document_number">RUT / Documento</Label>
            <Input id="document_number" {...form.register('document_number')} placeholder="12.345.678-9" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
            <Input id="birth_date" type="date" {...form.register('birth_date')} />
          </div>
        </CardContent>
      </Card>

      {/* Deportivo / Disciplina */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{sportConfig?.sectionTitle ?? 'Deportivo'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoría</Label>
              <select
                  id="category"
                  value={form.watch('category_id') ?? ''}
                  onChange={(e) => {
                    const selected = categories.find((c) => c.id === e.target.value)
                    form.setValue('category_id', selected?.id ?? null)
                    form.setValue('category', selected?.name ?? 'General')
                  }}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {categories.length > 0 ? (
                    <>
                      <option value="">Sin categoría</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </>
                  ) : (
                    <option value="">General (sin categorías definidas)</option>
                  )}
                </select>
            </div>

            {!sportConfig?.hideJerseyNumber && (
              <div className="space-y-1.5">
                <Label htmlFor="jersey_number">N° de camiseta</Label>
                <input
                  id="jersey_number"
                  type="number" min="1" max="999"
                  placeholder="Ej: 10"
                  value={form.watch('jersey_number') ?? ''}
                  onChange={(e) => form.setValue('jersey_number', e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {form.formState.errors.jersey_number && (
                  <p className="text-sm text-destructive">{form.formState.errors.jersey_number.message}</p>
                )}
                <p className="text-xs text-muted-foreground">El número de camiseta no puede repetirse dentro de la misma categoría</p>
              </div>
            )}
          </div>

          {sportConfig && sportConfig.fields.length > 0 && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Datos específicos – {sportConfig.label}
                </p>
                <SportSpecificFields
                  fields={sportConfig.fields}
                  values={technicalMeta}
                  onChange={(key, value) =>
                    setTechnicalMeta((prev) => ({ ...prev, [key]: value }))
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showMartialArtsTournaments && sportType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Torneos y logros competitivos</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Historial por federación o circuito. Aplicable a academias de artes marciales (no clubes de equipo).
            </p>
          </CardHeader>
          <CardContent className="space-y-0">
            <MartialArtsTournamentHistory
              sportType={sportType}
              entries={tournamentEntries}
              onChange={setTournamentEntries}
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 mt-6 border-t border-border/70">
              <p className="text-xs text-muted-foreground max-w-xl">
                Guarda los torneos y resultados en el servidor. Este botón envía <strong className="text-foreground/90">todo el formulario</strong>{' '}
                (datos personales, disciplina y torneos).
              </p>
              <Button type="submit" disabled={loading} className="shrink-0">
                {loading ? 'Guardando...' : isEditing ? 'Guardar torneos y alumno' : 'Guardar y crear alumno'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacto de Emergencia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacto de Emergencia</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact">Nombre del contacto</Label>
            <Input id="emergency_contact" {...form.register('emergency_contact')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emergency_phone">Teléfono de emergencia</Label>
            <Input id="emergency_phone" {...form.register('emergency_phone')} />
          </div>
        </CardContent>
      </Card>

      {/* Estado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado Administrativo</Label>
            <select
              id="status"
              {...form.register('status')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="health_status">Estado de Salud</Label>
            <select
              id="health_status"
              {...form.register('health_status')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="healthy">🟢 Apto</option>
              <option value="observation">🟡 Observación</option>
              <option value="injured">🔴 Lesionado</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="notes">Notas internas</Label>
            <textarea
              id="notes"
              {...form.register('notes')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Observaciones internas sobre el alumno..."
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Alumno'}
        </Button>
      </div>
    </form>
  )
}
