'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, GripVertical, Check, X, Loader2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { createCategory, updateCategory, deleteCategory, type ClubCategory } from '@/lib/actions/categories'

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
]

interface Props {
  initialCategories: ClubCategory[]
}

export function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [isPending, start] = useTransition()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [newDesc, setNewDesc] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editDesc, setEditDesc] = useState('')

  function startEdit(cat: ClubCategory) {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color ?? '#6366f1')
    setEditDesc(cat.description ?? '')
  }

  function cancelEdit() { setEditingId(null) }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { toast.error('El nombre es obligatorio'); return }
    start(async () => {
      try {
        const created = await createCategory({
          name: newName.trim(),
          color: newColor,
          description: newDesc || null,
          sort_order: categories.length,
          is_active: true,
        })
        setCategories((p) => [...p, created as unknown as ClubCategory])
        setNewName(''); setNewDesc(''); setNewColor('#6366f1')
        setCreating(false)
        toast.success('Categoría creada')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al crear')
      }
    })
  }

  function handleUpdate(id: string) {
    if (!editName.trim()) { toast.error('El nombre es obligatorio'); return }
    start(async () => {
      try {
        await updateCategory(id, { name: editName.trim(), color: editColor, description: editDesc || null })
        setCategories((p) => p.map((c) => c.id === id ? { ...c, name: editName.trim(), color: editColor, description: editDesc || null } : c))
        setEditingId(null)
        toast.success('Categoría actualizada')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al actualizar')
      }
    })
  }

  function handleToggleActive(cat: ClubCategory) {
    start(async () => {
      try {
        await updateCategory(cat.id, { is_active: !cat.is_active })
        setCategories((p) => p.map((c) => c.id === cat.id ? { ...c, is_active: !cat.is_active } : c))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      }
    })
  }

  function handleDelete(id: string) {
    start(async () => {
      try {
        await deleteCategory(id)
        setCategories((p) => p.filter((c) => c.id !== id))
        toast.success('Categoría eliminada')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categorías del Club
            </CardTitle>
            <CardDescription className="mt-1">
              Define las categorías (Sub-12, Senior, Damas, etc.) que se usarán en jugadores y campeonatos.
            </CardDescription>
          </div>
          {!creating && (
            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setCreating(true)}>
              <Plus className="w-3.5 h-3.5" />
              Nueva
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Create form */}
        {creating && (
          <form onSubmit={handleCreate} className="border border-primary/40 rounded-xl p-4 bg-primary/5 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Nueva categoría</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Sub-18, Senior, Damas..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${newColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color" value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                  title="Color personalizado"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Crear
              </Button>
            </div>
          </form>
        )}

        {/* Category list */}
        {categories.length === 0 && !creating ? (
          <div className="py-10 text-center text-muted-foreground border border-dashed rounded-xl">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin categorías definidas</p>
            <p className="text-xs mt-0.5">Crea categorías como Sub-12, Senior, Damas, etc.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-opacity ${!cat.is_active ? 'opacity-40' : ''}`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />

                {/* Color dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color ?? '#6366f1' }}
                />

                {editingId === cat.id ? (
                  /* Edit inline */
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm flex-1 min-w-24"
                    />
                    <Input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Descripción"
                      className="h-7 text-sm flex-1 min-w-24"
                    />
                    <div className="flex items-center gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c} type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-4 h-4 rounded-full border transition-transform ${editColor === c ? 'border-foreground scale-125' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <Button size="icon" className="h-7 w-7" onClick={() => handleUpdate(cat.id)} disabled={isPending}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  /* Display */
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{cat.name}</span>
                    {cat.description && (
                      <span className="text-xs text-muted-foreground ml-2">{cat.description}</span>
                    )}
                  </div>
                )}

                {editingId !== cat.id && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                        cat.is_active
                          ? 'border-green-300 text-green-700 bg-green-50 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                          : 'border-muted text-muted-foreground hover:bg-green-50 hover:text-green-700'
                      }`}
                      title={cat.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {cat.is_active ? 'Activa' : 'Inactiva'}
                    </button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(cat)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(cat.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
