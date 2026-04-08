/**
 * Representación visual de cinta + franjas (BJJ y otras artes con cinturón).
 * Usar `instanceId` cuando pueda haber varias instancias en la misma vista (evita colisión de ids SVG).
 */

export const BELT_COLOR: Record<string, string> = {
  white: '#F2F2F2',
  yellow: '#F5C518',
  white_yellow: '#F0D070',
  orange: '#F97316',
  yellow_green: '#84C92B',
  green: '#22C55E',
  green_blue: '#2D9E9E',
  blue: '#3B82F6',
  blue_adv: '#1D4ED8',
  blue_red: '#7E3AF2',
  purple: '#9333EA',
  brown: '#78340F',
  red: '#EF4444',
  red_black: '#B91C1C',
}
const BLACK_BELT = '#1A1A1A'

export function getBeltColor(belt: string): string {
  if (belt?.startsWith('black')) return BLACK_BELT
  return BELT_COLOR[belt] ?? '#888'
}

export function isLightBelt(belt: string): boolean {
  return ['white', 'yellow', 'white_yellow', 'orange', 'yellow_green'].includes(belt)
}

export function BeltSVG({
  belt,
  stripes,
  instanceId,
  className,
}: {
  belt: string
  stripes: number
  /** Sufijo único para gradientes SVG (ej. useId en cliente) */
  instanceId?: string
  className?: string
}) {
  const color = getBeltColor(belt)
  const isLight = isLightBelt(belt)
  const border = isLight ? '#C0C0C0' : 'transparent'
  const uid = instanceId ?? belt.replace(/[^a-z0-9]/g, '')
  const n = Math.min(Math.max(stripes, 0), 4)

  return (
    <svg
      viewBox="0 0 320 56"
      className={className ?? 'w-full max-w-[300px] drop-shadow-lg'}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`belt-shade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
        </linearGradient>
      </defs>

      <rect x="0" y="6" width="244" height="44" rx="6" fill={color} stroke={border} strokeWidth={isLight ? 1 : 0} />
      <rect x="0" y="6" width="244" height="44" rx="6" fill={`url(#belt-shade-${uid})`} />
      <line
        x1="0"
        y1="28"
        x2="244"
        y2="28"
        stroke={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}
        strokeWidth="1.5"
      />

      <rect x="244" y="6" width="76" height="44" rx="0 6 6 0" fill="#111" />
      <rect x="244" y="6" width="76" height="44" rx="0 6 6 0" fill="rgba(255,255,255,0.06)" />

      {Array.from({ length: n }).map((_, i) => (
        <rect key={i} x={257 + i * 15} y="11" width="9" height="34" rx="3" fill="white" opacity="0.88" />
      ))}
    </svg>
  )
}
