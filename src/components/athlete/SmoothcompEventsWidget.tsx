/**
 * SmoothcompEventsWidget — shows upcoming BJJ tournaments in Chile.
 * Async server component; wrap in <Suspense> to avoid blocking page render.
 */

import { getSmoothcompChileEvents, type SmoothcompEvent } from '@/lib/smoothcomp'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, ExternalLink, Trophy } from 'lucide-react'

// ─── Skeleton (used as Suspense fallback) ─────────────────────────────────────
export function SmoothcompEventsSkeleton() {
  return (
    <div className="sport-card animate-pulse" style={{ '--sport-accent': '#0ea5e9' } as React.CSSProperties}>
      <div className="pb-4">
        <p className="text-base font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
          <Trophy className="w-5 h-5" /> Torneos en Chile
        </p>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-14 h-14 rounded-xl bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Single event row ─────────────────────────────────────────────────────────
function EventRow({ event }: { event: SmoothcompEvent }) {
  const startDateObj = event.startDate ? new Date(event.startDate) : null
  const dateLabel = startDateObj
    ? startDateObj.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'long' })
    : '–'

  const daysLabel =
    event.daysLeft === 0 ? '¡Hoy!' :
    event.daysLeft === 1 ? 'Mañana' :
    `${event.daysLeft}d`

  const isUrgent = event.daysLeft <= 14

  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 py-4 border-b border-border/30 dark:border-white/[0.04] last:border-0 hover:bg-muted/30 dark:hover:bg-white/[0.03] transition-colors rounded-2xl px-3 -mx-3"
    >
      {/* Thumbnail / date block */}
      {event.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.image}
          alt={event.name}
          className="w-14 h-14 rounded-xl object-cover shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-sky-500/15 flex flex-col items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase leading-none">
            {startDateObj ? startDateObj.toLocaleDateString('es-CL', { month: 'short' }) : '–'}
          </span>
          <span className="text-xl font-black text-sky-800 dark:text-sky-300 leading-none mt-0.5">
            {startDateObj ? startDateObj.getDate() : '?'}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {event.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          <span className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {dateLabel}
          </span>
          {event.city && (
            <span className="text-xs font-medium text-muted-foreground/80 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {event.city}
            </span>
          )}
        </div>
      </div>

      {/* Days left badge */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        <Badge
          variant={isUrgent ? 'destructive' : 'secondary'}
          className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wider ${isUrgent ? '' : 'bg-muted/50 dark:bg-white/[0.05] text-muted-foreground'}`}
        >
          {daysLabel}
        </Badge>
        <ExternalLink className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </a>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export async function SmoothcompEventsWidget() {
  const events = await getSmoothcompChileEvents()

  return (
    <div className="sport-card" style={{ '--sport-accent': '#0ea5e9' } as React.CSSProperties}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-base font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-sky-500" />
            Torneos en Chile
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">Vía Smoothcomp</p>
        </div>
        <a
          href="https://smoothcomp.com/en/events/upcoming"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary font-bold hover:gap-1.5 transition-all inline-flex items-center gap-1"
        >
          Ver todos <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="pt-2">
        {events.length > 0 ? (
          <div className="space-y-1">
            {events.slice(0, 6).map((event) => (
              <EventRow key={event.url} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-muted/20 dark:bg-white/[0.02] rounded-2xl">
            <p className="text-base font-medium text-muted-foreground">No se encontraron torneos próximos en Chile.</p>
            <a
              href="https://smoothcomp.com/en/events/upcoming"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary font-bold hover:gap-2 transition-all"
            >
              Buscar en Smoothcomp <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
