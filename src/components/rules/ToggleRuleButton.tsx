'use client'

import { useState } from "react"
import { toast } from "sonner"
import { toggleRule } from "@/lib/actions/rules"

interface Props {
  ruleId: string
  isActive: boolean
}

export function ToggleRuleButton({ ruleId, isActive }: Props) {
  const [active, setActive] = useState(isActive)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    try {
      await toggleRule(ruleId, !active)
      setActive((v) => !v)
      toast.success(active ? "Regla desactivada" : "Regla activada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cambiar estado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
        active ? "bg-primary" : "bg-muted"
      } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}
