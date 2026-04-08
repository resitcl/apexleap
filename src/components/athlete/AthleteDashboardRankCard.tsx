import type { CSSProperties } from 'react'
import { BeltSVG, getBeltColor, isLightBelt } from '@/components/athlete/belt-visual'
import { getSportFieldDisplayValue } from '@/lib/sport-fields'

const BELT_SPORTS = ['Jiu-Jitsu', 'Karate', 'Taekwondo', 'Judo'] as const

function parseStripes(raw: unknown): number {
  if (typeof raw === 'number' && !Number.isNaN(raw)) return Math.min(4, Math.max(0, Math.floor(raw)))
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10)
    if (!Number.isNaN(n)) return Math.min(4, Math.max(0, n))
  }
  return 0
}

const BELT_ES: Record<string, string> = {
  white: 'Cinta Blanca',
  blue: 'Cinta Azul',
  purple: 'Cinta Violeta',
  brown: 'Cinta Café',
  black: 'Cinta Negra',
  'red/black': 'Cinta Roja/Negra',
  'red/white': 'Cinta Roja/Blanca',
  red: 'Cinta Roja',
}

interface Props {
  sportType: string | null
  beltLevel: string | null
  stripesRaw: unknown
}

/**
 * Card "Rango actual" del dashboard atleta. Para academias de BJJ muestra cinta SVG + franjas.
 */
export function AthleteDashboardRankCard({ sportType, beltLevel, stripesRaw }: Props) {
  const isBeltSport = sportType && BELT_SPORTS.includes(sportType as (typeof BELT_SPORTS)[number])
  const isBjj = sportType === 'Jiu-Jitsu'
  const stripes = parseStripes(stripesRaw)
  const beltKey = beltLevel?.toLowerCase() ?? ''

  const displayTitle =
    beltLevel && sportType
      ? getSportFieldDisplayValue(sportType, 'belt', beltLevel) || BELT_ES[beltKey] || beltLevel
      : null

  const accent = beltLevel ? getBeltColor(beltLevel) : '#444'
  const isLightBeltColor = beltLevel ? isLightBelt(beltLevel) : false

  if (!beltLevel || !isBeltSport) {
    return (
      <div className="rounded-2xl bg-card p-6 border border-border shadow-sm flex flex-col w-full lg:w-64 lg:shrink-0">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Rango actual</p>
          <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
            <span className="text-lg">🥋</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/50 font-medium">Sin rango asignado</p>
      </div>
    )
  }

  const svgInstanceId = `dash-rank-${beltLevel}-${stripes}`.replace(/[^a-zA-Z0-9_-]/g, '')

  return (
    <div
      className={`rounded-2xl p-6 border shadow-sm flex flex-col w-full lg:min-w-[280px] lg:max-w-[340px] lg:shrink-0 lg:h-full overflow-hidden ${
        isBjj
          ? 'border-primary/20 bg-gradient-to-br from-card via-card to-primary/10'
          : 'border-border bg-card'
      }`}
      style={
        isBjj && beltLevel
          ? ({
              boxShadow: `0 0 0 1px ${accent}22, 0 18px 40px -24px ${accent}55`,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Rango actual</p>
          {isBjj && (
            <p className="text-[9px] font-semibold uppercase tracking-wider text-primary/90 mt-1">Jiu-Jitsu</p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border"
          style={{ backgroundColor: `${accent}35` }}
        >
          <span className="text-lg leading-none" aria-hidden>
            🏅
          </span>
        </div>
      </div>

      {/* Cinta + franjas */}
      <div
        className={`rounded-xl p-3 mb-4 -mx-1 ring-1 ring-border ${
          isLightBeltColor
            ? 'bg-muted/60 dark:bg-white/[0.06]'
            : 'bg-muted/40 dark:bg-black/25'
        }`}
      >
        <BeltSVG belt={beltLevel} stripes={stripes} instanceId={svgInstanceId} className="w-full h-auto max-h-[72px] drop-shadow-md" />
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 max-w-8 rounded-full transition-colors ${
                i < stripes
                  ? 'bg-primary shadow-sm dark:bg-white dark:shadow-[0_0_8px_rgba(255,255,255,0.35)]'
                  : 'bg-muted-foreground/20 dark:bg-white/15'
              }`}
              title={i < stripes ? 'Grado' : 'Sin grado'}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <p className="text-2xl sm:text-3xl font-black leading-tight text-foreground tracking-tight uppercase">
          {displayTitle}
        </p>
        {!isBjj && (
          <p className="text-xs text-muted-foreground/50 mt-1 font-mono">{beltLevel}</p>
        )}
      </div>
    </div>
  )
}
