'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Pencil } from "lucide-react"
import { updatePlan } from "@/lib/actions/plans"

const BILLING_CYCLES = [
  { value: 'monthly',    label: 'Mensual' },
  { value: 'quarterly',  label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual',     label: 'Anual' },
  { value: 'single',     label: 'Pago único' },
]

interface Props {
  plan: {
    id: string
    name: string
    description: string | null
    price: number
    enrollment_fee: number
    billing_cycle: string
    session_limit: number | null
    grace_period_days: number
    multi_sede: boolean
    is_visible: boolean
    is_active: boolean
  }
}

export function EditPlanButton({ plan }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:               plan.name,
    description:        plan.description ?? '',
    price:              String(plan.price),
    enrollment_fee:     String(plan.enrollment_fee),
    billing_cycle:      plan.billing_cycle,
    session_limit:      plan.session_limit != null ? String(plan.session_limit) : '',
    grace_period_days:  String(plan.grace_period_days),
    multi_sede:         plan.multi_sede,
    is_visible:         plan.is_visible,
    is_active:          plan.is_active,
  })

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setLoading(true)
    try {
      await updatePlan(plan.id, {
        name:              form.name.trim(),
        description:       form.description || undefined,
        price:             Number(form.price),
        enrollment_fee:    Number(form.enrollment_fee),
        billing_cycle:     form.billing_cycle as 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'single',
        session_limit:     form.session_limit ? Number(form.session_limit) : null,
        grace_period_days: Number(form.grace_period_days),
        multi_sede:        form.multi_sede,
        is_visible:        form.is_visible,
        is_active:         form.is_active,
      })
      toast.success('Plan actualizado')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => { e.preventDefault(); setOpen(true) }}
      >
        <Pencil className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                rows={2} placeholder="Opcional"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Precio</Label>
                <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <Label>Matrícula</Label>
                <input type="number" min="0" value={form.enrollment_fee} onChange={(e) => set('enrollment_fee', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ciclo de cobro</Label>
                <select value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {BILLING_CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Sesiones/mes</Label>
                <input type="number" min="0" value={form.session_limit} onChange={(e) => set('session_limit', e.target.value)}
                  placeholder="Sin límite"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Días de gracia</Label>
              <input type="number" min="0" value={form.grace_period_days} onChange={(e) => set('grace_period_days', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex flex-col gap-2 pt-1">
              {[
                { field: 'multi_sede', label: 'Acceso multi-sede' },
                { field: 'is_visible', label: 'Visible para alumnos' },
                { field: 'is_active',  label: 'Plan activo' },
              ].map((opt) => (
                <label key={opt.field} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form[opt.field as keyof typeof form] as boolean}
                    onChange={(e) => set(opt.field, e.target.checked)} className="w-4 h-4 rounded" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
