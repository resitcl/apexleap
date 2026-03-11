// ─── Sport-specific field definitions ────────────────────────────────────────
// Each club's sport_type maps to a set of dynamic fields stored in technical_meta JSONB.
// Following the project rule: NO sport-specific DB tables, use JSONB meta fields.

export type FieldType = 'select' | 'number' | 'text' | 'multiselect'

export interface SportField {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
  min?: number
  max?: number
  helpText?: string
}

export interface SportConfig {
  label: string
  sectionTitle: string
  fields: SportField[]
  hideJerseyNumber?: boolean
}

// ─── Belt / ranking systems per discipline ───────────────────────────────────

const BJJ_BELTS = [
  { value: 'white', label: 'Blanco' },
  { value: 'blue', label: 'Azul' },
  { value: 'purple', label: 'Morado' },
  { value: 'brown', label: 'Café' },
  { value: 'black', label: 'Negro' },
]

const BJJ_STRIPES = [
  { value: '0', label: '0 grados' },
  { value: '1', label: '1 grado' },
  { value: '2', label: '2 grados' },
  { value: '3', label: '3 grados' },
  { value: '4', label: '4 grados' },
]

const KARATE_BELTS = [
  { value: 'white', label: 'Blanco (9° Kyu)' },
  { value: 'yellow', label: 'Amarillo (8° Kyu)' },
  { value: 'orange', label: 'Naranja (7° Kyu)' },
  { value: 'green', label: 'Verde (6° Kyu)' },
  { value: 'blue', label: 'Azul (5° Kyu)' },
  { value: 'blue_adv', label: 'Azul Avanzado (4° Kyu)' },
  { value: 'brown', label: 'Marrón (3°-1° Kyu)' },
  { value: 'black_1dan', label: 'Negro 1° Dan' },
  { value: 'black_2dan', label: 'Negro 2° Dan' },
  { value: 'black_3dan', label: 'Negro 3° Dan' },
  { value: 'black_4dan', label: 'Negro 4° Dan' },
  { value: 'black_5dan', label: 'Negro 5° Dan' },
]

const TAEKWONDO_BELTS = [
  { value: 'white', label: 'Blanco (10° Gup)' },
  { value: 'white_yellow', label: 'Blanco-Amarillo (9° Gup)' },
  { value: 'yellow', label: 'Amarillo (8° Gup)' },
  { value: 'yellow_green', label: 'Amarillo-Verde (7° Gup)' },
  { value: 'green', label: 'Verde (6° Gup)' },
  { value: 'green_blue', label: 'Verde-Azul (5° Gup)' },
  { value: 'blue', label: 'Azul (4° Gup)' },
  { value: 'blue_red', label: 'Azul-Rojo (3° Gup)' },
  { value: 'red', label: 'Rojo (2° Gup)' },
  { value: 'red_black', label: 'Rojo-Negro (1° Gup)' },
  { value: 'black_1dan', label: 'Negro 1° Dan' },
  { value: 'black_2dan', label: 'Negro 2° Dan' },
  { value: 'black_3dan', label: 'Negro 3° Dan' },
  { value: 'black_4dan', label: 'Negro 4° Dan' },
  { value: 'black_5dan', label: 'Negro 5° Dan' },
]

const JUDO_BELTS = [
  { value: 'white', label: 'Blanco (6° Kyu)' },
  { value: 'yellow', label: 'Amarillo (5° Kyu)' },
  { value: 'orange', label: 'Naranja (4° Kyu)' },
  { value: 'green', label: 'Verde (3° Kyu)' },
  { value: 'blue', label: 'Azul (2° Kyu)' },
  { value: 'brown', label: 'Marrón (1° Kyu)' },
  { value: 'black_1dan', label: 'Negro 1° Dan' },
  { value: 'black_2dan', label: 'Negro 2° Dan' },
  { value: 'black_3dan', label: 'Negro 3° Dan' },
  { value: 'black_4dan', label: 'Negro 4° Dan' },
  { value: 'black_5dan', label: 'Negro 5° Dan' },
]

