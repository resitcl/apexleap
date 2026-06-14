'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCoachPermissions } from '@/lib/actions/settings'
import type { CoachPermissions, CoachCapability } from '@/lib/actions/club-context'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, CreditCard, ShieldCheck, Settings as SettingsIcon, Users } from 'lucide-react'

const CAPABILITIES: {
  key: CoachCapability
  label: string
  hint: string
  icon: React.ReactNode
}[] = [
  { key: 'finances',    label: 'Finanzas y cobranza',     hint: 'Pagos, suscripciones, planes, gastos y proveedores.', icon: <CreditCard className="w-4 h-4" /> },
  { key: 'rules',       label: 'Reglas de gobernanza',    hint: 'Crear, editar y activar reglas del club.',            icon: <ShieldCheck className="w-4 h-4" /> },
  { key: 'club_config', label: 'Configuración del club',  hint: 'Información general del club y landing page.',         icon: <SettingsIcon className="w-4 h-4" /> },
  { key: 'team',        label: 'Gestión de equipo',       hint: 'Invitar, revocar y quitar miembros del staff.',       icon: <Users className="w-4 h-4" /> },
]

export function CoachPermissionsForm({ initial }: { initial: CoachPermissions }) {
  const router = useRouter()
  const [perms, setPerms] = useState<CoachPermissions>(initial)
  const [pending, startTransition] = useTransition()

  const toggle = (key: CoachCapability) => setPerms((p) => ({ ...p, [key]: !p[key] }))

  const save = () => {
    startTransition(async () => {
      try {
        await updateCoachPermissions(perms)
        toast.success('Permisos de entrenadores actualizados')
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground/80">
        Por defecto, los entrenadores (coach) <strong className="text-foreground">no</strong> pueden gestionar
        finanzas ni configuración del club. Activa aquí las capacidades que quieras delegar. Los administradores
        siempre tienen acceso completo.
      </p>
      <div className="space-y-2">
        {CAPABILITIES.map((c) => (
          <div
            key={c.key}
            className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {c.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">{c.label}</p>
                <p className="text-xs text-muted-foreground/70">{c.hint}</p>
              </div>
            </div>
            <Switch
              checked={perms[c.key]}
              onCheckedChange={() => toggle(c.key)}
              disabled={pending}
              aria-label={c.label}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando…
            </>
          ) : (
            'Guardar permisos'
          )}
        </Button>
      </div>
    </div>
  )
}
