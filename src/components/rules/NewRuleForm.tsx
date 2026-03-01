'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createRule } from '@/lib/actions/rules'
import { Plus } from 'lucide-react'

export function NewRuleForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'financial',
    action: 'block',
    severity: 'medium',
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      await createRule({
        name: form.name,
        description: form.description || undefined,
        type: form.type as 'financial' | 'attendance' | 'discipline' | 'documentation',
        action: form.action as 'block' | 'warn' | 'notify',
        severity: form.severity as 'low' | 'medium' | 'high',
        trigger_condition: {},
        is_active: true,
      })
      toast.success('Regla creada')
      setOpen(false)
      setForm({ name: '', description: '', type: 'financial', action: 'block', severity: 'medium' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Nueva Regla</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nueva Regla</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Bloqueo por 2 meses de deuda" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="Detalle de cuándo se aplica..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <select id="type" value={form.type} onChange={(e) => set('type', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="financial">Financiero</option>
                <option value="attendance">Asistencia</option>
                <option value="discipline">Disciplina</option>
                <option value="documentation">Documentación</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="action">Acción</Label>
              <select id="action" value={form.action} onChange={(e) => set('action', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="block">Bloquear</option>
                <option value="warn">Advertencia</option>
                <option value="notify">Notificar</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="severity">Severidad</Label>
            <select id="severity" value={form.severity} onChange={(e) => set('severity', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear Regla'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
