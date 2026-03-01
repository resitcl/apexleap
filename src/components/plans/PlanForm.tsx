'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createPlan, updatePlan } from '@/lib/actions/plans'
import type { PlanInput } from '@/lib/actions/plans'

const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  enrollment_fee: z.coerce.number().min(0).default(0),
  billing_cycle: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'single']),
  session_limit: z.coerce.number().int().positive().optional().nullable(),
  multi_sede: z.boolean().default(false),
  content_level: z.string().optional().nullable(),
  grace_period_days: z.coerce.number().int().min(0).default(3),
  is_visible: z.boolean().default(true),
  is_active: z.boolean().default(true),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  planId?: string
  defaultValues?: Partial<FormValues>
}

export function PlanForm({ planId, defaultValues }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = !!planId

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      enrollment_fee: 0,
      billing_cycle: 'monthly',
      session_limit: undefined,
      multi_sede: false,
      content_level: '',
      grace_period_days: 3,
      is_visible: true,
      is_active: true,
      ...defaultValues,
    },
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const input: PlanInput = {
        ...values,
        session_limit: values.session_limit || null,
        content_level: values.content_level || null,
      }

      if (isEditing) {
        await updatePlan(planId, input)
        toast.success('Plan actualizado correctamente')
        router.push(`/dashboard/plans/${planId}`)
      } else {
        const plan = await createPlan(input)
        toast.success('Plan creado correctamente')
        router.push(`/dashboard/plans/${plan.id}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Info básica */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del Plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Nombre del plan *</Label>
            <Input id="name" {...form.register('name')} placeholder="Ej: Plan Básico Mensual" />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              {...form.register('description')}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Describe qué incluye este plan..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Precio *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input id="price" type="number" className="pl-7" {...form.register('price')} min="0" step="100" />
            </div>
            {form.formState.errors.price && (
              <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enrollment_fee">Matrícula (pago inicial)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input id="enrollment_fee" type="number" className="pl-7" {...form.register('enrollment_fee')} min="0" step="100" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="billing_cycle">Ciclo de Facturación</Label>
            <select
              id="billing_cycle"
              {...form.register('billing_cycle')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="semiannual">Semestral</option>
              <option value="annual">Anual</option>
              <option value="single">Pago único</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grace_period_days">Días de gracia post-vencimiento</Label>
            <Input id="grace_period_days" type="number" {...form.register('grace_period_days')} min="0" />
          </div>
        </CardContent>
      </Card>

      {/* Reglas de acceso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reglas de Acceso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="session_limit">Límite de sesiones por ciclo</Label>
            <Input
              id="session_limit"
              type="number"
              {...form.register('session_limit')}
              min="1"
              placeholder="Dejar vacío = ilimitado"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content_level">Nivel de contenido</Label>
            <select
              id="content_level"
              {...form.register('content_level')}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sin restricción</option>
              <option value="basic">Básico</option>
              <option value="intermediate">Intermedio</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...form.register('multi_sede')} className="w-4 h-4" />
              <div>
                <p className="font-medium text-sm">Acceso Multisede</p>
                <p className="text-xs text-muted-foreground">El alumno puede entrenar en cualquier sucursal</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...form.register('is_visible')} className="w-4 h-4" />
              <div>
                <p className="font-medium text-sm">Visible en catálogo</p>
                <p className="text-xs text-muted-foreground">Mostrar para compra online</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...form.register('is_active')} className="w-4 h-4" />
              <div>
                <p className="font-medium text-sm">Plan activo</p>
                <p className="text-xs text-muted-foreground">Deshabilitar para dejar de venderlo</p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Plan'}
        </Button>
      </div>
    </form>
  )
}
