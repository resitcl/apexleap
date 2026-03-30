'use client'

import { Badge } from "@/components/ui/badge"

interface Props {
  status: 'healthy' | 'injured' | 'observation'
  size?: 'sm' | 'md'
}

const config = {
  healthy: { label: '🟢 Apto', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40' },
  observation: { label: '🟡 Observación', className: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40' },
  injured: { label: '🔴 Lesionado', className: 'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40' },
}

export function HealthStatusBadge({ status }: Props) {
  const { label, className } = config[status] ?? config.healthy
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
