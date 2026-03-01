'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createExpense } from '@/lib/actions/finances'
import { Plus } from 'lucide-react'

const CATEGORIES = [
  { value: 'rent',        label: 'Arriendo' },
  { value: 'salary',      label: 'Salarios' },
  { value: 'supplies',    label: 'Insumos' },
  { value: 'maintenance', label: 'Mantención' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'other',       label: 'Otros' },
]

export function NewExpenseForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    concept: '', category: 'other', amount: '',
    date: new Date().toISOString().split('T')[0],
    paid_to: '', notes: '',
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.concept || !form.amount) { toast.error('Completa los campos requeridos'); return }
    setLoading(true)
    try {
      await createExpense({
        concept: form.concept,
        category: form.category as never,
        amount: Number(form.amount),
        date: form.date,
        paid_to: form.paid_to || null,
        notes: form.notes || null,
      })
      toast.success('Egreso registrado')
      setOpen(false)
      setForm({ concept: '', category: 'other', amount: '', date: new Date().toISOString().split('T')[0], paid_to: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Nuevo Egreso</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Egreso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="concept">Concepto *</Label>
              <Input id="concept" value={form.concept} onChange={(e) => set('concept', e.target.value)} placeholder="Arriendo dojo, gas, etc." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Monto *</Label>
              <Input id="amount" type="number" min="0" step="1" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Fecha *</Label>
              <Input id="date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoría</Label>
              <select id="category" value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paid_to">Pagado a</Label>
              <Input id="paid_to" value={form.paid_to} onChange={(e) => set('paid_to', e.target.value)} placeholder="Proveedor..." />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Input id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Observaciones..." />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
