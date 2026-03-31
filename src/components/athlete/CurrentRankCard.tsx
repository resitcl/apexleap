'use client'

import { Trophy, Swords, Flame, Dumbbell } from 'lucide-react'

// ─── Sport groups ──────────────────────────────────────────────────────────────
const BELT_SPORTS    = ['Jiu-Jitsu', 'Karate', 'Taekwondo', 'Judo']
const TEAM_SPORTS    = ['Fútbol', 'Básquetbol', 'Vóley', 'Handball', 'Futsal', 'Rugby', 'Hockey', 'Waterpolo']
const COMBAT_SPORTS  = ['Boxeo', 'Muay Thai', 'MMA', 'Kickboxing', 'Kick Boxing', 'Lucha', 'Lucha Libre', 'Wrestling', 'Sambo']
const FITNESS_SPORTS = ['CrossFit', 'Fitness', 'Yoga', 'Pilates', 'Natación', 'Atletismo', 'Tenis', 'Golf', 'Ciclismo', 'Gimnasia', 'Paddle']

// ─── Belt colors ───────────────────────────────────────────────────────────────
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
  white:     'Blanca',
  yellow:    'Amarilla',
  white_yellow: 'Blanca/Amarilla',
  orange:    'Naranja',
  yellow_green: 'Amarilla/Verde',
  green:     'Verde',
  green_blue:'Verde/Azul',
  blue:      'Azul',
  blue_adv:  'Azul Avanzada',
  blue_red:  'Azul/Roja',
  purple:    'Violeta',
  brown:     'Café',
  red:       'Roja',
  red_black: 'Roja/Negra',
  black:     'Negra',
  black_1:   'Negra 1°',
  black_2:   'Negra 2°',
  black_3:   'Negra 3°',
}
const NEXT_BELT_ES: Record<string, string> = {
  white:     'Azul',
  blue:      'Violeta',
  purple:    'Café',
  brown:     'Negra',
  black:     'Roja/Negra',
}

// ─── Belt SVG (wide ribbon with black tip + stripes) ──────────────────────────
function BeltSVG({ belt, stripes }: { belt: string; stripes: number }) {
  const color   = getBeltColor(belt)
  const isLight = isLightBelt(belt)
  const border  = isLight ? '#C0C0C0' : 'transparent'
  const uid     = `cr-${belt.replace(/[^a-z0-9]/g, '')}`

  return (
    <svg viewBox="0 0 260 72" className="w-full drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.20)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.20)" />
        </linearGradient>
      </defs>
      {/* Belt body */}
      <rect x="0" y="8" width="192" height="56" rx="8" fill={color} stroke={border} strokeWidth={isLight ? 1 : 0} />
      <rect x="0" y="8" width="192" height="56" rx="8" fill={`url(#bg-${uid})`} />
      {/* Center line */}
      <line x1="0" y1="36" x2="192" y2="36"
            stroke={isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.09)'}
            strokeWidth="1.5" />
      {/* Black tip */}
      <rect x="192" y="8" width="68" height="56" rx="0" fill="#111" />
      <rect x="252" y="8" width="8" height="56" rx="0 8 8 0" fill="#111" />
      {/* Stripes (white bars in black tip) */}
      {Array.from({ length: Math.min(stripes, 4) }).map((_, i) => (
        <rect key={i} x={202 + i * 14} y="16" width="9" height="40" rx="3" fill="white" opacity="0.88" />
      ))}
    </svg>
  )
}

// ─── Jersey SVG ───────────────────────────────────────────────────────────────
function JerseySVG({ number, primaryColor, secondaryColor }: { number: string | null; primaryColor: string; secondaryColor: string }) {
  const num     = number ?? '?'
  const bigFont = num.length > 2 ? '42' : '54'
  return (
    <svg viewBox="0 0 140 120" className="w-24 drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
      <path d="M 22,22 L 0,36 L 6,60 L 24,48"                           fill={primaryColor} />
      <path d="M 118,22 L 140,36 L 134,60 L 116,48"                      fill={primaryColor} />
      <path d="M 22,22 L 24,48 L 18,116 L 122,116 L 116,48 L 118,22 Q 100,8 70,10 Q 40,8 22,22 Z" fill={primaryColor} />
      <path d="M 42,24 Q 70,40 98,24" stroke={secondaryColor} fill="none" strokeWidth="3" strokeLinecap="round" />
      <text x="70" y="90" textAnchor="middle" fontSize={bigFont} fontWeight="900"
            fill={secondaryColor} fontFamily="Arial Black, Impact, Arial, sans-serif" letterSpacing="-1">
        {num}
      </text>
    </svg>
  )
}