// ─── IBJJF weight classes (Adult, Gi) ───────────────────────────────────────
const BJJ_WEIGHT_CLASSES = [
  { value: 'rooster', label: 'Gallo / Rooster (≤57.5 kg)' },
  { value: 'light_feather', label: 'Pluma Ligero / Light Feather (≤64 kg)' },
  { value: 'feather', label: 'Pluma / Feather (≤70 kg)' },
  { value: 'light', label: 'Leve / Light (≤76 kg)' },
  { value: 'middle', label: 'Medio / Middle (≤82.3 kg)' },
  { value: 'medium_heavy', label: 'Medio Pesado / Medium Heavy (≤88.3 kg)' },
  { value: 'heavy', label: 'Pesado / Heavy (≤94.3 kg)' },
  { value: 'super_heavy', label: 'Super Pesado / Super Heavy (≤100.5 kg)' },
  { value: 'ultra_heavy', label: 'Ultra Pesado / Ultra Heavy (+100.5 kg)' },
  { value: 'open_class', label: 'Absoluto / Open Class' },
]

// ─── IJF / Judo weight classes (Senior) ─────────────────────────────────────
const JUDO_WEIGHT_CLASSES = [
  { value: '60', label: '≤60 kg' },
  { value: '66', label: '≤66 kg' },
  { value: '73', label: '≤73 kg' },
  { value: '81', label: '≤81 kg' },
  { value: '90', label: '≤90 kg' },
  { value: '100', label: '≤100 kg' },
  { value: '100plus', label: '+100 kg' },
]

// ─── WT / Taekwondo weight classes (Senior) ─────────────────────────────────
const TKD_WEIGHT_CLASSES = [
  { value: '54', label: '≤54 kg (Fin)' },
  { value: '58', label: '≤58 kg (Fly)' },
  { value: '63', label: '≤63 kg (Bantam)' },
  { value: '68', label: '≤68 kg (Feather)' },
  { value: '74', label: '≤74 kg (Light)' },
  { value: '80', label: '≤80 kg (Welter)' },
  { value: '87', label: '≤87 kg (Middle)' },
  { value: '87plus', label: '+87 kg (Heavy)' },
]

// ─── WKF / Karate weight classes (Senior) ───────────────────────────────────
const KARATE_WEIGHT_CLASSES = [
  { value: '60', label: '≤60 kg' },
  { value: '67', label: '≤67 kg' },
  { value: '75', label: '≤75 kg' },
  { value: '84', label: '≤84 kg' },
  { value: '84plus', label: '+84 kg' },
]

// ─── Generic combat weight classes (Boxing, MMA, Muay Thai, Kickboxing) ─────
const COMBAT_WEIGHT_CLASSES = [
  { value: 'strawweight', label: 'Paja / Strawweight (≤52.2 kg)' },
  { value: 'flyweight', label: 'Mosca / Flyweight (≤56.7 kg)' },
  { value: 'bantamweight', label: 'Gallo / Bantamweight (≤61.2 kg)' },
  { value: 'featherweight', label: 'Pluma / Featherweight (≤65.8 kg)' },
  { value: 'lightweight', label: 'Ligero / Lightweight (≤70.3 kg)' },
  { value: 'welterweight', label: 'Wélter / Welterweight (≤77.1 kg)' },
  { value: 'middleweight', label: 'Medio / Middleweight (≤83.9 kg)' },
  { value: 'light_heavyweight', label: 'Semipesado / Light Heavyweight (≤93.0 kg)' },
  { value: 'heavyweight', label: 'Pesado / Heavyweight (≤120.2 kg)' },
  { value: 'super_heavyweight', label: 'Superpesado / Super Heavyweight (+120.2 kg)' },
]

const COMBAT_LEVEL = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
  { value: 'competitor', label: 'Competidor' },
  { value: 'professional', label: 'Profesional' },
]

