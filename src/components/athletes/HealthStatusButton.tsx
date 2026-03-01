'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateAthlete } from '@/lib/actions/athletes'
import { ChevronDown } from 'lucide-react'

type HealthStatus = 'healthy' | 'injured' | 'observation'

const STATUS_META: Record<HealthStatus, { label: string; emoji: string; color: string }> = {
  healthy:     { label: 'Saludable',   emoji: '🟢', color: 'text-green-700' },
  observation: { label: 'Observación', emoji: '🟡', color: 'text-yellow-700' },
  injured:     { label: 'Lesionado',   emoji: '🔴', color: 'text-red-700' },
}

interface Props {
  athleteId: string
  current: HealthStatus
}

export function HealthStatusButton({ athleteId, current }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<HealthStatus>(current)
  const meta = STATUS_META[status]

  async function change(next: HealthStatus) {
    if (next === status) return
    setLoading(true)
    try {
      await updateAthlete(athleteId, { health_status: next })
      setStatus(next)
      toast.success(`Estado actualizado: ${STATUS_META[next].label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}
          className={`gap-2 text-xs h-7 ${meta.color}`}>
          <span>{meta.emoji}</span>
          {meta.label}
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(STATUS_META) as [HealthStatus, typeof meta][]).map(([key, m]) => (
          <DropdownMenuItem key={key} onClick={() => change(key)}
            className={`gap-2 ${key === status ? 'font-semibold' : ''}`}>
            <span>{m.emoji}</span>
            {m.label}
            {key === status && <span className="ml-auto text-xs text-muted-foreground">actual</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
