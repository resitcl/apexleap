'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Pencil, FileText } from 'lucide-react'
import { updateAgreementTemplate, type AgreementTemplate } from '@/lib/actions/agreements'

interface Props {
  template: AgreementTemplate
}

export function EditAgreementTemplateButton({ template }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? '')
  const [content, setContent] = useState(template.content)
  const [isActive, setIsActive] = useState(template.is_active)
  const [isRequired, setIsRequired] = useState(template.is_required_for_enrollment)
  const [validMonths, setValidMonths] = useState<number | ''>(template.valid_months ?? '')

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    if (!content.trim()) {
      toast.error('El contenido es requerido')
      return
    }

    setLoading(true)
    try {
      await updateAgreementTemplate(template.id, {
        name: name.trim(),
        description: description.trim() || null,
        content: content.trim(),
        is_active: isActive,
        is_required_for_enrollment: isRequired,
        valid_months: validMonths ? Number(validMonths) : null,
      })
      toast.success('Template actualizado')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <Pencil className="w-3 h-3" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Editar Template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre del Template *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Contenido del Documento *</Label>
              <textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm resize-y min-h-[200px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                ⚠️ Cambiar el contenido creará una nueva versión (v{template.version + 1})
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Activo</Label>
                  <p className="text-xs text-muted-foreground">
                    Disponible para nuevas firmas
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Requerido</Label>
                  <p className="text-xs text-muted-foreground">
                    Obligatorio para inscripción
                  </p>
                </div>
                <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-validMonths">Validez (meses)</Label>
              <Input
                id="edit-validMonths"
                type="number"
                min={1}
                max={120}
                value={validMonths}
                onChange={(e) => setValidMonths(e.target.value ? Number(e.target.value) : '')}
                placeholder="Vacío = permanente"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