// ─── Gloves SVG (combat sports) ───────────────────────────────────────────────
function GlovesSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 80" className="w-20 drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
      {/* Left glove */}
      <ellipse cx="32" cy="44" rx="20" ry="26" fill={color} />
      <rect x="12" y="54" width="40" height="14" rx="4" fill={color} />
      <rect x="14" y="54" width="36" height="7" rx="3" fill="rgba(255,255,255,0.15)" />
      <ellipse cx="32" cy="32" rx="12" ry="8" fill="rgba(255,255,255,0.12)" />
      {/* Right glove (mirrored) */}
      <ellipse cx="88" cy="44" rx="20" ry="26" fill={color} />
      <rect x="68" y="54" width="40" height="14" rx="4" fill={color} />
      <rect x="70" y="54" width="36" height="7" rx="3" fill="rgba(255,255,255,0.15)" />
      <ellipse cx="88" cy="32" rx="12" ry="8" fill="rgba(255,255,255,0.12)" />
      {/* Center spark */}
      <circle cx="60" cy="44" r="6" fill="rgba(255,255,255,0.18)" />
    </svg>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface CurrentRankCardProps {
  sportType:      string | null
  beltLevel:      string | null
  stripes:        number | null
  jerseyNumber:   string | number | null
  athleteName:    string
  primaryColor:   string
  secondaryColor: string
}

