'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { createMediaItem } from "@/lib/actions/media"

const CATEGORIES = [
  { value: 'match',     label: 'Partido' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'training',  label: 'Entrenamiento' },
  { value: 'photo',     label: 'Foto' },
  { value: 'other',     label: 'Otro' },
]

export function NewMediaButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', type: 'video' as 'video' | 'photo' | 'document',
    category: 'other' as 'match' | 'highlight' | 'training' | 'photo' | 'other',
    url: '', thumbnail_url: '', description: '', is_public: false,
  })

  function set(k: string, v: string | boolean) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.title || !form.url) { toast.error('Título y URL son requeridos'); return }
    setLoading(true)
    try {
      await createMediaItem({ ...form, thumbnail_url: form.thumbnail_url || null, description: form.description || null })
      toast.success('Contenido agregado')
      setOpen(false)
      setForm({ title: '', type: 'video', category: 'other', url: '', thumbnail_url: '', description: '', is_public: false })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Agregar Contenido
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Agregar Contenido</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <select value={form.type} onChange={(e) => set('type', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="video">Video</option>
                  <option value="photo">Foto</option>
                  <option value="document">Documento</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Categoría</Label>
                <select value={form.category} onChange={(e) => set('category', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input placeholder="Ej: Gol de la temporada" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>URL *</Label>
              <Input placeholder="https://youtube.com/watch?v=..." value={form.url} onChange={(e) => set('url', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Thumbnail URL (opcional)</Label>
              <Input placeholder="https://..." value={form.thumbnail_url} onChange={(e) => set('thumbnail_url', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Descripción (opcional)</Label>
              <Input placeholder="Breve descripción..." value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.is_public} onChange={(e) => set('is_public', e.target.checked)} className="w-4 h-4 rounded" />
              Visible para todos los atletas
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading || !form.title || !form.url}>
              {loading ? 'Guardando...' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
