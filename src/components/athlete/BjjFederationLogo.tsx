import { Landmark } from 'lucide-react'
import { resolveBjjFederationLogoSrc } from '@/lib/bjj-federation-logos'

interface Props {
  federation: string
  className?: string
}

/**
 * Badge visual para federación/circuito BJJ en cards de torneos.
 */
export function BjjFederationLogo({ federation, className }: Props) {
  const src = resolveBjjFederationLogoSrc(federation)

  if (!src) {
    return (
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground ${className ?? ''}`}
        title={federation || 'Federación'}
      >
        <Landmark className="h-5 w-5" aria-hidden />
      </div>
    )
  }

  return (
    <div className={`relative h-12 w-[7.5rem] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-sm ${className ?? ''}`}>
      <img src={src} alt="" className="h-full w-full object-cover object-center" />
      <span className="sr-only">{federation}</span>
    </div>
  )
}
