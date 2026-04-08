import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  /** Contenido alineado a la derecha en desktop (badges, fecha, etc.) */
  endSlot?: ReactNode
  className?: string
  /** Cabecera centrada (p. ej. elegir plan) */
  centered?: boolean
}

/**
 * Cabecera estándar para sub-vistas del portal del atleta (alineada al estilo del dashboard).
 */
export function AthleteSectionHeader({
  title,
  description,
  icon: Icon,
  endSlot,
  className,
  centered,
}: Props) {
  const inner = (
    <>
      {Icon ? (
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" aria-hidden />
        </div>
      ) : null}
      <div className={cn('min-w-0', centered && 'flex flex-col items-center')}>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[1.05] text-foreground">
          {title}
        </h1>
        {description ? (
          <div
            className={cn(
              'text-sm md:text-base text-muted-foreground/80 mt-3 max-w-2xl font-medium space-y-1',
              centered && 'max-w-xl text-center',
            )}
          >
            {description}
          </div>
        ) : null}
      </div>
    </>
  )

  if (centered) {
    return (
      <div className={cn('flex flex-col items-center text-center gap-4', className)}>
        {inner}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col md:flex-row items-start md:items-end justify-between gap-6',
        className,
      )}
    >
      <div className="flex gap-4 min-w-0">{inner}</div>
      {endSlot ? <div className="shrink-0 flex flex-wrap items-center gap-2">{endSlot}</div> : null}
    </div>
  )
}
