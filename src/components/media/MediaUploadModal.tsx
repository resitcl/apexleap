'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Plus, Youtube, Upload, Link2, Calendar, Star, Eye, Tag } from "lucide-react"
import { createMediaItem, type MediaInput } from "@/lib/actions/media"

type CategoryType = 'match' | 'highlight' | 'training' | 'technique' | 'analysis' | 'event' | 'promo' | 'photo' | 'other'

const CATEGORIES: { value: CategoryType; label: string; emoji: string; desc: string }[] = [
  { value: 'match',     label: 'Partido',       emoji: '⚽', desc: 'Videos de partidos completos' },
  { value: 'highlight', label: 'Highlight',     emoji: '✨', desc: 'Mejores momentos' },
  { value: 'training',  label: 'Entrenamiento', emoji: '🏋️', desc: 'Sesiones de práctica' },
  { value: 'technique', label: 'Técnica',       emoji: '🥋', desc: 'Movimientos y drills' },
  { value: 'analysis',  label: 'Análisis',      emoji: '📊', desc: 'Revisión táctica' },
  { value: 'event',     label: 'Evento',        emoji: '🎉', desc: 'Actividades especiales' },
  { value: 'promo',     label: 'Promocional',   emoji: '📣', desc: 'Marketing y RRSS' },
  { value: 'photo',     label: 'Fotografía',    emoji: '📸', desc: 'Galería de imágenes' },
  { value: 'other',     label: 'Otro',          emoji: '📁', desc: 'Contenido general' },
]

const VISIBILITY_OPTIONS = [
  { value: 'public',  label: 'Público',    desc: 'Visible para todos' },
  { value: 'members', label: 'Miembros',   desc: 'Solo atletas del club' },
  { value: 'coaches', label: 'Cuerpo Técnico', desc: 'Solo coaches y admin' },
  { value: 'private', label: 'Privado',    desc: 'Solo administradores' },
]

