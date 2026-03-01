'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createInjury } from '@/lib/actions/injuries'
import { AlertTriangle } from 'lucide-react'

const SEVERITIES = [
  { value: 'low',    label: 'Leve' },
  { value: 'medium', label: 'Moderada' },
  { value: 'high',   label: 'Grave' },
]

const BODY_PARTS = [
  'Rodilla', 'Tobillo', 'Hombro', 'Espalda', 'Cadera', 'Muslo',
  'Pantorrilla', 'Muñeca', 'Codo', 'Cuello', 'Costillas', 'Otro',
]

export function LogInjuryForm({ athleteId }: { athleteId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    diagnosis: '', severity: 'medium', body_part: '',
    start_date: new Date().toISOString().split('T')[0],
    estimated_recovery: '', notes: '',
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.diagnosis) { toast.error('El diagnóstico es requerido'); return }
    if (!form.start_date) { toast.error('La fecha de inicio es requerida'); return }
    setLoading(true)
    try {
      await createInjury({
        athlete_id: athleteId,
        diagnosis: form.diagnosis,
        severity: form.severity as 'low' | 'medium' | 'high',
        body_part: form.body_part || null,
        start_date: form.start_date,
        estimated_recovery: form.estimated_recovery || null,
        notes: form.notes || null,
      })
      toast.success('Lesión registrada — semáforo actualizado a 🔴')
      setOpen(false)
      setForm({ diagnosis: '', severity: 'medium', body_part: '', start_date: new Date().toISOString().split('T')[0], estimated_recovery: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-yellow-700 border-yellow-300 hover:bg-yellow-50">
          <AlertTriangle className="w-3.5 h-3.5" />
          Registrar Lesión
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Lesión</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="diagnosis">Diagnóstico *</Label>
            <Input id="diagnosis" value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)}
              placeholder="Esguince de tobillo, desgarro muscular..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Severidad</Label>
              <select value={form.severity} onChange={(e) => set('severity', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Zona del cuerpo</Label>
              <select value={form.body_part} onChange={(e) => set('body_part', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— Seleccionar —</option>
                {BODY_PARTS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Fecha inicio *</Label>
              <Input id="start_date" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estimated_recovery">Alta estimada</Label>
              <Input id="estimated_recovery" type="date" value={form.estimated_recovery} onChange={(e) => set('estimated_recovery', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas clínicas</Label>
            <textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Tratamiento, medicación, restricciones..." />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              {loading ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
