'use client'

import { useId } from 'react'
import { BeltSVG, getBeltColor, isLightBelt } from '@/components/athlete/belt-visual'
import { getSportFieldDisplayValue, getTournamentHistorySummaryLine } from '@/lib/sport-fields'

type TechMeta = Record<string, unknown>

// ─── Sport groups ─────────────────────────────────────────────────────────────
const BELT_SPORTS  = ['Jiu-Jitsu', 'Karate', 'Taekwondo', 'Judo']
const COMBAT_SPORTS = ['Boxeo', 'Muay Thai', 'MMA', 'Kickboxing', 'Lucha']
const TEAM_SPORTS  = ['Fútbol', 'Básquetbol', 'Vóley', 'Handball', 'Futsal', 'Rugby', 'Hockey', 'Waterpolo']

// ─── Jersey SVG ───────────────────────────────────────────────────────────────
function JerseySVG({
  number, name, primaryColor, secondaryColor,
}: {
  number: string | null
  name: string
  primaryColor: string
  secondaryColor: string
}) {
  const lastName = name.split(' ').filter(Boolean).pop()?.toUpperCase().slice(0, 11) ?? ''
  const num = number ?? '?'
  const bigFont = num.length > 2 ? '42' : '54'

  return (
    <svg viewBox="0 0 140 160" className="w-32 drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
      {/* Left sleeve */}
      <path d="M 22,22 L 0,36 L 6,60 L 24,48" fill={primaryColor} />
      {/* Right sleeve */}
      <path d="M 118,22 L 140,36 L 134,60 L 116,48" fill={primaryColor} />
      {/* Jersey body */}
      <path
        d="M 22,22 L 24,48 L 18,156 L 122,156 L 116,48 L 118,22 Q 100,8 70,10 Q 40,8 22,22 Z"
        fill={primaryColor}
      />
      {/* Collar arc */}
      <path d="M 42,24 Q 70,40 98,24" stroke={secondaryColor} fill="none" strokeWidth="3" strokeLinecap="round" />
      {/* Subtle side stripe */}
      <line x1="18" y1="80"  x2="18" y2="130" stroke={secondaryColor} strokeWidth="2" opacity="0.35" />
      <line x1="122" y1="80" x2="122" y2="130" stroke={secondaryColor} strokeWidth="2" opacity="0.35" />
      {/* Number */}
      <text
        x="70" y="113"
        textAnchor="middle"
        fontSize={bigFont}
        fontWeight="900"
        fill={secondaryColor}
        fontFamily="Arial Black, Impact, Arial, sans-serif"
        letterSpacing="-1"
      >
        {num}
      </text>
      {/* Last name */}
      <text
        x="70" y="138"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fill={secondaryColor}
        fontFamily="Arial, sans-serif"
        letterSpacing="1.5"
      >
        {lastName}
      </text>
    </svg>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  sportType:     string | null
  technicalMeta: TechMeta | null
  athleteName:   string
  primaryColor:  string
  secondaryColor: string
  jerseyNumber?: string | null
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AthleteIdentityCard({
  sportType, technicalMeta, athleteName, primaryColor, secondaryColor, jerseyNumber,
}: Props) {
  const meta = technicalMeta ?? {}
  const beltSvgId = useId().replace(/:/g, '')
  if (!sportType) return null

  // ── Belt sports (BJJ, Karate, Taekwondo, Judo) ───────────────────────────
  if (BELT_SPORTS.includes(sportType)) {
    const belt    = meta.belt as string | undefined
    const stripes = Number(meta.stripes ?? 0)
    const beltLabel   = getSportFieldDisplayValue(sportType, 'belt', belt) || 'Sin registrar'
    const stripesLabel = stripes > 0 ? `${stripes} grado${stripes !== 1 ? 's' : ''}` : 'Sin grados'
    const weightClass  = getSportFieldDisplayValue(sportType, 'weight_class', meta.weight_class) || null
    const tournamentLine = getTournamentHistorySummaryLine(meta)
    const beltColor    = belt ? getBeltColor(belt) : '#888'
    const isLight      = belt ? isLightBelt(belt) : false

    return (
      <div
        className="sport-card p-6 border-none"
        style={{
          background: `linear-gradient(135deg, ${isLight ? '#F5F5F5' : beltColor}1A 0%, ${beltColor}08 100%)`,
          '--sport-accent': beltColor,
        } as React.CSSProperties}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-5">
          Tu rango · {sportType}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Belt visual */}
          <div className="w-full sm:w-auto flex justify-center">
            {belt ? (
              <BeltSVG belt={belt} stripes={stripes} instanceId={beltSvgId} />
            ) : (
              <div className="w-full max-w-[280px] h-[78px] rounded-2xl bg-muted/50 flex items-center justify-center border-none">
                <span className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Sin cinturón</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1 space-y-1">
            <p className="text-3xl font-black leading-none tracking-tight">{beltLabel}</p>
            <p className="text-sm font-bold text-muted-foreground mt-1">{stripesLabel}</p>
            <div className="flex flex-wrap gap-2 pt-3 justify-center sm:justify-start">
              {weightClass && (
                <span className="text-xs bg-black/20 text-foreground dark:text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">
                  ⚖️ {weightClass}
                </span>
              )}
              {tournamentLine && (
                <span className="text-xs bg-black/20 text-foreground dark:text-white rounded-lg px-3 py-1.5 font-bold tracking-wide">
                  🏅 {tournamentLine}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Team sports (Fútbol, Básquetbol, Vóley…) ─────────────────────────────
  if (TEAM_SPORTS.includes(sportType)) {
    const positions  = getSportFieldDisplayValue(sportType, 'preferred_positions', meta.preferred_positions) || null
    const heightCm   = meta.height_cm as number | null | undefined
    const wingspanCm = meta.wingspan_cm as number | null | undefined

    return (
      <div
        className="sport-card p-6 border-none"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}14 0%, ${primaryColor}06 100%)`,
          '--sport-accent': primaryColor,
        } as React.CSSProperties}
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Jersey */}
          <div className="shrink-0 flex justify-center">
            <JerseySVG
              number={jerseyNumber ?? null}
              name={athleteName}
              primaryColor={primaryColor || '#1E40AF'}
              secondaryColor={secondaryColor || '#FFFFFF'}
            />
          </div>

          {/* Info */}
          <div className="text-center sm:text-left flex-1 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">
              Tu camiseta · {sportType}
            </p>
            {jerseyNumber && (
              <p className="text-5xl font-black leading-none tracking-tighter" style={{ color: primaryColor }}>
                #{jerseyNumber}
              </p>
            )}
            {positions && (
              <p className="text-sm font-bold text-muted-foreground mt-1 uppercase tracking-wide">{positions}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-3 justify-center sm:justify-start">
              {heightCm && (
                <span className="text-xs bg-black/20 text-foreground dark:text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">
                  📏 {heightCm} cm
                </span>
              )}
              {wingspanCm && (
                <span className="text-xs bg-black/20 text-foreground dark:text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">
                  🦅 {wingspanCm} cm env.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Combat sports without belt (Boxeo, Muay Thai, MMA, Kickboxing, Lucha) ─
  if (COMBAT_SPORTS.includes(sportType)) {
    const isBoxing = sportType === 'Boxeo'
    const record = isBoxing ? ((meta.fights as string | null) ?? null) : null
    const tournamentLine = !isBoxing ? getTournamentHistorySummaryLine(meta) : null
    const level       = getSportFieldDisplayValue(sportType, 'level', meta.level) || null
    const weightClass = getSportFieldDisplayValue(sportType, 'weight_class', meta.weight_class) || null
    const stance      = getSportFieldDisplayValue(sportType, 'stance', meta.stance) || null

    if (!record && !tournamentLine && !level && !weightClass && !stance) return null

    const sportEmoji: Record<string, string> = {
      Boxeo: '🥊', 'Muay Thai': '🥊', MMA: '🥋', Kickboxing: '🦵', Lucha: '🤼',
    }

    return (
      <div className="sport-card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none" style={{ '--sport-accent': '#f43f5e' } as React.CSSProperties}>
        {/* Background emoji watermark */}
        <span className="absolute top-2 right-4 text-[96px] opacity-[0.03] select-none pointer-events-none">
          {sportEmoji[sportType] ?? '🥊'}
        </span>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-5 relative z-10">
          {isBoxing ? `Tu récord · ${sportType}` : `Competencia · ${sportType}`}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10">
          {isBoxing && record && (
            <div>
              <p className="text-5xl font-black font-mono tracking-tighter">{record}</p>
              <p className="text-xs font-bold text-white/50 mt-1 uppercase tracking-wide">V · D · E</p>
            </div>
          )}
          {!isBoxing && tournamentLine && (
            <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/10">
              <p className="text-2xl font-black tracking-tight">🏅 {tournamentLine}</p>
              <p className="text-[10px] font-bold text-white/50 mt-1 uppercase tracking-wide">Torneos</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {level      && <span className="text-xs bg-white/10 text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">{level}</span>}
            {weightClass && <span className="text-xs bg-white/10 text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">⚖️ {weightClass}</span>}
            {stance     && <span className="text-xs bg-white/10 text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">{stance}</span>}
          </div>
        </div>
      </div>
    )
  }

  // ── Individual sports (Natación, Tenis, Yoga, Crossfit, Atletismo…) ────────
  const level   = getSportFieldDisplayValue(sportType, 'level', meta.level) || null
  const specialty = (meta.specialty as string | null) ?? (meta.best_event as string | null) ?? null
  const pr      = (meta.pr_notes as string | null) ?? null
  const ranking = (meta.ranking as string | null) ?? null

  if (!level && !specialty && !pr && !ranking) return null

  return (
    <div className="sport-card p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-none" style={{ '--sport-accent': 'var(--primary)' } as React.CSSProperties}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-5 relative z-10">
        Tu perfil · {sportType}
      </p>
      <div className="flex flex-wrap gap-2 relative z-10">
        {level    && <span className="text-xs bg-black/20 text-foreground dark:text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">{level}</span>}
        {specialty && <span className="text-xs bg-black/20 text-foreground dark:text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">{specialty}</span>}
        {ranking  && <span className="text-xs bg-black/20 text-foreground dark:text-white rounded-lg px-3 py-1.5 font-bold uppercase tracking-wide">🏅 {ranking}</span>}
        {pr       && <span className="text-xs bg-black/20 text-foreground dark:text-white rounded-lg px-3 py-1.5 font-mono font-bold tracking-wide">PRs: {pr}</span>}
      </div>
    </div>
  )
}
