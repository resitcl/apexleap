import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

interface InfoTooltipProps {
  /** Texto simple del tooltip. Se ignora si se pasa `children`. */
  text?: string
  /** Contenido enriquecido (listas, desgloses). Tiene prioridad sobre `text`. */
  children?: ReactNode
  side?: 'top' | 'bottom'
  /** Ancho del globo (clase Tailwind). Default w-52; usar más ancho para desgloses. */
  width?: string
}

export function InfoTooltip({ text, children, side = 'top', width = 'w-52' }: InfoTooltipProps) {
  const pos = side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
  const arrow = side === 'bottom'
    ? 'absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45 border border-b-0 border-r-0 bg-popover border-border'
    : 'absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 border border-t-0 border-l-0 bg-popover border-border'

  return (
    <span className="group/tip relative inline-flex items-center shrink-0">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground/50 hover:text-muted-foreground cursor-default transition-colors">
        <Info className="w-3.5 h-3.5" />
      </span>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${pos} left-1/2 -translate-x-1/2 z-50 ${width} max-w-[90vw] rounded-lg border border-border bg-popover px-3 py-2 shadow-md opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150`}
      >
        <span className={arrow} />
        {children ?? <p className="text-xs leading-relaxed text-popover-foreground">{text}</p>}
      </span>
    </span>
  )
}
