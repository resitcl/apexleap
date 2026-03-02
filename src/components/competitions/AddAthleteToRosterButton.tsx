'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { UserPlus, X } from "lucide-react"
import { addAthleteToRoster, removeAthleteFromRoster, getAthletesSemaforo } from "@/lib/actions/rosters"

type SemaforoAthlete = { id: string; name: string; health_status: string; semaforo: 'green' | 'yellow' | 'red' }

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
  const [athletes, setAthletes] = useState<SemaforoAthlete[]>([])
  const [form, setForm] = useState({
    athleteId: '',
    number: '',
    position: '',
    isCaptain: false,
  })

  useEffect(() => {
    if (!open) return
    getAthletesSemaforo().then((result) => {
      const existing = new Set(rosterAthletes.map((ra) => ra.athletes?.id).filter(Boolean))
      setAthletes(result.filter((a) => !existing.has(a.id)))
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
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md">
                  {athletes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No hay atletas disponibles</p>
                  )}
                  {athletes.map((a) => {
                    const dot = a.semaforo === 'red' ? 'bg-red-500' : a.semaforo === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'
                    const isBlocked = a.semaforo === 'red'
                    const isSelected = form.athleteId === a.id
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, athleteId: isSelected ? '' : a.id }))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors border-b last:border-0 ${
                          isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-accent/50'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                        <span className={`flex-1 truncate ${isBlocked ? 'text-red-600' : ''}`}>
                          {a.name}
                        </span>
                        {isBlocked && <span className="text-xs text-red-500 shrink-0">🔒</span>}
                        {a.semaforo === 'yellow' && <span className="text-xs text-yellow-600 shrink-0">⚠</span>}
                      </button>
                    )
                  })}
                </div>
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
