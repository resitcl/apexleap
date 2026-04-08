'use client'

import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BJJ_AGE_DIVISION_OPTIONS,
  BJJ_BELT_AT_EVENT_OPTIONS,
  BJJ_FORMAT_OPTIONS,
  BJJ_RESULT_WEIGHT_OPTIONS,
  createEmptyPlacing,
  formatTournamentPlacingLine,
  getGenericCategoryOptions,
  MEDAL_OPTIONS,
  type TournamentPlacing,
} from '@/lib/martial-arts-tournament-results'
import {
  getMartialArtsFederationOptions,
  MARTIAL_ARTS_FEDERATION_OTHER,
  type TournamentHistoryEntry,
} from '@/lib/sport-fields'

interface Props {
  sportType: string
  entries: TournamentHistoryEntry[]
  onChange: (entries: TournamentHistoryEntry[]) => void
}

function newEntry(): TournamentHistoryEntry {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `th-${Date.now()}`,
    federation: '',
    event_name: '',
    date: undefined,
    results: [],
    notes: undefined,
  }
}

function FederationField({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const presetValues = useMemo(
    () => new Set(options.filter((o) => o.value !== MARTIAL_ARTS_FEDERATION_OTHER).map((o) => o.value)),
    [options]
  )
  const isPreset = presetValues.has(value)
  const selectVal = isPreset ? value : MARTIAL_ARTS_FEDERATION_OTHER
  const otherText = isPreset ? '' : value

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Federación / circuito</Label>
      <select
        value={selectVal}
        onChange={(e) => {
          const v = e.target.value
          if (v === MARTIAL_ARTS_FEDERATION_OTHER) onChange('')
          else onChange(v)
        }}
        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Seleccionar…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {selectVal === MARTIAL_ARTS_FEDERATION_OTHER && (
        <Input
          value={otherText}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ej: federación local, open regional…"
          className="text-sm"
        />
      )}
    </div>
  )
}

