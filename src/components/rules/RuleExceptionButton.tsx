'use client'

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ShieldOff } from "lucide-react"
import { createRuleException } from "@/lib/actions/rules"
import { getAthletes } from "@/lib/actions/athletes"

interface Props {
  ruleId: string
  ruleName: string
  preselectedAthleteId?: string
  preselectedAthleteName?: string
}

export function RuleExceptionButton({ ruleId, ruleName, preselectedAthleteId, preselectedAthleteName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    athleteId: preselectedAthleteId ?? "",
    reason: "",
    expiresAt: "",
  })

  useEffect(() => {
    if (!open || preselectedAthleteId) return
    getAthletes({ status: "active", limit: 200 })
      .then((r) => setAthletes(r.athletes.map((a) => ({ id: a.id, name: a.name }))))
      .catch(() => {})
  }, [open, preselectedAthleteId])

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.athleteId) { toast.error("Selecciona un atleta"); return }
    if (!form.reason.trim()) { toast.error("Ingresa el motivo"); return }
    setLoading(true)
    try {
      await createRuleException({
        ruleId,
        athleteId: form.athleteId,
        reason: form.reason.trim(),
        expiresAt: form.expiresAt || null,
      })
      toast.success("Excepción creada")
      setOpen(false)
      setForm({ athleteId: preselectedAthleteId ?? "", reason: "", expiresAt: "" })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error"
      if (msg === "tabla_no_existe") {
        toast.error("La tabla rule_exceptions no existe aún en la DB")
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <ShieldOff className="w-3.5 h-3.5" />
        Excepción
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="w-4 h-4 text-orange-500" />
              Crear Excepción de Regla
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
              <span className="font-medium">Regla:</span> {ruleName}
            </div>

            {!preselectedAthleteId ? (
              <div className="space-y-1">
                <Label>Atleta *</Label>
                <select
                  value={form.athleteId}
                  onChange={(e) => set("athleteId", e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar atleta...</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-md px-3 py-2 text-sm text-blue-700">
                Atleta: <strong>{preselectedAthleteName}</strong>
              </div>
            )}

            <div className="space-y-1">
              <Label>Motivo *</Label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                placeholder="Ej: Acuerdo de pago en curso, visita médica autorizada..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label>Expira el (opcional)</Label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Si no se especifica, la excepción es indefinida</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading || !form.reason.trim() || !form.athleteId}>
              {loading ? "Creando..." : "Crear Excepción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
