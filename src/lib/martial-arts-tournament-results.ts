/**
 * Resultados estructurados por torneo (BJJ y otros AM).
 * Se guardan en technical_meta.tournament_history[].results
 */

export type MedalTier = 'gold' | 'silver' | 'bronze' | 'fourth' | 'participant'

export type BjjDivisionFormat = 'gi' | 'nogi' | 'absolute_gi' | 'absolute_nogi'

/** Una línea de resultado (ej. 🥇 Campeón Kimono medio pesado Master 1 Cinturón Café) */
export type TournamentPlacing = {
  id: string
  variant: 'bjj' | 'generic'
  medal: MedalTier
  /** BJJ */
  divisionFormat?: BjjDivisionFormat
  weightClass?: string
  ageDivision?: string
  belt?: string
  /** Otros AM: clave de preset (kumite, kata, etc.) */
  categoryKey?: string
}

export const MEDAL_OPTIONS: { value: MedalTier; label: string; emoji: string }[] = [
  { value: 'gold', label: 'Oro — Campeón', emoji: '🥇' },
  { value: 'silver', label: 'Plata — Subcampeón', emoji: '🥈' },
  { value: 'bronze', label: 'Bronce — 3er lugar', emoji: '🥉' },
  { value: 'fourth', label: '4° lugar', emoji: '4️⃣' },
  { value: 'participant', label: 'Participación / finalista', emoji: '🏅' },
]

const MEDAL_TITLE: Record<MedalTier, string> = {
  gold: 'Campeón',
  silver: 'Subcampeón',
  bronze: '3er lugar',
  fourth: '4° lugar',
  participant: 'Participación',
}

export const BJJ_FORMAT_OPTIONS: { value: BjjDivisionFormat; label: string }[] = [
  { value: 'gi', label: 'Kimono (GI) — categoría de peso' },
  { value: 'nogi', label: 'No-Gi — categoría de peso' },
  { value: 'absolute_gi', label: 'Absoluto Kimono' },
  { value: 'absolute_nogi', label: 'Absoluto No-Gi' },
]

/** Mismas claves que categorías IBJJF en sport-fields (adulto) */
export const BJJ_RESULT_WEIGHT_OPTIONS: { value: string; label: string }[] = [
  { value: 'rooster', label: 'Gallo / Rooster' },
  { value: 'light_feather', label: 'Pluma ligero / Light Feather' },
  { value: 'feather', label: 'Pluma / Feather' },
  { value: 'light', label: 'Leve / Light' },
  { value: 'middle', label: 'Medio / Middle' },
  { value: 'medium_heavy', label: 'Medio pesado / Medium Heavy' },
  { value: 'heavy', label: 'Pesado / Heavy' },
  { value: 'super_heavy', label: 'Super pesado / Super Heavy' },
  { value: 'ultra_heavy', label: 'Ultra pesado / Ultra Heavy' },
]

export const BJJ_AGE_DIVISION_OPTIONS: { value: string; label: string }[] = [
  { value: 'juvenile_1', label: 'Juvenil' },
  { value: 'adult', label: 'Adulto' },
  { value: 'master_1', label: 'Master 1' },
  { value: 'master_2', label: 'Master 2' },
  { value: 'master_3', label: 'Master 3' },
  { value: 'master_4', label: 'Master 4' },
  { value: 'master_5', label: 'Master 5' },
  { value: 'master_6', label: 'Master 6' },
  { value: 'master_7', label: 'Master 7' },
]

export const BJJ_BELT_AT_EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'white', label: 'Cinturón Blanco' },
  { value: 'blue', label: 'Cinturón Azul' },
  { value: 'purple', label: 'Cinturón Violeta' },
  { value: 'brown', label: 'Cinturón Café' },
  { value: 'black', label: 'Cinturón Negro' },
]

