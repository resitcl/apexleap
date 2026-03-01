'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createInventoryItem } from '@/lib/actions/inventory'
import { Plus } from 'lucide-react'

const CATEGORIES = [
  { value: 'equipment',       label: 'Equipamiento' },
  { value: 'uniform',         label: 'Uniformes' },
  { value: 'infrastructure',  label: 'Infraestructura' },
  { value: 'other',           label: 'Otro' },
]

const CONDITIONS = [
  { value: 'good',   label: 'Bueno' },
  { value: 'fair',   label: 'Regular' },
  { value: 'poor',   label: 'Malo' },
  { value: 'broken', label: 'Roto/Baja' },
]

interface Props {
  athletes: { id: string; name: string }[]
}

export function NewItemForm({ athletes }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', category: 'equipment', description: '',
    quantity: '1', quantity_min: '0',
    condition: 'good', assigned_to: '',
    purchase_price: '', serial_number: '', notes: '',
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      await createInventoryItem({
        name: form.name,
        category: form.category as 'equipment' | 'uniform' | 'infrastructure' | 'other',
        description: form.description || null,
        quantity: Number(form.quantity) || 1,
        quantity_min: Number(form.quantity_min) || 0,
        condition: form.condition as 'good' | 'fair' | 'poor' | 'broken',
        assigned_to: form.assigned_to || null,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
        serial_number: form.serial_number || null,
        notes: form.notes || null,
        is_active: true,
      })
      toast.success('Ítem agregado al inventario')
      setOpen(false)
      setForm({ name: '', category: 'equipment', description: '', quantity: '1', quantity_min: '0', condition: 'good', assigned_to: '', purchase_price: '', serial_number: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Agregar Ítem</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Ítem de Inventario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Guantes de boxeo, Kimono..." />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <select value={form.condition} onChange={(e) => set('condition', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input id="quantity" type="number" min="0" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity_min">Stock mínimo</Label>
              <Input id="quantity_min" type="number" min="0" value={form.quantity_min} onChange={(e) => set('quantity_min', e.target.value)} placeholder="Alerta si cae aquí" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchase_price">Precio compra</Label>
              <Input id="purchase_price" type="number" min="0" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} placeholder="$" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serial_number">N° Serie</Label>
              <Input id="serial_number" value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} placeholder="Opcional" />
            </div>
            {athletes.length > 0 && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Asignado a (opcional)</Label>
                <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">— Sin asignar —</option>
                  {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Agregar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
