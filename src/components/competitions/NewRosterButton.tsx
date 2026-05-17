'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Link2 } from "lucide-react"
import { createRoster } from "@/lib/actions/rosters"

interface MatchOption {
  id: string
  opponent: string | null
  match_date: string
  match_time?: string | null
  location: string | null
}

interface Props {
  competitionId: string
  matches?: MatchOption[]
}

export function NewRosterButton({ competitionId, matches = [] }: Props) {
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [form, setForm] = useState({
    name: '',
    matchDate: new Date().toISOString().split('T')[0],
    matchTime: '',
    opponent: '',
    venue: '',
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  function handleMatchSelect(matchId: string) {
    setSelectedMatchId(matchId)
    if (!matchId) return
    const m = matches.find((x) => x.id === matchId)
    if (!m) return
    setForm((p) => ({
      ...p,
      matchDate: m.match_date,
      matchTime: m.match_time ? m.match_time.slice(0, 5) : '',
      opponent:  m.opponent ?? '',
      venue:     m.location ?? '',
    }))
  }

  async function handleSave() {
    if (!form.name) { toast.error('El nombre es requerido'); return }
    if (!form.matchDate) { toast.error('La fecha es requerida'); return }
    setLoading(true)
    try {
      await createRoster({
        competitionId,
        name:     form.name,
        matchDate: form.matchDate,
        matchTime: form.matchTime || null,
        opponent: form.opponent || null,
        venue:    form.venue || null,
        matchId:  selectedMatchId || null,
      })
      toast.success('Nómina creada')
      setOpen(false)
      setSelectedMatchId('')
      setForm({ name: '', matchDate: new Date().toISOString().split('T')[0], matchTime: '', opponent: '', venue: '' })
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
        Nueva Nómina
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Nómina Matchday</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {matches.length > 0 && (
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />Vincular a partido existente</Label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => handleMatchSelect(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Sin vincular (crear independiente) —</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                      vs. {m.opponent ?? 'Rival'} · {new Date(m.match_date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                    </option>
                  ))}
                </select>
                {selectedMatchId && (
                  <p className="text-xs text-primary font-medium">✓ Fecha, rival y lugar autocompletados desde el partido</p>
                )}
              </div>
            )}
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Nómina Semifinal"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Fecha del partido *</Label>
                <Input
                  type="date"
                  value={form.matchDate}
                  onChange={(e) => set('matchDate', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Hora (opcional)</Label>
                <Input
                  type="time"
                  value={form.matchTime}
                  onChange={(e) => set('matchTime', e.target.value)}
                />
              </div>
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading || !form.name || !form.matchDate}>
              {loading ? 'Creando...' : 'Crear Nómina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
