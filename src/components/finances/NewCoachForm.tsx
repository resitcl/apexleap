'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createCoach } from '@/lib/actions/finances'
import { UserPlus } from 'lucide-react'

export function NewCoachForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', specialty: '',
    salary_type: 'fixed', salary_amount: '',
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      await createCoach({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || null,
        specialty: form.specialty || null,
        salary_type: form.salary_type as 'fixed' | 'per_session' | 'percentage',
        salary_amount: form.salary_amount ? Number(form.salary_amount) : null,
        is_active: true,
      })
      toast.success('Entrenador agregado')
      setOpen(false)
      setForm({ name: '', email: '', phone: '', specialty: '', salary_type: 'fixed', salary_amount: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><UserPlus className="w-4 h-4" />Agregar Entrenador</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Entrenador / Staff</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+56 9..." />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="specialty">Especialidad / Disciplina</Label>
              <Input id="specialty" value={form.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Jiu-Jitsu, Muay Thai..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salary_type">Tipo de remuneración</Label>
              <select id="salary_type" value={form.salary_type} onChange={(e) => set('salary_type', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="fixed">Fijo mensual</option>
                <option value="per_session">Por sesión</option>
                <option value="percentage">% de ingresos</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salary_amount">Monto / %</Label>
              <Input id="salary_amount" type="number" min="0" step="1" value={form.salary_amount}
                onChange={(e) => set('salary_amount', e.target.value)} placeholder="0" />
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