interface MediaUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MediaUploadModal({ open, onOpenChange }: MediaUploadModalProps) {
  const [loading, setLoading] = useState(false)
  const [sourceTab, setSourceTab] = useState<'youtube' | 'url'>('youtube')
  const [form, setForm] = useState({
    title: '',
    type: 'video' as 'video' | 'photo' | 'document',
    category: 'other' as CategoryType,
    url: '',
    thumbnail_url: '',
    description: '',
    is_public: true,
    source_type: 'youtube' as 'youtube' | 'vimeo' | 'upload' | 'external',
    media_date: new Date().toISOString().split('T')[0],
    tags: [] as string[],
    is_featured: false,
    visibility: 'public' as 'public' | 'members' | 'coaches' | 'private',
  })
  const [tagInput, setTagInput] = useState('')

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function addTag() {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      set('tags', [...form.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    set('tags', form.tags.filter((t) => t !== tag))
  }

  function detectSourceType(url: string): 'youtube' | 'vimeo' | 'external' {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
    if (url.includes('vimeo.com')) return 'vimeo'
    return 'external'
  }

  async function handleSave() {
    if (!form.title || !form.url) {
      toast.error('Título y URL son requeridos')
      return
    }
    setLoading(true)
    try {
      const sourceType = detectSourceType(form.url)
      const input: MediaInput = {
        title: form.title,
        type: form.type,
        category: form.category,
        url: form.url,
        is_public: form.is_public,
        is_featured: form.is_featured,
        visibility: form.visibility,
        tags: form.tags,
        source_type: sourceType,
        thumbnail_url: form.thumbnail_url || null,
        description: form.description || null,
        media_date: form.media_date || null,
        season_id: null,
        match_id: null,
        event_id: null,
        duration: null,
      }
      await createMediaItem(input)
      toast.success('Contenido agregado exitosamente')
      onOpenChange(false)
      setForm({
        title: '', type: 'video', category: 'other', url: '', thumbnail_url: '',
        description: '', is_public: true, source_type: 'youtube',
        media_date: new Date().toISOString().split('T')[0], tags: [],
        is_featured: false, visibility: 'public',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" /> Agregar Contenido
          </DialogTitle>
          <DialogDescription>
            Publica videos, fotos o enlaces para tu club en el Media Hub.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Source Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.04] rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setSourceTab('youtube')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                sourceTab === 'youtube' ? 'bg-red-500/20 text-red-400' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Youtube className="w-4 h-4" /> YouTube / Vimeo
            </button>
            <button
              type="button"
              onClick={() => setSourceTab('url')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                sourceTab === 'url' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Link2 className="w-4 h-4" /> URL Externa
            </button>
          </div>

          {/* YouTube/Vimeo Input */}
          {sourceTab === 'youtube' && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">URL del Video *</Label>
              <Input
                placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                value={form.url}
                onChange={(e) => set('url', e.target.value)}
                className="bg-white/[0.02] border-white/[0.08] h-11"
              />
              <p className="text-[10px] text-muted-foreground/60">Pega el enlace de YouTube o Vimeo. El thumbnail se generará automáticamente.</p>
            </div>
          )}

          {/* External URL Input */}
          {sourceTab === 'url' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de Archivo</Label>
                  <select
                    value={form.type}
                    onChange={(e) => set('type', e.target.value as 'video' | 'photo' | 'document')}
                    className="w-full h-11 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="video">🎬 Video</option>
                    <option value="photo">📷 Imagen</option>
                    <option value="document">📄 Documento</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">URL del Archivo *</Label>
                  <Input
                    placeholder="https://..."
                    value={form.url}
                    onChange={(e) => set('url', e.target.value)}
                    className="bg-white/[0.02] border-white/[0.08] h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Thumbnail URL (opcional)</Label>
                <Input
                  placeholder="https://... imagen de preview"
                  value={form.thumbnail_url}
                  onChange={(e) => set('thumbnail_url', e.target.value)}
                  className="bg-white/[0.02] border-white/[0.08] h-11"
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Título *</Label>
            <Input
              placeholder="Ej: Partido vs Club Rival - Semifinal 2024"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="bg-white/[0.02] border-white/[0.08] h-11 text-base font-medium"
            />
          </div>

          {/* Category Grid */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Categoría</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => set('category', cat.value)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    form.category === cat.value
                      ? 'bg-primary/10 border-primary/50 text-primary'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.15] text-muted-foreground'
                  }`}
                >
                  <span className="text-lg block mb-1">{cat.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide block">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Visibility Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Fecha del Contenido
              </Label>
              <Input
                type="date"
                value={form.media_date}
                onChange={(e) => set('media_date', e.target.value)}
                className="bg-white/[0.02] border-white/[0.08] h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Visibilidad
              </Label>
              <select
                value={form.visibility}
                onChange={(e) => set('visibility', e.target.value as typeof form.visibility)}
                className="w-full h-11 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {VISIBILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label} — {opt.desc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descripción (opcional)</Label>
            <Textarea
              placeholder="Describe el contenido brevemente..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="bg-white/[0.02] border-white/[0.08] min-h-[80px] resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Etiquetas
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Agregar etiqueta..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="bg-white/[0.02] border-white/[0.08] h-9 flex-1"
              />
              <Button type="button" size="sm" variant="outline" onClick={addTag} className="h-9">
                Agregar
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Featured Toggle */}
          <label className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-primary/30 transition-colors">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => set('is_featured', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/[0.04] text-primary focus:ring-primary/50"
            />
            <div className="flex-1">
              <p className="text-sm font-bold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Marcar como Destacado
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">Aparecerá en la sección destacados del Media Hub</p>
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !form.title || !form.url} className="gap-2">
            {loading ? 'Guardando...' : <><Upload className="w-4 h-4" /> Publicar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MediaUploadButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" className="gap-2 h-10 px-5" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Agregar Contenido
      </Button>
      <MediaUploadModal open={open} onOpenChange={setOpen} />
    </>
  )
}
