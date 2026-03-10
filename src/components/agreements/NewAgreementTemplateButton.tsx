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
import { Plus, FileText } from 'lucide-react'
import { createAgreementTemplate } from '@/lib/actions/agreements'

export function NewAgreementTemplateButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [isRequired, setIsRequired] = useState(true)
  const [validMonths, setValidMonths] = useState<number | ''>('')

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
      await createAgreementTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        is_required_for_enrollment: isRequired,
        valid_months: validMonths ? Number(validMonths) : null,
      })
      toast.success('Template creado exitosamente')
      setOpen(false)
      resetForm()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear template')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName('')
    setDescription('')
    setContent('')
    setIsRequired(true)
    setValidMonths('')
  }

  const defaultTemplate = `ACUERDO DE TÉRMINOS Y CONDICIONES

Yo, {{athlete_name}}, RUT {{athlete_rut}}, declaro que:

1. ACEPTACIÓN DE TÉRMINOS
Acepto los términos y condiciones establecidos por {{club_name}} para la práctica deportiva en sus instalaciones.

2. RESPONSABILIDAD
Entiendo que la práctica deportiva conlleva riesgos inherentes y asumo la responsabilidad de mi participación.

3. NORMAS DEL CLUB
Me comprometo a respetar las normas internas del club, incluyendo:
- Horarios de entrenamiento
- Uso adecuado de instalaciones
- Respeto hacia instructores y compañeros
- Pago puntual de cuotas

4. PAGOS
Acepto las condiciones de pago establecidas y entiendo que el incumplimiento puede resultar en la suspensión de mi membresía.

5. DATOS PERSONALES
Autorizo el uso de mis datos personales para fines administrativos del club.

Fecha: {{current_date}}

Este documento tiene validez legal según la Ley 19.799 de Firma Electrónica.`

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Nuevo Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Nuevo Template de Acuerdo
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Template *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Acuerdo de Inscripción"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descripción del documento"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="content">Contenido del Documento *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setContent(defaultTemplate)}
                >
                  Usar plantilla base
                </Button>
              </div>
              <textarea
                id="content"
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                placeholder="Escribe el contenido del acuerdo. Usa {{variable}} para datos dinámicos."
                rows={12}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm resize-y min-h-[200px] focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Variables: {'{{athlete_name}}'}, {'{{athlete_rut}}'}, {'{{club_name}}'}, {'{{current_date}}'}, etc.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="required">Requerido para inscripción</Label>
                  <p className="text-xs text-muted-foreground">
                    El atleta debe firmar antes de entrenar
                  </p>
                </div>
                <Switch
                  id="required"
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validMonths">Validez (meses)</Label>
                <Input
                  id="validMonths"
                  type="number"
                  min={1}
                  max={120}
                  value={validMonths}
                  onChange={(e) => setValidMonths(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Vacío = permanente"
                />
                <p className="text-xs text-muted-foreground">
                  Dejar vacío para validez permanente
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creando...' : 'Crear Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
