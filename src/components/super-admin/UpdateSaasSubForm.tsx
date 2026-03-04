'use client'

import { useState, useTransition } from 'react'
import { updateClubSaasSub } from '@/lib/actions/super-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react'

interface SaasPlan {
  id: string
  name: string
  slug: string
  price_monthly: number
  price_annual: number
}

interface Props {
  clubId: string
  saasPlans: SaasPlan[]
  currentSub: {
    saas_plan_id?: string
    status?: string
    billing_cycle?: string
    notes?: string
    current_period_end?: string
    trial_ends_at?: string
  } | null
}

const STATUSES = [
  { value: 'trialing',  label: 'Trial' },
  { value: 'active',    label: 'Activo' },
  { value: 'past_due',  label: 'Vencido' },
  { value: 'paused',    label: 'Pausado' },
  { value: 'cancelled', label: 'Cancelado' },
]

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

export function UpdateSaasSubForm({ clubId, saasPlans, currentSub }: Props) {
  const [planId,   setPlanId]   = useState(currentSub?.saas_plan_id  ?? '')
  const [status,   setStatus]   = useState(currentSub?.status        ?? 'active')
  const [cycle,    setCycle]    = useState(currentSub?.billing_cycle  ?? 'monthly')
  const [notes,    setNotes]    = useState(currentSub?.notes         ?? '')
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')
  const [isPending, start]      = useTransition()

  function handleSave() {
    if (!planId) { setError('Selecciona un plan'); return }
    setError('')
    setSaved(false)
    start(async () => {
      try {
        await updateClubSaasSub(clubId, {
          saas_plan_id:  planId,
          status,
          billing_cycle: cycle,
          notes:         notes || undefined,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al guardar')
      }
    })
  }

  const selectedPlan = saasPlans.find((p) => p.id === planId)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Suscripción SaaS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Plan selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Plan ApexLeap</label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— Sin plan —</option>
            {saasPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {fmt(p.price_monthly)}/mes
              </option>
            ))}
          </select>
          {selectedPlan && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Mensual: {fmt(selectedPlan.price_monthly)} · Anual: {fmt(selectedPlan.price_annual)}
            </p>
          )}
        </div>

        {/* Status + Cycle */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Ciclo</label>
            <select
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
          </div>
        </div>

        {/* Current period info */}
        {currentSub?.current_period_end && (
          <p className="text-xs text-muted-foreground">
            Período actual hasta:{' '}
            <strong>{new Date(currentSub.current_period_end).toLocaleDateString('es-CL')}</strong>
          </p>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Notas internas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: descuento especial, acuerdo comercial..."
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saved ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Guardado</>
          ) : 'Guardar cambios'}
        </button>
      </CardContent>
    </Card>
  )
}