// ─── Main export ───────────────────────────────────────────────────────────────
export function CurrentRankCard({
  sportType, beltLevel, stripes, jerseyNumber, athleteName, primaryColor, secondaryColor,
}: CurrentRankCardProps) {
  const beltKey    = beltLevel?.toLowerCase() ?? ''
  const stripesNum = stripes ?? 0
  const stripePct  = stripes !== null ? Math.round((stripes / 4) * 100) : null

  // ── Belt sports ─────────────────────────────────────────────────────────────
  if (sportType && BELT_SPORTS.includes(sportType)) {
    const beltColor = beltLevel ? getBeltColor(beltLevel) : '#888'
    const beltName  = beltLevel ? (BELT_ES[beltKey] ?? beltLevel) : null
    return (
      <div className="rounded-2xl overflow-hidden border border-white/[0.02] shadow-sm flex flex-col w-full h-full"
        style={{ background: `linear-gradient(145deg, ${beltColor}18 0%, ${beltColor}08 60%, transparent 100%)` }}>

        <div className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Rango</p>
            <div className="w-7 h-7 rounded-lg bg-[#8B5A2B]/30 flex items-center justify-center shrink-0">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
        </div>

        {beltLevel ? (
          <>
            {/* Belt illustration — full width */}
            <div className="w-full flex-shrink-0 px-4 py-2">
              <BeltSVG belt={beltLevel} stripes={stripesNum} />
            </div>

            {/* Belt name + stripes + progress */}
            <div className="px-5 pb-5 flex flex-col gap-3">
              <div>
                <p className="text-lg font-black leading-none text-foreground tracking-tight uppercase">
                  Cinta {beltName}
                </p>
                <p className="text-xs text-muted-foreground/55 mt-2 font-medium">
                  {stripesNum > 0
                    ? `${stripesNum} grado${stripesNum !== 1 ? 's' : ''}`
                    : 'Sin grados'}
                </p>
              </div>

              {/* Progress to next belt */}
              {stripePct !== null && NEXT_BELT_ES[beltKey] && (
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-bold text-emerald-400">{stripePct}%</p>
                    <p className="text-[11px] text-muted-foreground/50 font-medium">→ {NEXT_BELT_ES[beltKey]}</p>
                  </div>
                  <div className="h-2 rounded-full bg-muted/40 dark:bg-white/[0.04] overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                         style={{ width: `${stripePct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground/50 font-medium p-5">Sin rango asignado</p>
        )}
      </div>
    )
  }

  // ── Team sports ─────────────────────────────────────────────────────────────
  if (sportType && TEAM_SPORTS.includes(sportType)) {
    const lastName = athleteName.split(' ').filter(Boolean).pop()?.toUpperCase().slice(0, 11) ?? ''
    const numStr   = jerseyNumber !== null ? String(jerseyNumber) : null
    const pc       = primaryColor || '#1E40AF'
    const sc       = secondaryColor || '#FFFFFF'
    return (
      <div className="rounded-2xl overflow-hidden border border-white/[0.02] shadow-sm flex flex-col w-full h-full"
        style={{ background: `linear-gradient(145deg, ${pc}18 0%, ${pc}08 60%, transparent 100%)` }}>

        <div className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Camiseta</p>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                 style={{ backgroundColor: `${pc}28` }}>
              <Trophy className="w-3.5 h-3.5" style={{ color: pc }} />
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex items-center justify-center gap-4">
          <div className="shrink-0">
            <JerseySVG number={numStr} primaryColor={pc} secondaryColor={sc} />
          </div>
          <div className="flex-1">
            {numStr ? (
              <>
                <p className="text-5xl font-black leading-none tracking-tighter" style={{ color: pc }}>
                  #{numStr}
                </p>
                {lastName && (
                  <p className="text-[11px] text-muted-foreground/55 mt-2 font-bold uppercase tracking-wider">
                    {lastName}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground/50 font-medium">Sin dorsal asignado</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Combat sports ───────────────────────────────────────────────────────────
  if (sportType && COMBAT_SPORTS.includes(sportType)) {
    const accent = primaryColor || '#EF4444'
    const level  = beltLevel ?? null
    return (
      <div className="rounded-2xl overflow-hidden border border-white/[0.02] shadow-sm flex flex-col w-full h-full"
        style={{ background: `linear-gradient(145deg, ${accent}18 0%, ${accent}08 60%, transparent 100%)` }}>

        <div className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Nivel</p>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                 style={{ backgroundColor: `${accent}28` }}>
              <Swords className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex flex-col items-center justify-center flex-1 gap-3">
          <div className="py-2">
            <GlovesSVG color={accent} />
          </div>

          {level ? (
            <div className="text-center">
              <p className="text-xl font-black leading-none text-foreground tracking-tight uppercase">{level}</p>
              <p className="text-xs text-muted-foreground/55 mt-1.5 font-medium">{sportType}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-black leading-none text-foreground tracking-tight">{sportType}</p>
              <p className="text-xs text-muted-foreground/50 mt-1.5 font-medium">Sin nivel asignado</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Fitness / individual sports ─────────────────────────────────────────────
  if (sportType && FITNESS_SPORTS.includes(sportType)) {
    const accent = primaryColor || '#8B5CF6'
    const level  = beltLevel ?? null
    return (
      <div className="rounded-2xl overflow-hidden border border-white/[0.02] shadow-sm flex flex-col w-full h-full"
        style={{ background: `linear-gradient(145deg, ${accent}18 0%, ${accent}08 60%, transparent 100%)` }}>

        <div className="p-5 pb-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Nivel</p>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                 style={{ backgroundColor: `${accent}28` }}>
              <Flame className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
          </div>
        </div>

        {/* Level display */}
        <div className="px-5 pb-5 flex-1 flex flex-col justify-center items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
               style={{ backgroundColor: `${accent}18` }}>
            <Dumbbell className="w-8 h-8" style={{ color: accent }} />
          </div>
          {level ? (
            <div className="text-center">
              <p className="text-xl font-black leading-none text-foreground tracking-tight">{level}</p>
              <p className="text-xs text-muted-foreground/55 mt-1.5 font-medium">{sportType}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-black leading-none text-foreground tracking-tight">{sportType}</p>
              <p className="text-xs text-muted-foreground/50 mt-1.5 font-medium">Sin nivel asignado</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Fallback ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-card border border-white/[0.02] shadow-sm flex flex-col w-full h-full">
      <div className="p-5 pb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Rango</p>
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Trophy className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
      <div className="px-5 pb-5 flex-1 flex items-center justify-center">
        {beltLevel ? (
          <p className="text-lg font-black text-foreground tracking-tight text-center">{beltLevel}</p>
        ) : (
          <p className="text-sm text-muted-foreground/50 font-medium text-center">Sin rango asignado</p>
        )}
      </div>
    </div>
  )
}
