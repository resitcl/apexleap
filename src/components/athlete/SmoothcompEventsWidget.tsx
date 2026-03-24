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
    <Card className="overflow-hidden animate-pulse">
      <div className="h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
          <Trophy className="w-3.5 h-3.5" /> Torneos en Chile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
      className="group flex items-start gap-3 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-1 px-1 rounded-md transition-colors"
    >
      {/* Thumbnail / date block */}
      {event.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.image}
          alt={event.name}
          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border/40"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sky-100 to-blue-100 flex flex-col items-center justify-center shrink-0 border border-sky-200/60">
          <span className="text-[10px] font-bold text-sky-700 uppercase leading-none">
            {startDateObj ? startDateObj.toLocaleDateString('es-CL', { month: 'short' }) : '–'}
          </span>
          <span className="text-lg font-black text-sky-800 leading-none">
            {startDateObj ? startDateObj.getDate() : '?'}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {event.name}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {dateLabel}
          </span>
          {event.city && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {event.city}
            </span>
          )}
        </div>
        {event.organizer && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{event.organizer}</p>
        )}
      </div>

      {/* Days left badge */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <Badge
          variant={isUrgent ? 'destructive' : 'secondary'}
          className="text-[10px] font-bold px-1.5 py-0.5"
        >
          {daysLabel}
        </Badge>
        <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </a>
  )
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export async function SmoothcompEventsWidget() {
  const events = await getSmoothcompChileEvents()

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
            <Trophy className="w-3.5 h-3.5 text-sky-500" />
            Torneos en Chile
          </CardTitle>
          <a
            href="https://smoothcomp.com/en/events/upcoming"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
          >
            Ver todos <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Vía Smoothcomp · actualizado cada 24 h</p>
      </CardHeader>

      <CardContent className="pb-3">
        {events.length > 0 ? (
          <div>
            {events.slice(0, 6).map((event) => (
              <EventRow key={event.url} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No se encontraron torneos próximos en Chile.</p>
            <a
              href="https://smoothcomp.com/en/events/upcoming"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              Buscar en Smoothcomp <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
