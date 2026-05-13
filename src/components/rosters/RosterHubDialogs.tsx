'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Link2 } from 'lucide-react'
import {
  createRoster,
  getScheduledMatchesForRosterLinking,
  updateRoster,
} from '@/lib/actions/rosters'

export type HubCompetitionOption = { id: string; name: string }

type MatchOption = {
  id: string
  opponent: string | null
  match_date: string
  location: string | null
}

export function NewRosterHubButton({ competitions }: { competitions: HubCompetitionOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<MatchOption[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [competitionId, setCompetitionId] = useState('')
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [form, setForm] = useState({
    name: '',
    matchDate: new Date().toISOString().split('T')[0],
    opponent: '',
    venue: '',
  })

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  useEffect(() => {
    if (!open) return
    setLoadingMatches(true)
    getScheduledMatchesForRosterLinking()
      .then((rows) =>
        setMatches(
          rows.map((m) => ({
            id: m.id,
            opponent: m.opponent,
            match_date: m.match_date,
            location: m.location,
          })),
        ),
      )
      .catch(() => toast.error('No se pudieron cargar los partidos'))
      .finally(() => setLoadingMatches(false))
  }, [open])

  function handleMatchSelect(matchId: string) {
    setSelectedMatchId(matchId)
    if (!matchId) return
    const m = matches.find((x) => x.id === matchId)
    if (!m) return
    setForm((p) => ({
      ...p,
      matchDate: m.match_date,
      opponent: m.opponent ?? '',
      venue: m.location ?? '',
    }))
  }

  async function handleSave() {
    if (!form.name) {
      toast.error('El nombre es requerido')
      return
    }
    if (!form.matchDate) {
      toast.error('La fecha es requerida')
      return
    }
    setLoading(true)
    try {
      await createRoster({
        competitionId: competitionId || null,
        name: form.name,
        matchDate: form.matchDate,
        opponent: form.opponent || null,
        venue: form.venue || null,
        matchId: selectedMatchId || null,
      })
      toast.success('Nómina creada')
      setOpen(false)
      setSelectedMatchId('')
      setCompetitionId('')
      setForm({ name: '', matchDate: new Date().toISOString().split('T')[0], opponent: '', venue: '' })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear nómina')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Nueva nómina
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva nómina Matchday</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {competitions.length > 0 && (
              <div className="space-y-1">
                <Label>Competencia (opcional)</Label>
                <select
                  value={competitionId}
                  onChange={(e) => setCompetitionId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Sin competencia (amistoso / independiente) —</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Vincular a partido en planificación
              </Label>
              <select
                value={selectedMatchId}
                onChange={(e) => handleMatchSelect(e.target.value)}
                disabled={loadingMatches}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">— Sin vincular —</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    vs. {m.opponent ?? 'Rival'} ·{' '}
                    {new Date(m.match_date + 'T12:00:00').toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </option>
                ))}
              </select>
              {selectedMatchId && (
                <p className="text-xs text-primary font-medium">
                  Fecha, rival y lugar tomados del partido (puedes ajustarlos)
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Nómina vs. Sasquatch"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Fecha del partido *</Label>
              <Input type="date" value={form.matchDate} onChange={(e) => set('matchDate', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Rival</Label>
              <Input
                placeholder="Equipo rival"
                value={form.opponent}
                onChange={(e) => set('opponent', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Recinto</Label>
              <Input
                placeholder="Estadio / lugar"
                value={form.venue}
                onChange={(e) => set('venue', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !form.name || !form.matchDate}>
              {loading ? 'Creando...' : 'Crear nómina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export type HubRosterForEdit = {
  id: string
  name: string
  match_date: string
  opponent: string | null
  venue: string | null
  competition_id: string | null
  linked_match_id: string | null
}

export function EditRosterHubButton({ roster }: { roster: HubRosterForEdit }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [matches, setMatches] = useState<MatchOption[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [form, setForm] = useState({
    name: roster.name,
    matchDate: roster.match_date,
    opponent: roster.opponent ?? '',
    venue: roster.venue ?? '',
  })

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  useEffect(() => {
    if (!open) return
    setForm({
      name: roster.name,
      matchDate: roster.match_date,
      opponent: roster.opponent ?? '',
      venue: roster.venue ?? '',
    })
    setSelectedMatchId(roster.linked_match_id ?? '')
    setLoadingMatches(true)
    getScheduledMatchesForRosterLinking({ rosterId: roster.id })
      .then((rows) =>
        setMatches(
          rows.map((m) => ({
            id: m.id,
            opponent: m.opponent,
            match_date: m.match_date,
            location: m.location,
          })),
        ),
      )
      .catch(() => toast.error('No se pudieron cargar los partidos'))
      .finally(() => setLoadingMatches(false))
  }, [open, roster.id, roster.name, roster.match_date, roster.opponent, roster.venue, roster.linked_match_id])

  function handleMatchSelect(matchId: string) {
    setSelectedMatchId(matchId)
    if (!matchId) return
    const m = matches.find((x) => x.id === matchId)
    if (!m) return
    setForm((p) => ({
      ...p,
      matchDate: m.match_date,
      opponent: m.opponent ?? '',
      venue: m.location ?? '',
    }))
  }

  async function handleSave() {
    if (!form.name) {
      toast.error('El nombre es requerido')
      return
    }
    if (!form.matchDate) {
      toast.error('La fecha es requerida')
      return
    }
    setLoading(true)
    try {
      await updateRoster({
        rosterId: roster.id,
        competitionId: roster.competition_id,
        name: form.name,
        matchDate: form.matchDate,
        opponent: form.opponent || null,
        venue: form.venue || null,
        matchId: selectedMatchId || null,
      })
      toast.success('Nómina actualizada')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <Pencil className="w-3.5 h-3.5" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar nómina</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Partido vinculado
              </Label>
              <select
                value={selectedMatchId}
                onChange={(e) => handleMatchSelect(e.target.value)}
                disabled={loadingMatches}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">— Sin vincular —</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    vs. {m.opponent ?? 'Rival'} ·{' '}
                    {new Date(m.match_date + 'T12:00:00').toLocaleDateString('es-CL', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fecha del partido *</Label>
              <Input type="date" value={form.matchDate} onChange={(e) => set('matchDate', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Rival</Label>
              <Input value={form.opponent} onChange={(e) => set('opponent', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Recinto</Label>
              <Input value={form.venue} onChange={(e) => set('venue', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !form.name || !form.matchDate}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
