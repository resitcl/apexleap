'use client'

import { useRouter, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const STATUS_OPTIONS = [
  { value: 'pending',   label: '🟡 Pendiente' },
  { value: 'paid',      label: '🟢 Pagado' },
  { value: 'overdue',   label: '🔴 Vencido' },
  { value: 'cancelled', label: '⬜ Cancelado' },
]

interface Props {
  currentStatus?: string
}

export function PaymentsFilter({ currentStatus }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setStatus(value: string | null) {
    if (!value) {
      router.push(pathname)
    } else {
      router.push(`${pathname}?status=${value}`)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground">Filtrar:</span>
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setStatus(currentStatus === opt.value ? null : opt.value)}
        >
          <Badge variant={currentStatus === opt.value ? 'default' : 'outline'}>
            {opt.label}
          </Badge>
        </button>
      ))}
      {currentStatus && (
        <Button variant="ghost" size="sm" onClick={() => setStatus(null)} className="gap-1 text-muted-foreground">
          <X className="w-3 h-3" /> Limpiar
        </Button>
      )}
    </div>
  )
}
