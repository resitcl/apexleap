'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createDocument } from '@/lib/actions/documents'
import { Upload } from 'lucide-react'

const CATEGORIES = [
  { value: 'medical', label: 'Ficha médica' },
  { value: 'authorization', label: 'Autorización' },
  { value: 'institutional', label: 'Institucional' },
  { value: 'other', label: 'Otro' },
]

interface Props {
  athletes: { id: string; name: string }[]
}

export function NewDocumentForm({ athletes }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'medical',
    athlete_id: '',
    file_url: '',
    expiry_date: '',
    notes: '',
  })

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { toast.error('El nombre es requerido'); return }
    setLoading(true)
    try {
      await createDocument({
        name: form.name,
        category: form.category as 'medical' | 'authorization' | 'institutional' | 'other',
        athlete_id: form.athlete_id || null,
        file_url: form.file_url || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
        status: 'active',
      })
      toast.success('Documento registrado')
      setOpen(false)
      setForm({ name: '', category: 'medical', athlete_id: '', file_url: '', expiry_date: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Upload className="w-4 h-4" />Subir Documento</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Documento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ficha médica 2024..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoría</Label>
              <select id="category" value={form.category} onChange={(e) => set('category', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiry_date">Vencimiento</Label>
              <Input id="expiry_date" type="date" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} />
            </div>
          </div>

          {athletes.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="athlete_id">Alumno (opcional)</Label>
              <select id="athlete_id" value={form.athlete_id} onChange={(e) => set('athlete_id', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">— General del club —</option>
                {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="file_url">URL del archivo (opcional)</Label>
            <Input id="file_url" type="url" value={form.file_url} onChange={(e) => set('file_url', e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Observaciones opcionales..." />
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
