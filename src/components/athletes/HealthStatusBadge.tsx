'use client'

import { Badge } from "@/components/ui/badge"

interface Props {
  status: 'healthy' | 'injured' | 'observation'
  size?: 'sm' | 'md'
}

const config = {
  healthy: { label: '🟢 Apto', className: 'bg-green-100 text-green-800 border-green-200' },
  observation: { label: '🟡 Observación', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  injured: { label: '🔴 Lesionado', className: 'bg-red-100 text-red-800 border-red-200' },
}

export function HealthStatusBadge({ status }: Props) {
  const { label, className } = config[status] ?? config.healthy
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
