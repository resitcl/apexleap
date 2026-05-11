'use client'

import { useEffect, useState } from 'react'

const CHILE_TZ = 'America/Santiago'

function formatParts(d: Date) {
  const time = new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
  const date = new Intl.DateTimeFormat('es-CL', {
    timeZone: CHILE_TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d)
  return { time, date }
}

/** Fecha y hora en Chile (America/Santiago), al lado de la campana en el header de staff. */
export function ChileDateTimeHeader() {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  if (now == null) {
    return (
      <div
        className="hidden sm:flex flex-col items-end justify-center text-right shrink-0 min-w-[7.5rem] h-10"
        aria-hidden
      />
    )
  }

  const { time, date } = formatParts(new Date(now))

  return (
    <div
      className="hidden sm:flex flex-col items-end justify-center text-right shrink-0 min-w-[7.5rem] tabular-nums"
      title={`Hora Chile (${CHILE_TZ})`}
    >
      <span className="text-xs font-semibold text-foreground leading-tight">{time}</span>
      <span className="text-[10px] text-muted-foreground leading-tight capitalize">{date}</span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Chile</span>
    </div>
  )
}