const STANCE_OPTIONS = [
  { value: 'orthodox', label: 'Ortodoxo' },
  { value: 'southpaw', label: 'Zurdo (Southpaw)' },
  { value: 'switch', label: 'Switch' },
]

const FOOTBALL_POSITIONS = [
  { value: 'gk', label: 'Portero (GK)' },
  { value: 'cb', label: 'Defensa Central (CB)' },
  { value: 'rb', label: 'Lateral Derecho (RB)' },
  { value: 'lb', label: 'Lateral Izquierdo (LB)' },
  { value: 'cdm', label: 'Mediocampista Defensivo (CDM)' },
  { value: 'cm', label: 'Mediocampista Central (CM)' },
  { value: 'cam', label: 'Mediocampista Ofensivo (CAM)' },
  { value: 'rw', label: 'Extremo Derecho (RW)' },
  { value: 'lw', label: 'Extremo Izquierdo (LW)' },
  { value: 'st', label: 'Delantero Centro (ST)' },
  { value: 'cf', label: 'Media Punta (CF)' },
]

const DOMINANT_FOOT = [
  { value: 'right', label: 'Derecho' },
  { value: 'left', label: 'Izquierdo' },
  { value: 'both', label: 'Ambidiestro' },
]

const BASKETBALL_POSITIONS = [
  { value: 'pg', label: 'Base (PG)' },
  { value: 'sg', label: 'Escolta (SG)' },
  { value: 'sf', label: 'Alero (SF)' },
  { value: 'pf', label: 'Ala-Pívot (PF)' },
  { value: 'c', label: 'Pívot (C)' },
]

const VOLLEYBALL_POSITIONS = [
  { value: 'setter', label: 'Armador / Colocador' },
  { value: 'outside_hitter', label: 'Punta / Receptor' },
  { value: 'middle_blocker', label: 'Central / Medio' },
  { value: 'opposite', label: 'Opuesto' },
  { value: 'libero', label: 'Líbero' },
]

const DOMINANT_HAND = [
  { value: 'right', label: 'Derecha' },
  { value: 'left', label: 'Izquierda' },
  { value: 'both', label: 'Ambidiestro' },
]

const SWIMMING_STROKES = [
  { value: 'freestyle', label: 'Estilo Libre (Crol)' },
  { value: 'backstroke', label: 'Espalda' },
  { value: 'breaststroke', label: 'Pecho / Braza' },
  { value: 'butterfly', label: 'Mariposa' },
  { value: 'medley', label: 'Combinado' },
]

const YOGA_STYLES = [
  { value: 'hatha', label: 'Hatha' },
  { value: 'vinyasa', label: 'Vinyasa' },
  { value: 'ashtanga', label: 'Ashtanga' },
  { value: 'yin', label: 'Yin' },
  { value: 'bikram', label: 'Bikram / Hot Yoga' },
  { value: 'kundalini', label: 'Kundalini' },
  { value: 'restorative', label: 'Restaurativo' },
  { value: 'power', label: 'Power Yoga' },
]

const YOGA_LEVELS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
  { value: 'instructor', label: 'Instructor' },
]

const CROSSFIT_LEVELS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'scaled', label: 'Scaled' },
  { value: 'rx', label: 'RX' },
  { value: 'competitor', label: 'Competidor' },
]

const TENNIS_PLAY_STYLE = [
  { value: 'baseline', label: 'Fondo de Cancha' },
  { value: 'serve_volley', label: 'Saque y Red' },
  { value: 'all_court', label: 'Completo' },
]

