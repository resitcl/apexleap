'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { setAthleteBillingDay, type AthleteBillingInfo } from '@/lib/actions/athletes'

export function AthleteBillingDayControl({
  athleteId,
  initial,
}: {
  athleteId: string
  initial: AthleteBillingInfo
}) {
  const router = useRouter()
  const [info, setInfo] = useState<AthleteBillingInfo>(initial)
  const [day, setDay] = useState<number>(initial.anchorDay ?? 1)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!info.hasActiveSub) {
    return (
      <div>
        <p className="text-xs text-muted-foreground">Día de cobro</p>
        <p className="text-sm text-muted-foreground/70">Sin plan activo</p>
      </div>
    )
  }

  const nextText = info.nextBilling
    ? new Date(`${info.nextBilling}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  async function save() {
    setSaving(true)
    try {
      const res = await setAthleteBillingDay(athleteId, day)
      setInfo(res)
      setEditing(false)
      toast.success(`Día de cobro fijado al ${res.anchorDay}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">Día de cobro</p>
      {editing ? (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Día {d}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
          >
            {saving ? '…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setDay(info.anchorDay ?? 1) }}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="font-medium">{info.anchorDay ? `Día ${info.anchorDay} del mes` : 'No definido'}</p>
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">
            Editar
          </button>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">Próximo cobro: {nextText}</p>
    </div>
  )
}
