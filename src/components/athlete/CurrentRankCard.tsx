'use client'

import { Trophy } from 'lucide-react'

// ─── Belt colors ──────────────────────────────────────────────────────────────
const BELT_COLOR: Record<string, string> = {
  white:        '#F2F2F2',
  yellow:       '#F5C518',
  white_yellow: '#F0D070',
  orange:       '#F97316',
  yellow_green: '#84C92B',
  green:        '#22C55E',
  green_blue:   '#2D9E9E',
  blue:         '#3B82F6',
  blue_adv:     '#1D4ED8',
  blue_red:     '#7E3AF2',
  purple:       '#9333EA',
  brown:        '#78340F',
  red:          '#EF4444',
  red_black:    '#B91C1C',
}
const BLACK_BELT = '#1A1A1A'
function getBeltColor(belt: string): string {
  if (belt?.startsWith('black')) return BLACK_BELT
  return BELT_COLOR[belt] ?? '#888'
}
function isLightBelt(belt: string): boolean {
  return ['white', 'yellow', 'white_yellow', 'orange', 'yellow_green'].includes(belt)
}

const BELT_ES: Record<string, string> = {
  white: 'Cinta Blanca', blue: 'Cinta Azul', purple: 'Cinta Violeta',
  brown: 'Cinta Café', black: 'Cinta Negra',
  'red/black': 'Cinta Roja/Negra', 'red/white': 'Cinta Roja/Blanca', red: 'Cinta Roja',
}
const NEXT_BELT_ES: Record<string, string> = {
  white: 'Cinta Azul', blue: 'Cinta Violeta', purple: 'Cinta Café',
  brown: 'Cinta Negra', black: 'Cinta Roja/Negra',
}

const BELT_SPORTS = ['Jiu-Jitsu', 'Karate', 'Taekwondo', 'Judo']
const TEAM_SPORTS = ['Fútbol', 'Básquetbol', 'Vóley', 'Handball', 'Futsal', 'Rugby', 'Hockey', 'Waterpolo']

// ─── Compact belt SVG ─────────────────────────────────────────────────────────
function BeltSVG({ belt, stripes }: { belt: string; stripes: number }) {
  const color   = getBeltColor(belt)
  const isLight = isLightBelt(belt)
  const border  = isLight ? '#C0C0C0' : 'transparent'
  const uid     = `cr-${belt.replace(/[^a-z0-9]/g, '')}`

  return (
    <svg viewBox="0 0 320 56" className="w-full drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
        </linearGradient>
      </defs>
      <rect x="0" y="6" width="244" height="44" rx="6" fill={color} stroke={border} strokeWidth={isLight ? 1 : 0} />
      <rect x="0" y="6" width="244" height="44" rx="6" fill={`url(#bg-${uid})`} />
      <line x1="0" y1="28" x2="244" y2="28"
            stroke={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}
            strokeWidth="1.5" />
      <rect x="244" y="6" width="76" height="44" rx="0 6 6 0" fill="#111" />
      {Array.from({ length: Math.min(stripes, 4) }).map((_, i) => (
        <rect key={i} x={257 + i * 15} y="11" width="9" height="34" rx="3" fill="white" opacity="0.88" />
      ))}
    </svg>
  )
}

