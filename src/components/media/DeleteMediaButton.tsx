'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { deleteMediaItem } from "@/lib/actions/media"

interface Props {
  id: string
  title: string
}

export function DeleteMediaButton({ id, title }: Props) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    if (!confirm(`¿Eliminar "${title}"?`)) return
    setLoading(true)
    try {
      await deleteMediaItem(id)
      toast.success('Contenido eliminado')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="w-7 h-7 rounded flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}
