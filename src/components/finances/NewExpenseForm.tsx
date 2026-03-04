'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createExpense } from '@/lib/actions/finances'
import { getSuppliers } from '@/lib/actions/suppliers'
import { Plus, Building2 } from 'lucide-react'

const CATEGORIES = [
  { value: 'rent',        label: 'Arriendo' },
  { value: 'salary',      label: 'Salarios' },
  { value: 'supplies',    label: 'Insumos' },
  { value: 'maintenance', label: 'Mantención' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'other',       label: 'Otros' },
]

type SupplierOption = { id: string; name: string; category: string }

const BLANK = {
  concept: '', category: 'other', amount: '',
  date: new Date().toISOString().split('T')[0],
  paid_to: '', notes: '', supplier_id: '',
}

export function NewExpenseForm() {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [form, setForm] = useState({ ...BLANK })

  useEffect(() => {
    if (!open) return
    getSuppliers({ activeOnly: true }).then((data) =>
      setSuppliers(data.map((s) => ({ id: s.id, name: s.name, category: s.category })))
    ).catch(() => {})
  }, [open])

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  function handleSupplierChange(supplierId: string) {
    const sup = suppliers.find((s) => s.id === supplierId)
    setForm((p) => ({
      ...p,
      supplier_id: supplierId,
      paid_to: sup ? sup.name : p.paid_to,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.concept || !form.amount) { toast.error('Completa los campos requeridos'); return }
    setLoading(true)
    try {
      await createExpense({
        concept:     form.concept,
        category:    form.category as never,
        amount:      Number(form.amount),
        date:        form.date,
        paid_to:     form.paid_to || null,
        notes:       form.notes || null,
        supplier_id: form.supplier_id || null,
      })
      toast.success('Egreso registrado')
      setOpen(false)
      setForm({ ...BLANK })
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

            {/* Supplier selector */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="supplier_id" className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Proveedor
              </Label>
              <select
                id="supplier_id"
                value={form.supplier_id}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">— Sin proveedor —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Sin proveedores registrados —{' '}
                  <a href="/dashboard/finances?tab=suppliers" className="underline hover:text-foreground">agregar en Proveedores</a>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paid_to">Pagado a</Label>
              <Input id="paid_to" value={form.paid_to} onChange={(e) => set('paid_to', e.target.value)} placeholder="Nombre manual..." />
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