// ─── Compact jersey SVG ───────────────────────────────────────────────────────
function JerseySVG({ number, primaryColor, secondaryColor }: { number: string | null; primaryColor: string; secondaryColor: string }) {
  const num = number ?? '?'
  const bigFont = num.length > 2 ? '42' : '54'
  return (
    <svg viewBox="0 0 140 120" className="w-24 drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
      <path d="M 22,22 L 0,36 L 6,60 L 24,48" fill={primaryColor} />
      <path d="M 118,22 L 140,36 L 134,60 L 116,48" fill={primaryColor} />
      <path d="M 22,22 L 24,48 L 18,116 L 122,116 L 116,48 L 118,22 Q 100,8 70,10 Q 40,8 22,22 Z" fill={primaryColor} />
      <path d="M 42,24 Q 70,40 98,24" stroke={secondaryColor} fill="none" strokeWidth="3" strokeLinecap="round" />
      <text x="70" y="90" textAnchor="middle" fontSize={bigFont} fontWeight="900"
            fill={secondaryColor} fontFamily="Arial Black, Impact, Arial, sans-serif" letterSpacing="-1">
        {num}
      </text>
    </svg>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CurrentRankCardProps {
  sportType:      string | null
  beltLevel:      string | null
  stripes:        number | null
  jerseyNumber:   string | number | null
  athleteName:    string
  primaryColor:   string
  secondaryColor: string
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function CurrentRankCard({
  sportType, beltLevel, stripes, jerseyNumber, athleteName, primaryColor, secondaryColor,
}: CurrentRankCardProps) {
  const beltKey    = beltLevel?.toLowerCase() ?? ''
  const stripesNum = stripes ?? 0
  const stripePct  = stripes !== null ? Math.round((stripes / 4) * 100) : null

  // ── Belt sports ─────────────────────────────────────────────────────────────
  if (sportType && BELT_SPORTS.includes(sportType)) {
    const beltColor = beltLevel ? getBeltColor(beltLevel) : '#888'
    return (
      <div className="rounded-2xl bg-card p-6 border border-white/[0.02] shadow-sm flex flex-col w-full"
        style={{ background: `linear-gradient(135deg, ${beltColor}14 0%, ${beltColor}06 100%)` }}>
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Current Rank</p>
          <div className="w-8 h-8 rounded-xl bg-[#8B5A2B]/40 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-white" />
          </div>
        </div>

        {beltLevel ? (
          <div className="flex-1 flex flex-col">
            {/* Belt SVG */}
            <div className="mb-4">
              <BeltSVG belt={beltLevel} stripes={stripesNum} />
            </div>

            <p className="text-2xl font-black leading-none text-foreground tracking-tight uppercase">
              {BELT_ES[beltKey] ?? beltLevel}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5 font-medium">
              {stripesNum > 0 ? `${stripesNum} grado${stripesNum !== 1 ? 's' : ''}` : 'Sin grados'}
            </p>

            {stripePct !== null && (
              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold">
                    <span className="text-emerald-400">{stripePct}%</span>
                    {NEXT_BELT_ES[beltKey] && (
                      <span className="text-muted-foreground/60 font-medium"> hacia {NEXT_BELT_ES[beltKey]}</span>
                    )}
                  </p>
                </div>
                <div className="h-2.5 rounded-full bg-muted/40 dark:bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${stripePct}%` }} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/50 font-medium">Sin rango asignado</p>
        )}
      </div>
    )
  }

  // ── Team sports ──────────────────────────────────────────────────────────────
  if (sportType && TEAM_SPORTS.includes(sportType)) {
    const lastName = athleteName.split(' ').filter(Boolean).pop()?.toUpperCase().slice(0, 11) ?? ''
    const numStr   = jerseyNumber !== null ? String(jerseyNumber) : null
    return (
      <div className="rounded-2xl bg-card p-6 border border-white/[0.02] shadow-sm flex flex-col w-full"
        style={{ background: `linear-gradient(135deg, ${primaryColor}14 0%, ${primaryColor}06 100%)` }}>
        <div className="flex items-start justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Camiseta</p>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${primaryColor}30` }}>
            <Trophy className="w-4 h-4" style={{ color: primaryColor }} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <JerseySVG number={numStr} primaryColor={primaryColor || '#1E40AF'} secondaryColor={secondaryColor || '#FFFFFF'} />
          </div>
          <div>
            {numStr ? (
              <p className="text-4xl font-black leading-none tracking-tighter" style={{ color: primaryColor }}>
                #{numStr}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50 font-medium">Sin dorsal</p>
            )}
            <p className="text-xs text-muted-foreground/60 mt-1.5 font-medium uppercase tracking-wide">{lastName}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Fallback (other sports) ───────────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-card p-6 border border-white/[0.02] shadow-sm flex flex-col w-full">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Current Rank</p>
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground/50 font-medium">Sin rango asignado</p>
    </div>
  )
}
