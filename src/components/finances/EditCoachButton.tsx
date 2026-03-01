'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Pencil } from "lucide-react"
import { updateCoach } from "@/lib/actions/finances"

const SALARY_TYPES = [
  { value: 'fixed',       label: 'Fijo mensual' },
  { value: 'per_session', label: 'Por sesión' },
  { value: 'percentage',  label: '% ingresos' },
]

interface Props {
  coach: {
    id: string
    name: string
    email: string | null
    phone: string | null
    specialty: string | null
    salary_type: string
    salary_amount: number | null
    is_active: boolean
  }
}

export function EditCoachButton({ coach }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:          coach.name,
    email:         coach.email ?? '',
    phone:         coach.phone ?? '',
    specialty:     coach.specialty ?? '',
    salary_type:   coach.salary_type,
    salary_amount: coach.salary_amount != null ? String(coach.salary_amount) : '',
    is_active:     coach.is_active,
  })

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    setLoading(true)
    try {
      await updateCoach(coach.id, {
        name:          form.name.trim(),
        email:         form.email || undefined,
        phone:         form.phone || null,
        specialty:     form.specialty || null,
        salary_type:   form.salary_type as 'fixed' | 'per_session' | 'percentage',
        salary_amount: form.salary_amount ? Number(form.salary_amount) : null,
        is_active:     form.is_active,
      })
      toast.success('Coach actualizado')
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
            <DialogTitle>Editar coach</DialogTitle>
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
                <Label>Email</Label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="Opcional"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  placeholder="Opcional"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Especialidad</Label>
              <input value={form.specialty} onChange={(e) => set('specialty', e.target.value)}
                placeholder="Ej: Jiu-Jitsu, Defensa personal..."
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo salario</Label>
                <select value={form.salary_type} onChange={(e) => set('salary_type', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {SALARY_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Monto</Label>
                <input type="number" min="0" value={form.salary_amount} onChange={(e) => set('salary_amount', e.target.value)}
                  placeholder="0"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              Coach activo
            </label>
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
