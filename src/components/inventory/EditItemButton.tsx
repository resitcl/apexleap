'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Pencil } from "lucide-react"
import { updateInventoryItem } from "@/lib/actions/inventory"

const CONDITIONS = [
  { value: 'good',   label: 'Bueno' },
  { value: 'fair',   label: 'Regular' },
  { value: 'poor',   label: 'Malo' },
  { value: 'broken', label: 'Roto' },
]
const CATEGORIES = [
  { value: 'equipment',      label: 'Equipamiento' },
  { value: 'uniform',        label: 'Uniformes' },
  { value: 'infrastructure', label: 'Infraestructura' },
  { value: 'other',          label: 'Otro' },
]

interface Props {
  item: {
    id: string
    name: string
    quantity: number
    quantity_min: number
    condition: string
    category: string
    description: string | null
    serial_number: string | null
  }
}

export function EditItemButton({ item }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: item.name,
    quantity: String(item.quantity),
    quantity_min: String(item.quantity_min),
    condition: item.condition,
    category: item.category,
    description: item.description ?? '',
    serial_number: item.serial_number ?? '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setLoading(true)
    try {
      await updateInventoryItem(item.id, {
        name: form.name.trim(),
        quantity: Number(form.quantity),
        quantity_min: Number(form.quantity_min),
        condition: form.condition as 'good' | 'fair' | 'poor' | 'broken',
        category: form.category as 'equipment' | 'uniform' | 'infrastructure' | 'other',
        description: form.description || null,
        serial_number: form.serial_number || null,
      })
      toast.success('Ítem actualizado')
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
            <DialogTitle>Editar ítem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
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
                <Label>Condición</Label>
                <select
                  value={form.condition}
                  onChange={(e) => set('condition', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cantidad</Label>
                <input
                  type="number" min="0"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <Label>Stock mín.</Label>
                <input
                  type="number" min="0"
                  value={form.quantity_min}
                  onChange={(e) => set('quantity_min', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>N° Serie</Label>
              <input
                value={form.serial_number}
                onChange={(e) => set('serial_number', e.target.value)}
                placeholder="Opcional"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
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
