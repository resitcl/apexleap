'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { History, Check, X } from 'lucide-react'
import { bulkCheckIn } from '@/lib/actions/attendance'

interface Athlete {
  id: string
  name: string
  category_id?: string | null
}

interface Schedule {
  id: string
  name: string
}

interface Props {
  athletes: Athlete[]
  schedules: Schedule[]
}

export function BulkHistoricalAttendance({ athletes, schedules }: Props) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  })
  const [scheduleId, setScheduleId] = useState('')
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAthletes = athletes.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function toggleAthlete(id: string) {
    const newSet = new Set(selectedAthletes)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedAthletes(newSet)
  }

  function selectAll() {
    setSelectedAthletes(new Set(filteredAthletes.map(a => a.id)))
  }

  function deselectAll() {
    setSelectedAthletes(new Set())
  }

  async function handleSubmit() {
    if (selectedAthletes.size === 0) {
      toast.error('Selecciona al menos un alumno')
      return
    }
    if (!date) {
      toast.error('Selecciona una fecha')
      return
    }

    setLoading(true)
    try {
      const result = await bulkCheckIn({
        athleteIds: Array.from(selectedAthletes),
        date,
        scheduleId: scheduleId || undefined,
      })
      
      toast.success(`${result.count} asistencias registradas para ${date}`)
      setOpen(false)
      setSelectedAthletes(new Set())
      setSearchTerm('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar asistencias')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <History className="w-4 h-4" />
        Asistencia Histórica
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Registrar Asistencia Histórica
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
            {/* Date & Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hist-date">Fecha</Label>
                <input
                  id="hist-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <Label htmlFor="hist-schedule">Sesión (opcional)</Label>
                <select
                  id="hist-schedule"
                  value={scheduleId}
                  onChange={(e) => setScheduleId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sin sesión específica</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar alumno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Todos
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Ninguno
              </Button>
            </div>

            {/* Selected count */}
            <div className="text-sm text-muted-foreground">
              {selectedAthletes.size} alumno{selectedAthletes.size !== 1 ? 's' : ''} seleccionado{selectedAthletes.size !== 1 ? 's' : ''}
            </div>

            {/* Athletes list */}
            <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-[200px] max-h-[300px]">
              {filteredAthletes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No se encontraron alumnos
                </div>
              ) : (
                filteredAthletes.map((athlete) => {
                  const isSelected = selectedAthletes.has(athlete.id)
                  return (
                    <button
                      key={athlete.id}
                      onClick={() => toggleAthlete(athlete.id)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : 'border-input'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <span className="flex-1 text-sm font-medium">{athlete.name}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedAthletes.size === 0}
              className="gap-2"
            >
              {loading ? 'Registrando...' : `Registrar ${selectedAthletes.size} asistencia${selectedAthletes.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