/** Presets genéricos cuando el deporte no es BJJ (selector simple) */
export const GENERIC_AM_CATEGORY_BY_SPORT: Record<string, { value: string; label: string }[]> = {
  Karate: [
    { value: 'kumite_team', label: 'Kumite — equipo' },
    { value: 'kata_ind', label: 'Kata individual' },
    { value: 'kumite_u60', label: 'Kumite -60 kg' },
    { value: 'kumite_u67', label: 'Kumite -67 kg' },
    { value: 'kumite_u75', label: 'Kumite -75 kg' },
    { value: 'kumite_u84', label: 'Kumite -84 kg' },
    { value: 'kumite_o84', label: 'Kumite +84 kg' },
  ],
  Judo: [
    { value: 'nage_waza', label: 'Nage-waza / combate' },
    { value: '60', label: 'Categoría -60 kg' },
    { value: '66', label: 'Categoría -66 kg' },
    { value: '73', label: 'Categoría -73 kg' },
    { value: '81', label: 'Categoría -81 kg' },
    { value: '90', label: 'Categoría -90 kg' },
    { value: '100', label: 'Categoría -100 kg' },
    { value: '100plus', label: 'Categoría +100 kg' },
  ],
  Taekwondo: [
    { value: 'kyorugi', label: 'Kyorugi (combate)' },
    { value: 'poomsae', label: 'Poomsae' },
    { value: '54', label: 'Categoría -54 kg' },
    { value: '58', label: 'Categoría -58 kg' },
    { value: '63', label: 'Categoría -63 kg' },
    { value: '68', label: 'Categoría -68 kg' },
    { value: '74', label: 'Categoría -74 kg' },
    { value: '80', label: 'Categoría -80 kg' },
    { value: '87', label: 'Categoría -87 kg' },
    { value: '87plus', label: 'Categoría +87 kg' },
  ],
  'Muay Thai': [
    { value: 'fight_amateur', label: 'Combate amateur' },
    { value: 'fight_pro', label: 'Combate profesional' },
    { value: 'interclub', label: 'Interclub' },
  ],
  MMA: [
    { value: 'pro_debut', label: 'Combate / debut' },
    { value: 'amateur', label: 'Amateur' },
  ],
  Kickboxing: [
    { value: 'k1', label: 'K-1 / reglamento' },
    { value: 'lowkick', label: 'Low kick' },
  ],
  Lucha: [
    { value: 'fs_57', label: 'Libre -57 kg' },
    { value: 'fs_65', label: 'Libre -65 kg' },
    { value: 'fs_74', label: 'Libre -74 kg' },
    { value: 'fs_86', label: 'Libre -86 kg' },
    { value: 'fs_97', label: 'Libre -97 kg' },
    { value: 'gr', label: 'Greco' },
  ],
}

export function getGenericCategoryOptions(sportType: string): { value: string; label: string }[] {
  return GENERIC_AM_CATEGORY_BY_SPORT[sportType] ?? [
    { value: 'open', label: 'Categoría general / open' },
    { value: 'regional', label: 'Torneo regional' },
    { value: 'national', label: 'Torneo nacional' },
  ]
}

function labelMap<T extends { value: string; label: string }>(opts: T[], value: string | undefined): string {
  if (!value) return ''
  return opts.find((o) => o.value === value)?.label ?? value
}

/** Construye la línea legible en español (principalmente BJJ). */
export function formatTournamentPlacingLine(sportType: string, p: TournamentPlacing): string {
  const medal = MEDAL_OPTIONS.find((m) => m.value === p.medal)
  const emoji = medal?.emoji ?? '🏅'
  const title = MEDAL_TITLE[p.medal] ?? ''

  if (p.variant === 'generic' || sportType !== 'Jiu-Jitsu') {
    const cat = labelMap(getGenericCategoryOptions(sportType), p.categoryKey)
    if (cat) return `${emoji} ${title} · ${cat}`.trim()
    return `${emoji} ${title}`.trim()
  }

  const fmt = p.divisionFormat ?? 'gi'
  const weightLbl = labelMap(BJJ_RESULT_WEIGHT_OPTIONS, p.weightClass)
  const ageLbl = labelMap(BJJ_AGE_DIVISION_OPTIONS, p.ageDivision)
  const beltLbl = labelMap(BJJ_BELT_AT_EVENT_OPTIONS, p.belt)

  let modalityPart = ''
  if (fmt === 'gi') modalityPart = ['Kimono', weightLbl].filter(Boolean).join(' ')
  else if (fmt === 'nogi') modalityPart = ['Nogi', weightLbl].filter(Boolean).join(' ')
  else if (fmt === 'absolute_gi') modalityPart = 'Absoluto Kimono'
  else if (fmt === 'absolute_nogi') modalityPart = 'Absoluto No-Gi'

  const parts = [emoji, title, modalityPart, ageLbl, beltLbl].filter((x) => x && x.trim().length > 0)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function newPlacingId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function createEmptyPlacing(sportType: string): TournamentPlacing {
  if (sportType === 'Jiu-Jitsu') {
    return {
      id: newPlacingId(),
      variant: 'bjj',
      medal: 'gold',
      divisionFormat: 'gi',
      weightClass: 'middle',
      ageDivision: 'master_1',
      belt: 'brown',
    }
  }
  const opts = getGenericCategoryOptions(sportType)
  return {
    id: newPlacingId(),
    variant: 'generic',
    medal: 'gold',
    categoryKey: opts[0]?.value ?? 'open',
  }
}

export type TournamentStats = {
  /** Torneos con federación o nombre de evento */
  tournaments: number
  /** Total de resultados (medallas / posiciones) registrados */
  results: number
  gold: number
  silver: number
  bronze: number
  other: number
}

export function aggregateTournamentStats(
  entries: { results?: TournamentPlacing[]; achievements?: string; federation?: string; event_name?: string }[]
): TournamentStats {
  const out: TournamentStats = {
    tournaments: entries.filter((e) => (e.federation?.trim() || e.event_name?.trim())).length,
    results: 0,
    gold: 0,
    silver: 0,
    bronze: 0,
    other: 0,
  }

  for (const e of entries) {
    const rows = e.results ?? []
    for (const r of rows) {
      out.results += 1
      if (r.medal === 'gold') out.gold += 1
      else if (r.medal === 'silver') out.silver += 1
      else if (r.medal === 'bronze') out.bronze += 1
      else out.other += 1
    }
  }

  return out
}
