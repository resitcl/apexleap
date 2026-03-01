'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Pencil } from "lucide-react"
import { updateExpense } from "@/lib/actions/finances"

const CATEGORIES = [
  { value: 'rent',        label: 'Arriendo' },
  { value: 'salary',      label: 'Salarios' },
  { value: 'supplies',    label: 'Insumos' },
  { value: 'maintenance', label: 'Mantención' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'other',       label: 'Otros' },
]

interface Props {
  expense: {
    id: string
    concept: string
    category: string
    amount: number
    date: string
    paid_to: string | null
    notes: string | null
  }
}

export function EditExpenseButton({ expense }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    concept:  expense.concept,
    category: expense.category,
    amount:   String(expense.amount),
    date:     expense.date,
    paid_to:  expense.paid_to ?? '',
    notes:    expense.notes ?? '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.concept.trim()) { toast.error('El concepto es obligatorio'); return }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error('Monto inválido'); return }
    setLoading(true)
    try {
      await updateExpense(expense.id, {
        concept:  form.concept.trim(),
        category: form.category as 'rent' | 'salary' | 'supplies' | 'maintenance' | 'marketing' | 'other',
        amount:   Number(form.amount),
        date:     form.date,
        paid_to:  form.paid_to || null,
        notes:    form.notes || null,
      })
      toast.success('Egreso actualizado')
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar egreso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Concepto</Label>
              <input
                value={form.concept}
                onChange={(e) => set('concept', e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría</Label>
                <select
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Monto</Label>
                <input
                  type="number" min="0" step="1"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha</Label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <Label>Pagado a</Label>
                <input
                  value={form.paid_to}
                  onChange={(e) => set('paid_to', e.target.value)}
                  placeholder="Proveedor / Persona"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                placeholder="Opcional"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
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
