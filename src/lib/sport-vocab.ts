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
}

const MAP: Record<string, SportVocab> = {
  'Básquetbol': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Campeonato', competitions: 'Campeonatos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '🏀 Básquetbol',
  },
  'Fútbol': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'DT', coachPlural: 'Cuerpo Técnico',
    competition: 'Campeonato', competitions: 'Campeonatos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '⚽ Fútbol',
  },
  'Futsal': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '🥅 Futsal',
  },
  'Vóley': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '🏐 Vóley',
  },
  'Handball': {
    athletes: 'Jugadores', athlete: 'Jugador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Campeonato', competitions: 'Campeonatos', roster: 'Convocatoria', rosters: 'Convocatorias',
    session: 'Entrenamiento', team: 'Equipo', sport: '🤾 Handball',
  },
  'Jiu-Jitsu': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Sensei', coachPlural: 'Senseis',
    competition: 'Campeonato', competitions: 'Campeonatos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Academia', sport: '🥋 Jiu-Jitsu',
  },
  'Muay Thai': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Kru', coachPlural: 'Krus',
    competition: 'Combate', competitions: 'Combates', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Gym', sport: '🥊 Muay Thai',
  },
  'Boxeo': {
    athletes: 'Boxeadores', athlete: 'Boxeador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Pelea', competitions: 'Peleas', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Gym', sport: '🥊 Boxeo',
  },
  'MMA': {
    athletes: 'Peleadores', athlete: 'Peleador', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Combate', competitions: 'Combates', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Gym', sport: '🥋 MMA',
  },
  'Karate': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Sensei', coachPlural: 'Senseis',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Dojo', sport: '🥋 Karate',
  },
  'Taekwondo': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Sabom', coachPlural: 'Saboms',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Dojo', sport: '🥋 Taekwondo',
  },
  'Judo': {
    athletes: 'Judokas', athlete: 'Judoka', coach: 'Sensei', coachPlural: 'Senseis',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Dojo', sport: '🥋 Judo',
  },
  'Lucha': {
    athletes: 'Luchadores', athlete: 'Luchador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Equipo', sport: '🤼 Lucha',
  },
  'Kickboxing': {
    athletes: 'Peleadores', athlete: 'Peleador', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Combate', competitions: 'Combates', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Gym', sport: '🥊 Kickboxing',
  },
  'Natación': {
    athletes: 'Nadadores', athlete: 'Nadador', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Competencia', competitions: 'Competencias', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Club', sport: '🏊 Natación',
  },
  'Tenis': {
    athletes: 'Tenistas', athlete: 'Tenista', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Torneo', competitions: 'Torneos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Club', sport: '🎾 Tenis',
  },
  'Atletismo': {
    athletes: 'Atletas', athlete: 'Atleta', coach: 'Entrenador', coachPlural: 'Entrenadores',
    competition: 'Competencia', competitions: 'Competencias', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Entrenamiento', team: 'Club', sport: '🏃 Atletismo',
  },
  'Yoga': {
    athletes: 'Alumnos', athlete: 'Alumno', coach: 'Instructor', coachPlural: 'Instructores',
    competition: 'Evento', competitions: 'Eventos', roster: 'Nómina', rosters: 'Nóminas',
    session: 'Clase', team: 'Centro', sport: '🧘 Yoga',
  },
  'Crossfit': {
    athletes: 'Atletas', athlete: 'Atleta', coach: 'Coach', coachPlural: 'Coaches',
    competition: 'Competencia', competitions: 'Competencias', roster: 'Nómina', rosters: 'Nóminas',
    session: 'WOD', team: 'Box', sport: '🏋️ Crossfit',
  },
}

const DEFAULT: SportVocab = {
  athletes: 'Alumnos', athlete: 'Alumno', coach: 'Entrenador', coachPlural: 'Entrenadores',
  competition: 'Competencia', competitions: 'Competencias', roster: 'Nómina', rosters: 'Nóminas',
  session: 'Sesión', team: 'Club', sport: '🏅 Club',
}

export function getSportVocab(sportType: string | null | undefined): SportVocab {
  if (!sportType) return DEFAULT
  return MAP[sportType] ?? DEFAULT
}