function BjjResultForm({
  placing,
  onChange,
}: {
  placing: TournamentPlacing
  onChange: (p: TournamentPlacing) => void
}) {
  const fmt = placing.divisionFormat ?? 'gi'
  const showWeight = fmt === 'gi' || fmt === 'nogi'

  return (
    <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Resultado</Label>
        <select
          value={placing.medal}
          onChange={(e) => onChange({ ...placing, medal: e.target.value as TournamentPlacing['medal'] })}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {MEDAL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs text-muted-foreground">Modalidad</Label>
        <select
          value={fmt}
          onChange={(e) =>
            onChange({
              ...placing,
              divisionFormat: e.target.value as TournamentPlacing['divisionFormat'],
            })
          }
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {BJJ_FORMAT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {showWeight && (
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Categoría de peso</Label>
          <select
            value={placing.weightClass ?? 'middle'}
            onChange={(e) => onChange({ ...placing, weightClass: e.target.value })}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {BJJ_RESULT_WEIGHT_OPTIONS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">División de edad</Label>
        <select
          value={placing.ageDivision ?? 'adult'}
          onChange={(e) => onChange({ ...placing, ageDivision: e.target.value })}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {BJJ_AGE_DIVISION_OPTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Cinturón (en el evento)</Label>
        <select
          value={placing.belt ?? 'white'}
          onChange={(e) => onChange({ ...placing, belt: e.target.value })}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {BJJ_BELT_AT_EVENT_OPTIONS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <p className="sm:col-span-2 text-xs text-muted-foreground rounded-md bg-muted/30 px-3 py-2 border border-border/50">
        <span className="font-semibold text-foreground/90">Vista previa:</span>{' '}
        {formatTournamentPlacingLine('Jiu-Jitsu', { ...placing, variant: 'bjj' })}
      </p>
    </div>
  )
}

function GenericResultForm({
  sportType,
  placing,
  onChange,
}: {
  sportType: string
  placing: TournamentPlacing
  onChange: (p: TournamentPlacing) => void
}) {
  const cats = getGenericCategoryOptions(sportType)
  return (
    <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Resultado</Label>
        <select
          value={placing.medal}
          onChange={(e) => onChange({ ...placing, medal: e.target.value as TournamentPlacing['medal'] })}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {MEDAL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Categoría / modalidad</Label>
        <select
          value={placing.categoryKey ?? cats[0]?.value ?? 'open'}
          onChange={(e) => onChange({ ...placing, categoryKey: e.target.value })}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {cats.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <p className="sm:col-span-2 text-xs text-muted-foreground rounded-md bg-muted/30 px-3 py-2 border border-border/50">
        <span className="font-semibold text-foreground/90">Vista previa:</span>{' '}
        {formatTournamentPlacingLine(sportType, { ...placing, variant: 'generic' })}
      </p>
    </div>
  )
}

export function MartialArtsTournamentHistory({ sportType, entries, onChange }: Props) {
  const federationOptions = useMemo(() => getMartialArtsFederationOptions(sportType), [sportType])
  const isBjj = sportType === 'Jiu-Jitsu'

  const updateRow = (id: string, patch: Partial<TournamentHistoryEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const updateResult = (tournamentId: string, placingId: string, next: TournamentPlacing) => {
    onChange(
      entries.map((e) => {
        if (e.id !== tournamentId) return e
        const results = (e.results ?? []).map((r) => (r.id === placingId ? next : r))
        return { ...e, results }
      })
    )
  }

  const addResult = (tournamentId: string) => {
    const p = createEmptyPlacing(sportType)
    onChange(
      entries.map((e) => {
        if (e.id !== tournamentId) return e
        return { ...e, results: [...(e.results ?? []), p] }
      })
    )
  }

  const removeResult = (tournamentId: string, placingId: string) => {
    onChange(
      entries.map((e) => {
        if (e.id !== tournamentId) return e
        return { ...e, results: (e.results ?? []).filter((r) => r.id !== placingId) }
      })
    )
  }

  const removeRow = (id: string) => {
    onChange(entries.filter((e) => e.id !== id))
  }

  const addRow = () => {
    onChange([...entries, newEntry()])
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Registra cada torneo con federación, nombre y fecha. Añade uno o más resultados con los selectores (medalla,
        modalidad, peso, edad y cinturón en BJJ). Así se construyen líneas claras tipo:{' '}
        <span className="text-foreground/90 font-medium">
          🥇 Campeón Kimono Medio / Middle Master 1 Cinturón Café
        </span>
        .
      </p>

      {entries.length === 0 && <p className="text-sm italic text-muted-foreground">Aún no hay torneos registrados.</p>}

      <div className="space-y-4">
        {entries.map((row) => (
          <div key={row.id} className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(row.id)}
                aria-label="Eliminar torneo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FederationField
                  value={row.federation}
                  options={federationOptions}
                  onChange={(federation) => updateRow(row.id, { federation })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`evt-${row.id}`} className="text-xs text-muted-foreground">
                  Nombre del evento
                </Label>
                <Input
                  id={`evt-${row.id}`}
                  value={row.event_name}
                  onChange={(e) => updateRow(row.id, { event_name: e.target.value })}
                  placeholder="Ej: São Paulo Open, Open Teresópolis…"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`dt-${row.id}`} className="text-xs text-muted-foreground">
                  Fecha
                </Label>
                <Input
                  id={`dt-${row.id}`}
                  type="date"
                  value={row.date ?? ''}
                  onChange={(e) => updateRow(row.id, { date: e.target.value || undefined })}
                />
              </div>
            </div>

            <div className="border-t border-border/50 pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Resultados en este torneo</p>
                <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => addResult(row.id)}>
                  <Plus className="h-3.5 w-3.5" />
                  Añadir resultado
                </Button>
              </div>

              {(row.results ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Sin resultados aún. Usa &quot;Añadir resultado&quot; para cargar medallas y categorías.
                </p>
              )}

              {(row.results ?? []).map((pl) => (
                <div key={pl.id} className="relative pl-2 border-l-2 border-primary/30">
                  <div className="absolute -left-1 top-2 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeResult(row.id, pl.id)}
                      aria-label="Quitar resultado"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="pl-6">
                    {isBjj ? (
                      <BjjResultForm
                        placing={{ ...pl, variant: 'bjj' }}
                        onChange={(next) => updateResult(row.id, pl.id, { ...next, variant: 'bjj', id: pl.id })}
                      />
                    ) : (
                      <GenericResultForm
                        sportType={sportType}
                        placing={{ ...pl, variant: 'generic' }}
                        onChange={(next) => updateResult(row.id, pl.id, { ...next, variant: 'generic', id: pl.id })}
                      />
                    )}
                  </div>
                </div>
              ))}

              {row.achievements && row.achievements.trim() && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/90">
                  <span className="font-semibold">Registro anterior (texto): </span>
                  {row.achievements}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`nt-${row.id}`} className="text-xs text-muted-foreground">
                Notas (opcional)
              </Label>
              <Input
                id={`nt-${row.id}`}
                value={row.notes ?? ''}
                onChange={(e) => updateRow(row.id, { notes: e.target.value || undefined })}
                placeholder="Link al bracket, observaciones…"
              />
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-2">
        <Plus className="h-4 w-4" />
        Agregar torneo
      </Button>
    </div>
  )
}