// ─── Sport configurations ────────────────────────────────────────────────────

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  'Jiu-Jitsu': {
    label: 'Jiu-Jitsu',
    sectionTitle: 'Artes Marciales – Jiu-Jitsu',
    hideJerseyNumber: true,
    fields: [
      { key: 'belt', label: 'Cinturón', type: 'select', options: BJJ_BELTS, required: true },
      { key: 'stripes', label: 'Grados (Stripes)', type: 'select', options: BJJ_STRIPES, helpText: 'Cantidad de franjas en el cinturón' },
      { key: 'weight_class', label: 'Categoría de Peso (IBJJF)', type: 'select', options: BJJ_WEIGHT_CLASSES },
      { key: 'competition_record', label: 'Récord Competitivo (V-D)', type: 'text', placeholder: 'Ej: 5-2' },
    ],
  },

  'Muay Thai': {
    label: 'Muay Thai',
    sectionTitle: 'Artes Marciales – Muay Thai',
    hideJerseyNumber: true,
    fields: [
      { key: 'level', label: 'Nivel', type: 'select', options: COMBAT_LEVEL },
      { key: 'weight_class', label: 'Categoría de Peso', type: 'select', options: COMBAT_WEIGHT_CLASSES },
      { key: 'stance', label: 'Guardia', type: 'select', options: STANCE_OPTIONS },
      { key: 'fights', label: 'Peleas (V-D-E)', type: 'text', placeholder: 'Ej: 8-2-0', helpText: 'Victorias - Derrotas - Empates' },
    ],
  },

  'Boxeo': {
    label: 'Boxeo',
    sectionTitle: 'Deportivo – Boxeo',
    hideJerseyNumber: true,
    fields: [
      { key: 'level', label: 'Nivel', type: 'select', options: COMBAT_LEVEL },
      { key: 'weight_class', label: 'Categoría de Peso', type: 'select', options: COMBAT_WEIGHT_CLASSES },
      { key: 'stance', label: 'Guardia', type: 'select', options: STANCE_OPTIONS },
      { key: 'fights', label: 'Récord (V-D-E)', type: 'text', placeholder: 'Ej: 12-3-1', helpText: 'Victorias - Derrotas - Empates' },
    ],
  },

  'MMA': {
    label: 'MMA',
    sectionTitle: 'Artes Marciales Mixtas',
    hideJerseyNumber: true,
    fields: [
      { key: 'level', label: 'Nivel', type: 'select', options: COMBAT_LEVEL },
      { key: 'weight_class', label: 'Categoría de Peso', type: 'select', options: COMBAT_WEIGHT_CLASSES },
      { key: 'stance', label: 'Guardia', type: 'select', options: STANCE_OPTIONS },
      { key: 'base_art', label: 'Arte Marcial Base', type: 'text', placeholder: 'Ej: BJJ, Wrestling, Muay Thai' },
      { key: 'fights', label: 'Récord (V-D-E)', type: 'text', placeholder: 'Ej: 5-1-0' },
    ],
  },

  'Karate': {
    label: 'Karate',
    sectionTitle: 'Artes Marciales – Karate',
    hideJerseyNumber: true,
    fields: [
      { key: 'belt', label: 'Cinturón', type: 'select', options: KARATE_BELTS, required: true },
      { key: 'style', label: 'Estilo', type: 'text', placeholder: 'Ej: Shotokan, Goju-Ryu, Kyokushin' },
      { key: 'weight_class', label: 'Categoría de Peso (WKF)', type: 'select', options: KARATE_WEIGHT_CLASSES },
      { key: 'kata_level', label: 'Nivel de Kata', type: 'text', placeholder: 'Ej: Heian Shodan, Bassai Dai' },
    ],
  },

  'Taekwondo': {
    label: 'Taekwondo',
    sectionTitle: 'Artes Marciales – Taekwondo',
    hideJerseyNumber: true,
    fields: [
      { key: 'belt', label: 'Cinturón', type: 'select', options: TAEKWONDO_BELTS, required: true },
      { key: 'weight_class', label: 'Categoría de Peso (WT)', type: 'select', options: TKD_WEIGHT_CLASSES },
      { key: 'poomsae_level', label: 'Nivel de Poomsae', type: 'text', placeholder: 'Ej: Taegeuk Il Jang' },
    ],
  },

  'Judo': {
    label: 'Judo',
    sectionTitle: 'Artes Marciales – Judo',
    hideJerseyNumber: true,
    fields: [
      { key: 'belt', label: 'Cinturón', type: 'select', options: JUDO_BELTS, required: true },
      { key: 'weight_class', label: 'Categoría de Peso (IJF)', type: 'select', options: JUDO_WEIGHT_CLASSES },
      { key: 'tokui_waza', label: 'Técnica Favorita (Tokui-waza)', type: 'text', placeholder: 'Ej: Osoto-gari, Seoi-nage' },
    ],
  },

  'Kickboxing': {
    label: 'Kickboxing',
    sectionTitle: 'Deportivo – Kickboxing',
    hideJerseyNumber: true,
    fields: [
      { key: 'level', label: 'Nivel', type: 'select', options: COMBAT_LEVEL },
      { key: 'weight_class', label: 'Categoría de Peso', type: 'select', options: COMBAT_WEIGHT_CLASSES },
      { key: 'stance', label: 'Guardia', type: 'select', options: STANCE_OPTIONS },
      { key: 'fights', label: 'Récord (V-D-E)', type: 'text', placeholder: 'Ej: 6-2-0' },
    ],
  },

  'Fútbol': {
    label: 'Fútbol',
    sectionTitle: 'Deportivo – Fútbol',
    hideJerseyNumber: false,
    fields: [
      { key: 'preferred_positions', label: 'Posiciones Preferidas', type: 'multiselect', options: FOOTBALL_POSITIONS, helpText: 'Selecciona una o más posiciones' },
      { key: 'dominant_foot', label: 'Pie Dominante', type: 'select', options: DOMINANT_FOOT },
      { key: 'height_cm', label: 'Altura (cm)', type: 'number', placeholder: 'Ej: 175', min: 100, max: 230 },
      { key: 'weight_kg', label: 'Peso (kg)', type: 'number', placeholder: 'Ej: 70', min: 30, max: 200 },
    ],
  },

  'Básquetbol': {
    label: 'Básquetbol',
    sectionTitle: 'Deportivo – Básquetbol',
    hideJerseyNumber: false,
    fields: [
      { key: 'preferred_positions', label: 'Posiciones Preferidas', type: 'multiselect', options: BASKETBALL_POSITIONS, helpText: 'Selecciona una o más posiciones' },
      { key: 'dominant_hand', label: 'Mano Dominante', type: 'select', options: DOMINANT_HAND },
      { key: 'height_cm', label: 'Altura (cm)', type: 'number', placeholder: 'Ej: 185', min: 100, max: 250 },
      { key: 'wingspan_cm', label: 'Envergadura (cm)', type: 'number', placeholder: 'Ej: 190', min: 100, max: 260 },
    ],
  },

  'Vóley': {
    label: 'Vóley',
    sectionTitle: 'Deportivo – Vóley',
    hideJerseyNumber: false,
    fields: [
      { key: 'preferred_positions', label: 'Posiciones Preferidas', type: 'multiselect', options: VOLLEYBALL_POSITIONS, helpText: 'Selecciona una o más posiciones' },
      { key: 'dominant_hand', label: 'Mano Dominante', type: 'select', options: DOMINANT_HAND },
      { key: 'height_cm', label: 'Altura (cm)', type: 'number', placeholder: 'Ej: 180', min: 100, max: 230 },
      { key: 'reach_cm', label: 'Alcance (cm)', type: 'number', placeholder: 'Ej: 310', min: 200, max: 400, helpText: 'Alcance máximo con un brazo' },
    ],
  },

  'Natación': {
    label: 'Natación',
    sectionTitle: 'Deportivo – Natación',
    hideJerseyNumber: true,
    fields: [
      { key: 'specialties', label: 'Estilos / Especialidades', type: 'multiselect', options: SWIMMING_STROKES, helpText: 'Selecciona uno o más estilos' },
      { key: 'level', label: 'Nivel', type: 'select', options: COMBAT_LEVEL },
      { key: 'best_event', label: 'Mejor Prueba', type: 'text', placeholder: 'Ej: 100m Libre, 200m Mariposa' },
      { key: 'best_time', label: 'Mejor Tiempo', type: 'text', placeholder: 'Ej: 1:02.34' },
    ],
  },

  'Tenis': {
    label: 'Tenis',
    sectionTitle: 'Deportivo – Tenis',
    hideJerseyNumber: true,
    fields: [
      { key: 'dominant_hand', label: 'Mano Dominante', type: 'select', options: DOMINANT_HAND },
      { key: 'play_style', label: 'Estilo de Juego', type: 'select', options: TENNIS_PLAY_STYLE },
      { key: 'level', label: 'Nivel', type: 'select', options: COMBAT_LEVEL },
      { key: 'ranking', label: 'Ranking / UTR', type: 'text', placeholder: 'Ej: 4.5 UTR' },
      { key: 'backhand', label: 'Revés', type: 'select', options: [{ value: 'one_hand', label: 'Una mano' }, { value: 'two_hands', label: 'Dos manos' }] },
    ],
  },

  'Yoga': {
    label: 'Yoga',
    sectionTitle: 'Práctica – Yoga',
    hideJerseyNumber: true,
    fields: [
      { key: 'level', label: 'Nivel', type: 'select', options: YOGA_LEVELS },
      { key: 'preferred_styles', label: 'Estilos Preferidos', type: 'multiselect', options: YOGA_STYLES },
      { key: 'practice_years', label: 'Años de Práctica', type: 'number', placeholder: 'Ej: 3', min: 0, max: 50 },
      { key: 'injuries_limitations', label: 'Lesiones o Limitaciones', type: 'text', placeholder: 'Ej: Dolor lumbar, rodilla derecha' },
    ],
  },

  'Crossfit': {
    label: 'Crossfit',
    sectionTitle: 'Deportivo – Crossfit',
    hideJerseyNumber: true,
    fields: [
      { key: 'level', label: 'Nivel', type: 'select', options: CROSSFIT_LEVELS },
      { key: 'experience_years', label: 'Años de Experiencia', type: 'number', placeholder: 'Ej: 2', min: 0, max: 30 },
      { key: 'height_cm', label: 'Altura (cm)', type: 'number', placeholder: 'Ej: 175', min: 100, max: 230 },
      { key: 'weight_kg', label: 'Peso (kg)', type: 'number', placeholder: 'Ej: 80', min: 30, max: 200 },
      { key: 'pr_notes', label: 'PRs Destacados', type: 'text', placeholder: 'Ej: Back Squat 120kg, Fran 3:15' },
    ],
  },

  'Otro': {
    label: 'Otro',
    sectionTitle: 'Deportivo',
    hideJerseyNumber: false,
    fields: [
      { key: 'level', label: 'Nivel', type: 'select', options: COMBAT_LEVEL },
      { key: 'specialty', label: 'Especialidad', type: 'text', placeholder: 'Ej: Especialidad o disciplina' },
    ],
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getSportConfig(sportType: string | null | undefined): SportConfig | null {
  if (!sportType) return null
  return SPORT_CONFIGS[sportType] ?? null
}

export function getSportFieldLabel(sportType: string | null | undefined, key: string): string {
  const config = getSportConfig(sportType)
  if (!config) return key
  const field = config.fields.find((f) => f.key === key)
  return field?.label ?? key
}

export function getSportFieldDisplayValue(
  sportType: string | null | undefined,
  key: string,
  value: unknown
): string {
  const config = getSportConfig(sportType)
  if (!config) return String(value ?? '')

  const field = config.fields.find((f) => f.key === key)
  if (!field) return String(value ?? '')

  if (field.type === 'select' && field.options) {
    const opt = field.options.find((o) => o.value === value)
    return opt?.label ?? String(value ?? '')
  }

  if (field.type === 'multiselect' && field.options && Array.isArray(value)) {
    return (value as string[])
      .map((v) => field.options!.find((o) => o.value === v)?.label ?? v)
      .join(', ')
  }

  return String(value ?? '')
}
