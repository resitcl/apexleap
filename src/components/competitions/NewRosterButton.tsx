'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { createRoster } from "@/lib/actions/rosters"

interface Props {
  competitionId: string
}

export function NewRosterButton({ competitionId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    matchDate: new Date().toISOString().split('T')[0],
    opponent: '',
    venue: '',
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.name) { toast.error('El nombre es requerido'); return }
    if (!form.matchDate) { toast.error('La fecha es requerida'); return }
    setLoading(true)
    try {
      await createRoster({
        competitionId,
        name: form.name,
        matchDate: form.matchDate,
        opponent: form.opponent || null,
        venue: form.venue || null,
      })
      toast.success('Nómina creada')
      setOpen(false)
      setForm({ name: '', matchDate: new Date().toISOString().split('T')[0], opponent: '', venue: '' })
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
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Nómina Semifinal"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Fecha del partido *</Label>
              <Input
                type="date"
                value={form.matchDate}
                onChange={(e) => set('matchDate', e.target.value)}
              />
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
