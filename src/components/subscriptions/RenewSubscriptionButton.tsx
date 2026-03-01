'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { renewSubscription } from "@/lib/actions/subscriptions"

interface Props {
  subscriptionId: string
}

export function RenewSubscriptionButton({ subscriptionId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleRenew() {
    if (!confirm('¿Renovar esta suscripción? Se creará una nueva suscripción activa con el mismo plan desde hoy.')) return
    setLoading(true)
    try {
      await renewSubscription(subscriptionId)
      toast.success('Suscripción renovada exitosamente')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al renovar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRenew}
      disabled={loading}
      className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      {loading ? 'Renovando...' : 'Renovar'}
    </Button>
  )
}
