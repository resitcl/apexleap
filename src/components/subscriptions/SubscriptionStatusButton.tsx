'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateSubscriptionStatus } from "@/lib/actions/subscriptions"
import { ChevronDown, Play, Pause, XCircle } from "lucide-react"

type Status = "active" | "paused" | "cancelled" | "expired"

interface Props {
  subscriptionId: string
  currentStatus: Status
}

const ACTIONS: { status: Status; label: string; icon: React.ReactNode; show: Status[] }[] = [
  { status: "active",    label: "Activar",    icon: <Play    className="w-3.5 h-3.5" />, show: ["paused", "expired"] },
  { status: "paused",    label: "Pausar",     icon: <Pause   className="w-3.5 h-3.5" />, show: ["active"] },
  { status: "cancelled", label: "Cancelar",   icon: <XCircle className="w-3.5 h-3.5" />, show: ["active", "paused"] },
]

export function SubscriptionStatusButton({ subscriptionId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const available = ACTIONS.filter((a) => a.show.includes(currentStatus))
  if (available.length === 0) return null

  async function handle(status: Status) {
    setLoading(true)
    try {
      await updateSubscriptionStatus(subscriptionId, status)
      toast.success("Suscripción actualizada")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading} className="gap-1 h-8 px-2">
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {available.map((a) => (
          <DropdownMenuItem key={a.status} onClick={() => handle(a.status)} className="gap-2 cursor-pointer">
            {a.icon} {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
