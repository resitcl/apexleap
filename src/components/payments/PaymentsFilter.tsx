'use client'

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const STATUS_OPTIONS = [
  { value: 'pending',   label: '🟡 Pendiente' },
  { value: 'paid',      label: '🟢 Pagado' },
  { value: 'overdue',   label: '🔴 Vencido' },
  { value: 'cancelled', label: '⬜ Cancelado' },
]

const METHOD_OPTIONS = [
  { value: 'cash',        label: '💵 Efectivo' },
  { value: 'transfer',    label: '🏦 Transferencia' },
  { value: 'card',        label: '💳 Tarjeta' },
  { value: 'webpay',      label: 'Webpay' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'flow',        label: 'Flow' },
]

interface Props {
  currentStatus?: string
  currentMethod?: string
}

export function PaymentsFilter({ currentStatus, currentMethod }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    params.delete('page')
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium">Estado:</span>
        {STATUS_OPTIONS.map((opt) => (
          <button key={opt.value}
            onClick={() => router.push(buildUrl({ status: currentStatus === opt.value ? null : opt.value }))}>
            <Badge variant={currentStatus === opt.value ? 'default' : 'outline'}>{opt.label}</Badge>
          </button>
        ))}
        {currentStatus && (
          <Button variant="ghost" size="sm" onClick={() => router.push(buildUrl({ status: null }))} className="gap-1 text-muted-foreground h-7">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium">Método:</span>
        {METHOD_OPTIONS.map((opt) => (
          <button key={opt.value}
            onClick={() => router.push(buildUrl({ paymentMethod: currentMethod === opt.value ? null : opt.value }))}>
            <Badge variant={currentMethod === opt.value ? 'default' : 'outline'} className="text-xs">{opt.label}</Badge>
          </button>
        ))}
        {currentMethod && (
          <Button variant="ghost" size="sm" onClick={() => router.push(buildUrl({ paymentMethod: null }))} className="gap-1 text-muted-foreground h-7">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
