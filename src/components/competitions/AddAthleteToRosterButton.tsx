'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { UserPlus, X } from "lucide-react"
import { addAthleteToRoster, removeAthleteFromRoster } from "@/lib/actions/rosters"
import { getAthletes } from "@/lib/actions/athletes"

interface RosterAthlete {
  id: string
  athletes: { id: string; name: string } | null
  number: number | null
  position: string | null
  is_captain: boolean
}

interface Props {
  rosterId: string
  competitionId: string
  rosterAthletes: RosterAthlete[]
  rosterName: string
}

export function AddAthleteToRosterButton({ rosterId, competitionId, rosterAthletes, rosterName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    athleteId: '',
    number: '',
    position: '',
    isCaptain: false,
  })

  useEffect(() => {
    if (!open) return
    getAthletes({ status: 'active', limit: 200 }).then((result) => {
      const existing = new Set(rosterAthletes.map((ra) => ra.athletes?.id).filter(Boolean))
      setAthletes(result.athletes.filter((a) => !existing.has(a.id)).map((a) => ({ id: a.id, name: a.name })))
    }).catch(() => {})
  }, [open, rosterAthletes])

  async function handleAdd() {
    if (!form.athleteId) { toast.error('Selecciona un atleta'); return }
    setLoading(true)
    try {
      await addAthleteToRoster({
        rosterId,
        competitionId,
        athleteId: form.athleteId,
        number: form.number ? Number(form.number) : null,
        position: form.position || null,
        isCaptain: form.isCaptain,
      })
      toast.success('Atleta agregado a la nómina')
      setForm({ athleteId: '', number: '', position: '', isCaptain: false })
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(rosterAthleteId: string) {
    setRemoving(rosterAthleteId)
    try {
      await removeAthleteFromRoster({ rosterAthleteId, competitionId })
      toast.success('Atleta removido de la nómina')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al remover')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <UserPlus className="w-3.5 h-3.5" />
        Gestionar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nómina: {rosterName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1 max-h-[70vh] overflow-y-auto pr-1">
            {/* Current athletes */}
            {rosterAthletes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Citados ({rosterAthletes.length})</p>
                <div className="space-y-1">
                  {rosterAthletes.map((ra) => (
                    <div key={ra.id} className="flex items-center justify-between text-sm bg-muted/50 rounded px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        {ra.number && (
                          <span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">#{ra.number}</span>
                        )}
                        <span className="font-medium">{ra.athletes?.name ?? '—'}</span>
                        {ra.position && <span className="text-muted-foreground text-xs">· {ra.position}</span>}
                        {ra.is_captain && <span className="text-xs font-bold text-yellow-600">© Cap.</span>}
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        disabled={removing === ra.id}
                        onClick={() => handleRemove(ra.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add form */}
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agregar atleta</p>
              <div className="space-y-1">
                <Label>Atleta</Label>
                <select
                  value={form.athleteId}
                  onChange={(e) => setForm((f) => ({ ...f, athleteId: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar atleta...</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>N° (opcional)</Label>
                  <input
                    type="number" min="1" max="99"
                    value={form.number}
                    onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                    placeholder="—"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Posición (opcional)</Label>
                  <input
                    value={form.position}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                    placeholder="Delantero, Guard..."
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.isCaptain}
                  onChange={(e) => setForm((f) => ({ ...f, isCaptain: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                Capitán
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
            <Button onClick={handleAdd} disabled={loading || !form.athleteId}>
              {loading ? 'Agregando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
