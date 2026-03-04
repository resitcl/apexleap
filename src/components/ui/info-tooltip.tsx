import { Info } from 'lucide-react'

interface InfoTooltipProps {
  text: string
  side?: 'top' | 'bottom'
}

export function InfoTooltip({ text, side = 'top' }: InfoTooltipProps) {
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
        className={`pointer-events-none absolute ${pos} left-1/2 -translate-x-1/2 z-50 w-52 rounded-lg border border-border bg-popover px-3 py-2 shadow-md opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150`}
      >
        <span className={arrow} />
        <p className="text-xs leading-relaxed text-popover-foreground">{text}</p>
      </span>
    </span>
  )
}
