'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, X, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createSupplier, updateSupplier, SUPPLIER_CATEGORIES, type SupplierInput } from '@/lib/actions/suppliers'

type Supplier = {
  id: string
  name: string
  rut: string | null
  bank_name: string | null
  account_type: string | null
  account_number: string | null
  email: string | null
  phone: string | null
  category: string
  notes: string | null
  is_active: boolean
}

interface Props {
  supplier?: Supplier
  mode?: 'create' | 'edit'
}

const ACCOUNT_TYPES = [
  { value: 'corriente', label: 'Cuenta Corriente' },
  { value: 'vista',     label: 'Cuenta Vista' },
  { value: 'ahorro',    label: 'Cuenta de Ahorro' },
  { value: 'rut',       label: 'Cuenta RUT' },
  { value: 'otra',      label: 'Otra' },
]

const BLANK: SupplierInput = {
  name: '', rut: '', bank_name: '', account_type: null,
  account_number: '', email: '', phone: '', category: 'other',
  notes: '', is_active: true,
}

export function NewSupplierButton({ supplier, mode = 'create' }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, start] = useTransition()
  const [form, setForm] = useState<SupplierInput>(
    supplier ? {
      name:           supplier.name,
      rut:            supplier.rut ?? '',
      bank_name:      supplier.bank_name ?? '',
      account_type:   supplier.account_type as SupplierInput['account_type'] ?? null,
      account_number: supplier.account_number ?? '',
      email:          supplier.email ?? '',
      phone:          supplier.phone ?? '',
      category:       supplier.category,
      notes:          supplier.notes ?? '',
      is_active:      supplier.is_active,
    } : { ...BLANK }
  )

  function set<K extends keyof SupplierInput>(k: K, v: SupplierInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function reset() { setForm({ ...BLANK }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    start(async () => {
      try {
        const payload: SupplierInput = {
          ...form,
          rut:            form.rut            || null,
          bank_name:      form.bank_name      || null,
          account_number: form.account_number || null,
          email:          form.email          || null,
          phone:          form.phone          || null,
          notes:          form.notes          || null,
        }
        if (mode === 'edit' && supplier) {
          await updateSupplier(supplier.id, payload)
          toast.success('Proveedor actualizado')
        } else {
          await createSupplier(payload)
          toast.success('Proveedor creado')
          reset()
        }
        setOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error inesperado')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'edit' ? (
          <Button variant="ghost" size="sm" className="gap-1 h-8 px-2">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {mode === 'edit' ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Datos básicos */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Nombre / Empresa *</Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Cancha Municipal, Deportes XYZ, ..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>RUT</Label>
              <Input
                value={form.rut ?? ''}
                onChange={(e) => set('rut', e.target.value)}
                placeholder="12.345.678-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="contacto@proveedor.cl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </div>
          </div>

          {/* Datos bancarios */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datos de Transferencia</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Banco</Label>
                <Input
                  value={form.bank_name ?? ''}
                  onChange={(e) => set('bank_name', e.target.value)}
                  placeholder="Banco Estado, Santander, ..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de cuenta</Label>
                <select
                  value={form.account_type ?? ''}
                  onChange={(e) => set('account_type', (e.target.value || null) as SupplierInput['account_type'])}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Sin especificar —</option>
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label>Número de cuenta</Label>
                <Input
                  value={form.account_number ?? ''}
                  onChange={(e) => set('account_number', e.target.value)}
                  placeholder="00123456789"
                />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Observaciones, condiciones de pago, etc."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Estado */}
          {mode === 'edit' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Proveedor activo</Label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'edit' ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
