'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'
import { toast } from 'sonner'
import { toggleMediaLandingFeatured } from '@/lib/actions/media'

interface Props {
  id: string
  initialFeatured: boolean
}

export function LandingFeaturedButton({ id, initialFeatured }: Props) {
  const [featured, setFeatured] = useState(initialFeatured)
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    const next = !featured
    const result = await toggleMediaLandingFeatured(id, next)
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error)
    } else {
      setFeatured(next)
      toast.success(next ? 'Publicado en landing' : 'Quitado del landing')
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      title={featured ? 'Quitar del landing' : 'Publicar en landing'}
      className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
        featured
          ? 'text-primary bg-primary/10 hover:bg-primary/20'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      <Globe className="w-3.5 h-3.5" />
    </button>
  )
}
