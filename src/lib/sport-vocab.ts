export interface SportVocab {
  athletes: string      // "Alumnos" | "Jugadores" | "Atletas"
  athlete: string       // "Alumno" | "Jugador"
  coach: string         // "Entrenador" | "Coach" | "Sensei"
  coachPlural: string   // "Entrenadores" | "Coaches"
  competition: string   // "Competencias" | "Campeonatos"
  competitions: string  // plural nav label
  roster: string        // "Nómina" | "Convocatoria"
  rosters: string
  session: string       // "Sesión" | "Clase" | "Entrenamiento"
  team: string          // "Club" | "Equipo" | "Dojo" | "Gym"
  sport: string         // display name
  isTeamSport: boolean  // true = colectivo (fútbol, bball…), false = individual (BJJ, yoga…)
}

const MAP: Record<string, SportVocab> = {
  'Básquetbol': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Campeonato', competitions: 'Campeonatos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '🏀 Básquetbol', isTeamSport: true,
  },
  'Fútbol': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'DT', coachPlural: 'Cuerpo Técnico',
    competition: 'Campeonato', competitions: 'Campeonatos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '⚽ Fútbol', isTeamSport: true,
  },
  'Futsal': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '🥅 Futsal', isTeamSport: true,
  },
  'Vóley': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '🏐 Vóley', isTeamSport: true,
  },
  'Handball': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Campeonato', competitions: 'Campeonatos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '🤾 Handball', isTeamSport: true,
  },
  'Jiu-Jitsu': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Sensei', coachPlural: 'Senseis',
    competition: 'Campeonato', competitions: 'Campeonatos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Academia', sport: '🥋 Jiu-Jitsu', isTeamSport: false,
  },
  'Muay Thai': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Kru', coachPlural: 'Krus',
    competition: 'Combate', competitions: 'Combates', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Gym', sport: '🥊 Muay Thai', isTeamSport: false,
  },
  'Boxeo': {
    athletes: 'Boxeadores', athlete: 'Boxeador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Pelea', competitions: 'Peleas', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Gym', sport: '🥊 Boxeo', isTeamSport: false,
  },
  'MMA': {
    athletes: 'Peleadores', athlete: 'Peleador', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Combate', competitions: 'Combates', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Gym', sport: '🥋 MMA', isTeamSport: false,
  },
  'Karate': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Sensei', coachPlural: 'Senseis',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Dojo', sport: '🥋 Karate', isTeamSport: false,
  },
  'Taekwondo': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Sabom', coachPlural: 'Saboms',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Dojo', sport: '🥋 Taekwondo', isTeamSport: false,
  },
  'Judo': {
    athletes: 'Judokas', athlete: 'Judoka', coach: 'Sensei', coachPlural: 'Senseis',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Dojo', sport: '🥋 Judo', isTeamSport: false,
  },
  'Lucha': {
    athletes: 'Luchadores', athlete: 'Luchador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Equipo', sport: '🤼 Lucha', isTeamSport: false,
  },
  'Kickboxing': {
    athletes: 'Peleadores', athlete: 'Peleador', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Combate', competitions: 'Combates', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Gym', sport: '🥊 Kickboxing', isTeamSport: false,
  },
  'Natación': {
    athletes: 'Nadadores', athlete: 'Nadador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Competencia', competitions: 'Competencias', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Club', sport: '🏊 Natación', isTeamSport: false,
  },
  'Tenis': {
    athletes: 'Tenistas', athlete: 'Tenista', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Club', sport: '🎾 Tenis', isTeamSport: false,
  },
  'Atletismo': {
    athletes: 'Atletas', athlete: 'Atleta', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Competencia', competitions: 'Competencias', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Club', sport: '🏃 Atletismo', isTeamSport: false,
  },
  'Yoga': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Instructor', coachPlural: 'Instructores',
    competition: 'Evento', competitions: 'Eventos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Centro', sport: '🧘 Yoga', isTeamSport: false,
  },
  'Crossfit': {
    athletes: 'Atletas', athlete: 'Atleta', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Competencia', competitions: 'Competencias', roster: 'Nómina', rosters: 'Nóminas',
    session: 'WOD', team: 'Box', sport: '🏋️ Crossfit', isTeamSport: false,
  },
}

const DEFAULT: SportVocab = {
  athletes: 'Alumnos', athlete: 'Alumno', coach: 'Entrenador', coachPlural: 'Entrenadores',
  competition: 'Competencia', competitions: 'Competencias', roster: 'Nómina', rosters: 'Nóminas',
  session: 'Sesión', team: 'Club', sport: '🏅 Club', isTeamSport: true,
}

/**
 * Normaliza una clave de deporte para un lookup tolerante a idioma, tildes,
 * mayúsculas y separadores: "Básquetbol", "BASQUETBOL", "Básquet-bol" → "basquetbol".
 */
function normalizeSportKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s._-]+/g, '')
}

// Índice de las claves canónicas del MAP por su forma normalizada.
const NORMALIZED_MAP: Record<string, SportVocab> = {}
for (const [key, vocab] of Object.entries(MAP)) {
  NORMALIZED_MAP[normalizeSportKey(key)] = vocab
}

/**
 * Sinónimos y otros idiomas → forma normalizada de la clave canónica del MAP.
 * Cubre los valores en inglés que llegan de algunas integraciones (p. ej. el
 * sport_type "basketball") y variantes regionales comunes. Solo se listan los
 * que NO coinciden ya por normalización directa.
 */
const SPORT_ALIASES: Record<string, string> = {
  basketball: 'basquetbol', baloncesto: 'basquetbol', basket: 'basquetbol', bball: 'basquetbol',
  football: 'futbol', soccer: 'futbol',
  volleyball: 'voley', voleibol: 'voley', volei: 'voley',
  balonmano: 'handball',
  swimming: 'natacion',
  tennis: 'tenis',
  athletics: 'atletismo', running: 'atletismo',
  boxing: 'boxeo',
  wrestling: 'lucha',
  bjj: 'jiujitsu',
}

export function getSportVocab(sportType: string | null | undefined): SportVocab {
  if (!sportType) return DEFAULT
  const norm = normalizeSportKey(sportType)
  // 1) match directo contra las claves canónicas normalizadas
  if (NORMALIZED_MAP[norm]) return NORMALIZED_MAP[norm]
  // 2) alias (otro idioma / variante) → clave canónica
  const canonical = SPORT_ALIASES[norm]
  if (canonical && NORMALIZED_MAP[canonical]) return NORMALIZED_MAP[canonical]
  return DEFAULT
}
