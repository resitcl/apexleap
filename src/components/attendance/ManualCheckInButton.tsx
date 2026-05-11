'use client'

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { checkIn } from "@/lib/actions/attendance"
import { ClipboardCheck } from "lucide-react"

interface Props {
  athletes: { id: string; name: string }[]
  schedules: { id: string; name: string }[]
  presentTodayIds?: string[]
}

export function ManualCheckInButton({ athletes, schedules, presentTodayIds = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [scheduleId, setScheduleId] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const presentSet = useMemo(() => new Set(presentTodayIds), [presentTodayIds])
  const filtered = useMemo(
    () => athletes.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [athletes, search]
  )

  async function handleSubmit() {
    if (!scheduleId) {
      toast.error("Selecciona un entrenamiento/sesión")
      return
    }
    const candidates = selectedIds.filter((id) => !presentSet.has(id))
    if (candidates.length === 0) {
      toast.error("Selecciona al menos un jugador pendiente")
      return
    }
    setLoading(true)
    try {
      const results = await Promise.allSettled(
        candidates.map((athleteId) => checkIn({ athleteId, scheduleId }))
      )
      const ok = results.filter((r) => r.status === "fulfilled").length
      const failed = results.length - ok
      if (ok > 0) {
        toast.success(`Asistencia registrada para ${ok} jugador${ok === 1 ? "" : "es"}`)
      }
      if (failed > 0) {
        toast.warning(`${failed} no se pudieron registrar (ya marcados o con error)`)
      }
      setOpen(false)
      setSelectedIds([])
      setScheduleId("")
      setSearch("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar asistencia")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <ClipboardCheck className="w-4 h-4" />
        Toma Manual
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Toma de Asistencia Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <select
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleccionar entrenamiento/sesión...</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jugador..."
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="max-h-80 overflow-y-auto border rounded-md divide-y">
              {filtered.map((a) => {
                const checked = selectedIds.includes(a.id)
                const alreadyPresent = presentSet.has(a.id)
                return (
                  <label key={a.id} className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${alreadyPresent ? "opacity-60" : ""}`}>
                    <span className="truncate">{a.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {alreadyPresent && <span className="text-xs text-green-600 font-medium">Ya presente</span>}
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={alreadyPresent || loading}
                        onChange={() => {
                          setSelectedIds((prev) => (prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]))
                        }}
                      />
                    </div>
                  </label>
                )
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Sin jugadores para mostrar</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || selectedIds.length === 0 || !scheduleId}>
              {loading ? "Registrando..." : `Registrar ${selectedIds.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
