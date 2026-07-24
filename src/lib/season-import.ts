// ─────────────────────────────────────────────────────────────────────────────
// Importador de temporada desde planilla .xlsx (estadísticas de partidos).
//
// Lógica pura (sin Next/Clerk/cookies) para poder testearla sin HTTP:
// la ruta POST /api/season-import es un wrapper delgado que resuelve la
// autenticación, valida el archivo y delega aquí.
//
// Formato esperado del workbook:
//   - Una hoja "resumen" cuyo nombre es "YYYY-N" (ej: "2026-1") → define la
//     temporada. Sus stats NO se importan (son derivadas de los partidos).
//   - Cada hoja restante es un partido: el nombre trae la fecha ("29 mar",
//     "08 jun"), una fila opcional "VS RIVAL" arriba, y una tabla cuyo
//     encabezado parte en la celda "JUGADOR" (puede estar en la fila 1 o 3).
// ─────────────────────────────────────────────────────────────────────────────

import * as XLSX from 'xlsx'
import type { SupabaseClient } from '@supabase/supabase-js'
import { calendarDateInTimeZone } from '@/lib/attendance/clubCheckIn'

/** Marca de origen (`meta.source`) de todo lo escrito por este importador. */
export const SEASON_IMPORT_SOURCE = 'season-xlsx'

/** Error de validación del archivo — la ruta lo traduce a un 4xx. */
export class SeasonImportError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'SeasonImportError'
    this.status = status
  }
}

/** Cómo se resolvió cada jugador del Excel contra los atletas del club. */
export interface PlayerMatchInfo {
  /** Nombre tal cual aparece en el Excel. */
  excel: string
  /** Nombre del atleta del club al que quedó vinculado (null si no hay). */
  matched: string | null
  kind: 'exact' | 'fuzzy' | 'create' | 'ambiguous'
  /** El atleta vinculado es un perfil archivado. */
  archived: boolean
  /** Solo kind='ambiguous': los perfiles que calzaban. */
  candidates?: string[]
}

export interface SeasonImportSummary {
  season: string
  matches_created: number
  matches_updated: number
  events_written: number
  athletes_created: string[]
  unmatched_players: string[]
  players: PlayerMatchInfo[]
}

export interface SeasonImportResult {
  ok: true
  /** true si fue una vista previa: no se escribió nada en la base. */
  dry_run: boolean
  log: string[]
  errors: string[]
  summary: SeasonImportSummary
}

// ─── Mapeo de columnas del Excel → event_type ────────────────────────────────
//
// Claves canónicas (las que lee la UI de basketball): pts2, pts3, ft, reb_off,
// reb_def, ast, stl, blk, foul, to. La UI muestra event_value TAL CUAL (nunca
// multiplica), y sus labels son "Puntos 2P"/"Puntos 3P": por eso los encestes
// del Excel (2PM/3PM) se convierten a PUNTOS con `factor` (2PM×2, 3PM×3).
// FTM vale 1 punto por enceste, así que va sin conversión.
//
// Claves extra no-canónicas (no las muestra el editor, pero quedan disponibles
// con nombres estables): minutes, fta, p2a, p3a, val, plus_minus.
const COLUMNAS_STATS: Record<string, { key: string; factor?: number }> = {
  MIN: { key: 'minutes' },
  FTM: { key: 'ft' },
  FTA: { key: 'fta' },
  '2PM': { key: 'pts2', factor: 2 },
  '2PA': { key: 'p2a' },
  '3PM': { key: 'pts3', factor: 3 },
  '3PA': { key: 'p3a' },
  OR: { key: 'reb_off' },
  DR: { key: 'reb_def' },
  AST: { key: 'ast' },
  TO: { key: 'to' },
  STL: { key: 'stl' },
  BLK: { key: 'blk' },
  PF: { key: 'foul' },
  VAL: { key: 'val' },
  '+/-': { key: 'plus_minus' },
}

/** Columnas derivadas que NO se importan (la app las recalcula). */
const COLUMNAS_DERIVADAS = new Set(['PTS', '%TL', '%2P', '%3P', 'REB'])

/**
 * Claves rotas de una carga antigua defectuosa (la UI no las lee). Al
 * reescribir un partido se limpian, scoped al match_id — nunca club-wide.
 */
const LEGACY_EVENT_TYPES = [
  'minutes', 'plus_minus', 'points_2', 'points_3', 'free_throw',
  'free_throw_att', '2pa', '3pa', 'turnover', 'steal', 'assist',
  'rebound_off', 'rebound_def', 'block',
]

/**
 * La carga antigua defectuosa marcó sus filas con meta.source = 'xlsx-…'
 * (ej: 'xlsx-shohoku-2026-1'). Se limpian por completo al reescribir el
 * partido — incluye sus filas con claves canónicas (ej: 'foul') que la lista
 * legacy no cubre. Nunca matchea 'season-xlsx' (no empieza con 'xlsx-').
 */
const LEGACY_SOURCE_PATTERN = 'xlsx-%'

/** Todas las claves de event_type que escribe este importador. */
const CLAVES_IMPORTADOR = Array.from(new Set(Object.values(COLUMNAS_STATS).map((d) => d.key)))

/**
 * Claves a limpiar (scoped al match) cuando meta.source es NULL: las legacy
 * rotas + las que escribe este importador. Estas últimas son necesarias porque
 * el editor de stats (upsertPlayerStats en matches.ts) borra TODO el partido y
 * reinserta SIN meta: tras un guardado del editor, los eventos importados
 * pierden su marca `season-xlsx` y, sin esta limpieza, un re-import los
 * duplicaría (la UI suma por event_type → stats dobladas).
 */
const CLAVES_LIMPIEZA_SIN_SOURCE = Array.from(new Set([...LEGACY_EVENT_TYPES, ...CLAVES_IMPORTADOR]))

// ─── Helpers de parseo ───────────────────────────────────────────────────────

const MESES: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
}

/**
 * "29 mar" / "08 jun" + año → "2026-03-29" | null si no es una hoja de partido.
 *
 * El año viene del nombre de la hoja resumen ("2026-1"): las hojas de partido
 * no traen año, así que una temporada no puede cruzar el cambio de año
 * (limitación conocida del formato de la planilla).
 */
function fechaDesdeNombreHoja(nombre: string, anio: number): string | null {
  const m = nombre.trim().toLowerCase().match(/^(\d{1,2})\s+([a-zñáéíóúü]{3,})$/)
  if (!m) return null
  const dia = Number(m[1])
  const mes = MESES[m[2].slice(0, 3)]
  if (!mes) return null
  // Validar que el día exista en ese mes: "31 feb" debe rechazarse aquí en vez
  // de llegar como fecha inválida al insert en Postgres.
  const fecha = new Date(Date.UTC(anio, Number(mes) - 1, dia))
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== Number(mes) - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null
  }
  return `${anio}-${mes}-${String(dia).padStart(2, '0')}`
}

/**
 * Número desde una celda del Excel. Tolera las anomalías reales del archivo:
 * texto con coma decimal ("9,4" → 9.4), enteros como texto ("8"), "-" y vacío
 * (→ null, se omite la fila).
 */
function parseNumero(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s || s === '-') return null
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Normaliza nombres para matching: trim, espacios colapsados, casefold, sin tildes. */
function normalizar(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Tokens del nombre normalizado ("Daniel Ram\u00edrez Varela" \u2192 ["daniel","ramirez","varela"]). */
function tokensDe(s: string): string[] {
  return normalizar(s).split(' ').filter(Boolean)
}

/** Tipo de temporada según el sufijo del nombre ("2026-1" → apertura). */
function tipoTemporada(nombre: string): 'apertura' | 'clausura' | 'other' {
  if (nombre.endsWith('-1')) return 'apertura'
  if (nombre.endsWith('-2')) return 'clausura'
  return 'other'
}

interface JugadorParseado {
  nombre: string
  /** event_type → event_value (ya convertido a puntos donde corresponde). */
  stats: Record<string, number>
}

interface PartidoParseado {
  hoja: string
  fecha: string // YYYY-MM-DD
  rival: string | null
  jugadores: JugadorParseado[]
  /** FTM×1 + 2PM×2 + 3PM×3 del equipo (= suma de ft + pts2 + pts3). */
  puntosEquipo: number
}

/** Parsea una hoja de partido. Devuelve null si no tiene encabezado JUGADOR. */
function parsearHojaPartido(
  ws: XLSX.WorkSheet,
  hoja: string,
  fecha: string,
  advertencias: string[]
): PartidoParseado | null {
  const filas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true })

  // Encabezado: buscar la celda "JUGADOR" (puede estar en la fila 0 o 2).
  let filaHeader = -1
  let colNombre = -1
  for (let i = 0; i < Math.min(filas.length, 10); i++) {
    const idx = (filas[i] ?? []).findIndex(
      (c) => typeof c === 'string' && c.trim().toUpperCase() === 'JUGADOR'
    )
    if (idx >= 0) { filaHeader = i; colNombre = idx; break }
  }
  if (filaHeader < 0) return null

  // Rival: fila "VS X" por encima del encabezado (opcional — hay hojas sin ella).
  let rival: string | null = null
  for (let i = 0; i < filaHeader && !rival; i++) {
    for (const celda of filas[i] ?? []) {
      if (typeof celda !== 'string') continue
      const m = celda.trim().match(/^vs[\s.:]+(.+)$/i)
      if (m) { rival = m[1].trim(); break }
    }
  }

  // Mapear columnas del encabezado a event_type.
  const encabezado = filas[filaHeader] ?? []
  const columnas: Array<{ col: number; key: string; factor: number }> = []
  const desconocidas: string[] = []
  let colPts = -1 // columna PTS: no se importa, solo valida consistencia
  for (let c = colNombre + 1; c < encabezado.length; c++) {
    const celda = encabezado[c]
    if (typeof celda !== 'string' || !celda.trim()) continue
    const titulo = celda.trim().toUpperCase()
    const def = COLUMNAS_STATS[titulo]
    if (def) columnas.push({ col: c, key: def.key, factor: def.factor ?? 1 })
    else if (titulo === 'PTS') colPts = c
    else if (!COLUMNAS_DERIVADAS.has(titulo)) desconocidas.push(celda.trim())
  }
  if (desconocidas.length > 0) {
    advertencias.push(`⚠️ Hoja "${hoja}": columnas no reconocidas ignoradas (${desconocidas.join(', ')})`)
  }

  // Filas de jugadores.
  const jugadores: JugadorParseado[] = []
  let puntosEquipo = 0
  for (let f = filaHeader + 1; f < filas.length; f++) {
    const fila = filas[f] ?? []
    const crudo = fila[colNombre]
    const nombre = typeof crudo === 'string' ? crudo.trim() : ''
    if (!nombre) continue
    if (/^total/i.test(nombre)) continue // filas agregadas no se importan

    const stats: Record<string, number> = {}
    let tieneDatoNumerico = false
    for (const { col, key, factor } of columnas) {
      const n = parseNumero(fila[col])
      if (n === null) continue
      tieneDatoNumerico = true
      const valor = n * factor
      // 0 no aporta (el editor también descarta ceros); se conservan negativos (+/-).
      if (valor !== 0) stats[key] = (stats[key] ?? 0) + valor
    }
    // Fila sin ningún dato numérico = no jugó → se salta.
    if (!tieneDatoNumerico) continue

    // Validación: la columna PTS es derivada y no se importa, pero si no
    // cuadra con los encestes se avisa (el marcador se calcula con la fórmula).
    const puntosJugador = (stats['ft'] ?? 0) + (stats['pts2'] ?? 0) + (stats['pts3'] ?? 0)
    const ptsDeclarados = colPts >= 0 ? parseNumero(fila[colPts]) : null
    if (ptsDeclarados !== null && ptsDeclarados !== puntosJugador) {
      advertencias.push(
        `⚠️ Hoja "${hoja}": ${nombre} declara PTS=${ptsDeclarados} pero FTM+2·2PM+3·3PM=${puntosJugador} — se importan los encestes`
      )
    }

    puntosEquipo += puntosJugador
    jugadores.push({ nombre, stats })
  }

  return { hoja, fecha, rival, jugadores, puntosEquipo }
}

// ─── Tipos de filas de DB usados por el importador ──────────────────────────

interface MatchRow {
  id: string
  match_date: string
  opponent: string | null
  status: string
  /** El marcador es literal por lado: home_score/away_score según is_home. */
  is_home: boolean
  home_score: number | null
  away_score: number | null
  season_id: string | null
  competition_id: string | null
  meta: Record<string, unknown> | null
}

// ─── Importación ─────────────────────────────────────────────────────────────

/**
 * Importa una temporada completa desde un workbook .xlsx.
 *
 * Idempotente: re-subir el mismo archivo no duplica temporada, partidos,
 * atletas ni eventos (los eventos con meta.source = 'season-xlsx' de cada
 * partido se borran y reescriben; también las filas sin source con claves que
 * escribe este importador, porque el editor de stats reinserta sin meta).
 *
 * @param buf      contenido del archivo (.xlsx)
 * @param clubId   club destino — SIEMPRE derivado server-side del usuario
 *                 autenticado, nunca de un parámetro del cliente
 * @param supabase cliente service_role (createAdminClient())
 * @param opts.dryRun vista previa: calcula todo el plan (matching de jugadores,
 *                 partidos a crear/actualizar, eventos) SIN escribir nada.
 */
export async function importSeasonWorkbook(
  buf: Buffer | ArrayBuffer,
  clubId: string,
  supabase: SupabaseClient,
  opts: { dryRun?: boolean } = {}
): Promise<SeasonImportResult> {
  const dryRun = opts.dryRun === true
  const log: string[] = []
  const errors: string[] = []

  // ── 1. Leer workbook ────────────────────────────────────────────────────
  let wb: XLSX.WorkBook
  try {
    wb = buf instanceof ArrayBuffer
      ? XLSX.read(new Uint8Array(buf), { type: 'array' })
      : XLSX.read(buf, { type: 'buffer' })
  } catch {
    throw new SeasonImportError(422, 'No se pudo leer el archivo. ¿Es un .xlsx válido?')
  }

  // ── 2. Hoja resumen = temporada ("2026-1") ─────────────────────────────
  const hojaResumen = wb.SheetNames.find((n) => /^\d{4}-\d$/.test(n.trim()))
  if (!hojaResumen) {
    throw new SeasonImportError(
      422,
      'No se encontró la hoja resumen de temporada (nombre con formato "YYYY-N", ej: "2026-1")'
    )
  }
  const nombreTemporada = hojaResumen.trim()
  const anio = Number(nombreTemporada.slice(0, 4))
  log.push(`✅ Hoja resumen detectada: "${nombreTemporada}" (sus stats no se importan: son derivadas)`)

  // ── 3. Parsear hojas de partido ─────────────────────────────────────────
  const partidos: PartidoParseado[] = []
  for (const nombreHoja of wb.SheetNames) {
    if (nombreHoja === hojaResumen) continue
    const fecha = fechaDesdeNombreHoja(nombreHoja, anio)
    if (!fecha) {
      errors.push(`⚠️ Hoja "${nombreHoja}" no tiene una fecha válida ("D mes", ej: "29 mar") — se omite`)
      continue
    }
    const parseado = parsearHojaPartido(wb.Sheets[nombreHoja], nombreHoja, fecha, errors)
    if (!parseado) {
      errors.push(`⚠️ Hoja "${nombreHoja}": no se encontró el encabezado "JUGADOR" — se omite`)
      continue
    }
    partidos.push(parseado)
  }
  if (partidos.length === 0) {
    throw new SeasonImportError(422, 'El archivo no contiene hojas de partido válidas')
  }
  // Orden cronológico (en el workbook pueden venir desordenadas).
  partidos.sort((a, b) => a.fecha.localeCompare(b.fecha))

  const fechas = partidos.map((p) => p.fecha)
  const fechaInicio = fechas[0]
  const fechaFin = fechas[fechas.length - 1]

  // ── 4. Temporada: buscar por (club_id, name) o crear ────────────────────
  let seasonId: string
  const { data: temporadaExistente, error: errBuscarTemporada } = await supabase
    .from('club_seasons')
    .select('id')
    .eq('club_id', clubId)
    .eq('name', nombreTemporada)
    .limit(1)
    .maybeSingle()
  if (errBuscarTemporada) throw new Error(`Error buscando temporada: ${errBuscarTemporada.message}`)

  if (temporadaExistente) {
    seasonId = temporadaExistente.id as string
    log.push(`✅ Temporada existente: "${nombreTemporada}"`)
  } else if (dryRun) {
    seasonId = 'dry:season'
    log.push(
      `➕ (previa) Se creará la temporada "${nombreTemporada}" ` +
      `(${tipoTemporada(nombreTemporada)} ${anio}, ${fechaInicio} → ${fechaFin})`
    )
  } else {
    const tipo = tipoTemporada(nombreTemporada)
    const { data: creada, error: errCrear } = await supabase
      .from('club_seasons')
      .insert({
        club_id: clubId,
        name: nombreTemporada,
        type: tipo,
        year: anio,
        start_date: fechaInicio,
        end_date: fechaFin,
        is_active: false,
        description: 'Importada desde planilla de estadísticas (.xlsx)',
      })
      .select('id')
      .single()

    if (errCrear) {
      // UNIQUE (club_id, type, year): ya existe una temporada de ese tipo/año
      // con otro nombre — se reutiliza en vez de fallar.
      if (errCrear.code === '23505') {
        const { data: porTipo } = await supabase
          .from('club_seasons')
          .select('id, name')
          .eq('club_id', clubId)
          .eq('type', tipo)
          .eq('year', anio)
          .limit(1)
          .maybeSingle()
        if (!porTipo) throw new Error(`Error creando temporada: ${errCrear.message}`)
        seasonId = porTipo.id as string
        errors.push(`⚠️ Ya existía la temporada ${tipo} ${anio} con nombre "${porTipo.name}" — se reutiliza`)
      } else {
        throw new Error(`Error creando temporada: ${errCrear.message}`)
      }
    } else {
      seasonId = creada.id as string
      log.push(`✅ Temporada creada: "${nombreTemporada}" (${tipo} ${anio}, ${fechaInicio} → ${fechaFin})`)
    }
  }

  // "Hoy" en la zona horaria del club, no en UTC: con UTC, desde las ~20:00
  // hora de Chile un partido fechado mañana ya cumpliría fecha <= hoy y se
  // marcaría 'finished' antes de jugarse. Se usa para el status de la
  // competencia y de cada partido.
  const { data: clubRow } = await supabase
    .from('clubs')
    .select('timezone')
    .eq('id', clubId)
    .maybeSingle()
  let hoy: string
  try {
    hoy = calendarDateInTimeZone(new Date(), (clubRow?.timezone as string | null) || 'America/Santiago')
  } catch {
    // Zona horaria inválida en la config del club → default Chile.
    hoy = calendarDateInTimeZone(new Date(), 'America/Santiago')
  }

  // ── 4b. Competencia: el módulo "Competencias" lista `competitions` y cuelga
  // los partidos por competition_id. La temporada (club_seasons) es solo el
  // periodo; sin una competencia ligada, los partidos no aparecen en esa vista.
  //
  // Se usa UNA competencia DEDICADA a la planilla, identificada por su nombre
  // ("Temporada YYYY-N"). NO se reutiliza cualquier competencia de la temporada:
  // una temporada puede tener varias (una liga y un torneo distintos, p. ej.
  // "Deutsche Basket" e "Italo Hispano" en Apertura 2026) y colgar los partidos
  // de una elegida al azar los mezclaría con una competencia ajena.
  const nombreCompetencia = `Temporada ${nombreTemporada}`
  let competitionId: string | null = null

  // Reutilizar solo si ya existe una competencia con ESE nombre (idempotencia
  // del re-import); si no, crearla.
  const { data: compPorNombre } = await supabase
    .from('competitions')
    .select('id, season_id')
    .eq('club_id', clubId)
    .eq('name', nombreCompetencia)
    .limit(1)
    .maybeSingle()

  if (compPorNombre) {
    competitionId = compPorNombre.id as string
    if (!dryRun && !compPorNombre.season_id) {
      await supabase
        .from('competitions')
        .update({ season_id: seasonId })
        .eq('id', competitionId)
        .eq('club_id', clubId)
    }
    log.push(
      compPorNombre.season_id
        ? `✅ Competencia "${nombreCompetencia}" reutilizada`
        : `✅ Competencia "${nombreCompetencia}" reutilizada y ligada a la temporada`
    )
  } else if (dryRun) {
    competitionId = 'dry:competition'
    log.push(`➕ (previa) Se creará la competencia "${nombreCompetencia}" (liga, basketball)`)
  } else {
    // Crear la competición. status según si la temporada ya terminó.
    const { data: nuevaComp, error: errComp } = await supabase
      .from('competitions')
      .insert({
        club_id: clubId,
        name: nombreCompetencia,
        type: 'league',
        sport: 'basketball',
        start_date: fechaInicio,
        end_date: fechaFin,
        status: fechaFin <= hoy ? 'finished' : 'active',
        season_id: seasonId,
        description: 'Creada por la importación de temporada (.xlsx)',
      })
      .select('id')
      .single()
    if (errComp || !nuevaComp) {
      // Sin competición los partidos igual se importan (quedan sueltos); se avisa.
      errors.push(`⚠️ No se pudo crear la competencia "${nombreCompetencia}": ${errComp?.message ?? 'sin datos'} — los partidos quedarán sin competencia`)
    } else {
      competitionId = nuevaComp.id as string
      log.push(`✅ Competencia creada: "${nombreCompetencia}" (liga, basketball)`)
    }
  }

  // ── 5. Atletas del club: índice por nombre normalizado ─────────────────
  // Lectura paginada: PostgREST tiene un tope de filas por request (max-rows,
  // típicamente 1000) que truncaría en silencio el índice en clubes grandes y
  // haría crear atletas duplicados.
  const PAGINA_ATLETAS = 1000
  const atletas: Array<{ id: string; name: string; archived_at: string | null }> = []
  for (let desde = 0; ; desde += PAGINA_ATLETAS) {
    const { data, error: errAtletas } = await supabase
      .from('athletes')
      .select('id, name, archived_at')
      .eq('club_id', clubId)
      .order('id', { ascending: true })
      .range(desde, desde + PAGINA_ATLETAS - 1)
    if (errAtletas) throw new Error(`Error leyendo atletas: ${errAtletas.message}`)
    atletas.push(...((data ?? []) as typeof atletas))
    if (!data || data.length < PAGINA_ATLETAS) break
  }

  const porNombre = new Map<string, { id: string; name: string; archivado: boolean }>()
  for (const a of atletas) {
    const clave = normalizar(a.name as string)
    const archivado = a.archived_at !== null
    const previo = porNombre.get(clave)
    // Ante nombres duplicados se prefiere el perfil no archivado.
    if (!previo || (previo.archivado && !archivado)) {
      porNombre.set(clave, { id: a.id as string, name: a.name as string, archivado })
    }
  }
  // Índice por tokens para el matching aproximado.
  const indiceTokens = atletas.map((a) => {
    const t = tokensDe(a.name as string)
    return {
      id: a.id as string,
      name: a.name as string,
      archivado: a.archived_at !== null,
      tokens: new Set(t),
      n: t.length,
    }
  })

  const atletasCreados: string[] = []
  const sinResolver = new Set<string>()
  const mapeoJugadores = new Map<string, PlayerMatchInfo>()
  /** clave normalizada → athlete_id resuelto (o null si ambiguo/falló). */
  const resueltos = new Map<string, string | null>()
  /** athlete_id → primer nombre del Excel que lo usó, para detectar colisiones. */
  const usoAtleta = new Map<string, string>()

  function registrarUso(athleteId: string, nombreExcel: string) {
    const previo = usoAtleta.get(athleteId)
    if (previo && previo !== nombreExcel) {
      errors.push(`⚠️ "${previo}" y "${nombreExcel}" quedaron vinculados al MISMO atleta — revisa la planilla`)
    } else {
      usoAtleta.set(athleteId, nombreExcel)
    }
  }

  function avisarArchivado(nombreExcel: string, nombreAtleta: string) {
    errors.push(`⚠️ "${nombreExcel}" quedó vinculado al perfil ARCHIVADO "${nombreAtleta}" — desarchívalo si sigue activo`)
  }

  /**
   * Resuelve athlete_id por nombre en dos niveles:
   *   1) igualdad exacta del nombre normalizado;
   *   2) subconjunto de tokens en cualquier dirección — "daniel ramirez" calza
   *      con "Daniel Ramírez Varela" — exigiendo ≥2 tokens en el lado corto
   *      (un solo nombre de pila no basta para vincular).
   * Regla anti-ambigüedad: si más de un atleta distinto calza, NO se adivina:
   * el jugador se reporta como ambiguo y sus stats no se importan.
   * Siempre se prefieren perfiles activos; si el único match es un perfil
   * archivado, se vincula con advertencia.
   * Sin match: crea el atleta (en vista previa solo lo anuncia).
   */
  async function resolverAtleta(nombre: string): Promise<string | null> {
    const clave = normalizar(nombre)
    if (resueltos.has(clave)) return resueltos.get(clave) ?? null

    // 1) Match exacto.
    const exacto = porNombre.get(clave)
    if (exacto) {
      if (exacto.archivado) avisarArchivado(nombre, exacto.name)
      mapeoJugadores.set(clave, { excel: nombre, matched: exacto.name, kind: 'exact', archived: exacto.archivado })
      registrarUso(exacto.id, nombre)
      resueltos.set(clave, exacto.id)
      return exacto.id
    }

    // 2) Match por subconjunto de tokens.
    const propios = tokensDe(nombre)
    if (propios.length >= 2) {
      const setPropio = new Set(propios)
      const candidatos = indiceTokens.filter((a) => {
        if (Math.min(propios.length, a.n) < 2) return false
        return (
          propios.every((t) => a.tokens.has(t)) ||
          Array.from(a.tokens).every((t) => setPropio.has(t))
        )
      })
      // Activos primero; el mismo nombre duplicado (activo + archivado) cuenta una vez.
      const activos = candidatos.filter((c) => !c.archivado)
      const grupo = activos.length > 0 ? activos : candidatos
      const nombresUnicos = new Set(grupo.map((c) => normalizar(c.name)))

      if (nombresUnicos.size === 1) {
        const elegido = grupo[0]
        if (elegido.archivado) avisarArchivado(nombre, elegido.name)
        log.push(`🔗 "${nombre}" → "${elegido.name}" (match por nombre parcial)`)
        mapeoJugadores.set(clave, { excel: nombre, matched: elegido.name, kind: 'fuzzy', archived: elegido.archivado })
        registrarUso(elegido.id, nombre)
        resueltos.set(clave, elegido.id)
        return elegido.id
      }
      if (nombresUnicos.size > 1) {
        const lista = Array.from(new Set(grupo.map((c) => c.name + (c.archivado ? ' [archivado]' : ''))))
        errors.push(`⚠️ "${nombre}" es AMBIGUO — calza con: ${lista.join(' | ')}. Sus stats NO se importan hasta resolverlo`)
        mapeoJugadores.set(clave, { excel: nombre, matched: null, kind: 'ambiguous', archived: false, candidates: lista })
        resueltos.set(clave, null)
        return null
      }
    }

    // 3) Crear atleta nuevo.
    if (dryRun) {
      const idPrevia = `dry:${clave}`
      mapeoJugadores.set(clave, { excel: nombre, matched: null, kind: 'create', archived: false })
      atletasCreados.push(nombre)
      log.push(`➕ (previa) Se creará el atleta: ${nombre}`)
      registrarUso(idPrevia, nombre)
      resueltos.set(clave, idPrevia)
      return idPrevia
    }
    const { data: nuevo, error: errNuevo } = await supabase
      .from('athletes')
      .insert({
        club_id: clubId,
        name: nombre, // tal cual viene en el Excel
        status: 'active',
        category: 'General',
        performance_meta: {},
        technical_meta: {},
      })
      .select('id')
      .single()
    if (errNuevo || !nuevo) {
      sinResolver.add(nombre)
      errors.push(`⚠️ No se pudo crear el atleta "${nombre}": ${errNuevo?.message ?? 'sin datos'}`)
      resueltos.set(clave, null)
      return null
    }
    const t = tokensDe(nombre)
    porNombre.set(clave, { id: nuevo.id as string, name: nombre, archivado: false })
    indiceTokens.push({ id: nuevo.id as string, name: nombre, archivado: false, tokens: new Set(t), n: t.length })
    mapeoJugadores.set(clave, { excel: nombre, matched: null, kind: 'create', archived: false })
    atletasCreados.push(nombre)
    log.push(`✅ Atleta creado: ${nombre}`)
    registrarUso(nuevo.id as string, nombre)
    resueltos.set(clave, nuevo.id as string)
    return nuevo.id as string
  }

  // ── 6. Partidos existentes en esas fechas ───────────────────────────────
  const { data: matchesExistentes, error: errMatches } = await supabase
    .from('matches')
    .select('id, match_date, opponent, status, is_home, home_score, away_score, season_id, competition_id, meta')
    .eq('club_id', clubId)
    .in('match_date', fechas)
  if (errMatches) throw new Error(`Error leyendo partidos: ${errMatches.message}`)

  const matchesPorFecha = new Map<string, MatchRow[]>()
  for (const m of (matchesExistentes ?? []) as MatchRow[]) {
    const lista = matchesPorFecha.get(m.match_date) ?? []
    lista.push(m)
    matchesPorFecha.set(m.match_date, lista)
  }

  let matchesCreados = 0
  let matchesActualizados = 0
  let eventosEscritos = 0
  const fechasProcesadas = new Set<string>()

  // ── 7. Upsert de cada partido + reescritura de sus eventos ─────────────
  for (const partido of partidos) {
    const { hoja, fecha, rival, jugadores } = partido

    if (fechasProcesadas.has(fecha)) {
      errors.push(`⚠️ Hoja "${hoja}": ya se procesó otro partido con fecha ${fecha} — se omite`)
      continue
    }

    // 7a. Resolver el match por (club_id, match_date) + rival. La fecha sola
    // no basta: si ese día ya existe un partido contra OTRO rival (ej: un
    // amistoso), no hay que pisarlo — la hoja es un partido distinto.
    const candidatos = matchesPorFecha.get(fecha) ?? []
    const rivalNorm = rival ? normalizar(rival) : null
    let existente: MatchRow | undefined
    let ambiguo = false

    if (rivalNorm) {
      const mismoRival = candidatos.filter((c) => c.opponent && normalizar(c.opponent) === rivalNorm)
      if (mismoRival.length === 1) {
        existente = mismoRival[0]
      } else if (mismoRival.length > 1) {
        ambiguo = true
      } else {
        // Nadie con ese rival: solo se reutiliza un partido único SIN rival
        // registrado (se completa con el del Excel). Si todos los de ese día
        // tienen otro rival, se crea un partido nuevo.
        const sinRival = candidatos.filter((c) => !c.opponent?.trim())
        if (sinRival.length === 1) existente = sinRival[0]
        else if (sinRival.length > 1) ambiguo = true
      }
    } else if (candidatos.length === 1) {
      existente = candidatos[0]
    } else if (candidatos.length > 1) {
      ambiguo = true
    }

    if (ambiguo) {
      errors.push(`⚠️ Hoja "${hoja}": hay ${candidatos.length} partidos el ${fecha} y no se pudo desambiguar por rival — se omite`)
      continue
    }

    let matchId: string
    let creado = false
    let rivalParaLog = rival

    if (!existente) {
      creado = true
      if (dryRun) {
        matchId = `dry:${fecha}`
      } else {
        const { data: nuevoMatch, error: errInsertMatch } = await supabase
          .from('matches')
          .insert({
            club_id: clubId,
            match_date: fecha,
            opponent: rival,
            competition_id: competitionId, // cuelga el partido de la competencia de la temporada
            // El Excel no trae localía: el partido creado queda como local, por
            // eso los puntos del club van en home_score (consistente con is_home).
            is_home: true,
            status: fecha <= hoy ? 'finished' : 'scheduled',
            home_score: partido.puntosEquipo > 0 ? partido.puntosEquipo : null,
            season_id: seasonId,
            meta: { source: SEASON_IMPORT_SOURCE },
          })
          .select('id')
          .single()
        if (errInsertMatch || !nuevoMatch) {
          errors.push(`⚠️ Hoja "${hoja}": no se pudo crear el partido del ${fecha}: ${errInsertMatch?.message ?? 'sin datos'}`)
          continue
        }
        matchId = nuevoMatch.id as string
      }
      matchesCreados++
      if (candidatos.length > 0) {
        errors.push(
          candidatos.length === 1
            ? `⚠️ Hoja "${hoja}": el partido existente del ${fecha} es contra otro rival — se creó un partido nuevo vs ${rival}`
            : `⚠️ Hoja "${hoja}": los ${candidatos.length} partidos existentes del ${fecha} son contra otro rival — se creó un partido nuevo vs ${rival}`
        )
      }
      matchesPorFecha.set(fecha, [...candidatos, {
        id: matchId, match_date: fecha, opponent: rival, status: 'finished', is_home: true,
        home_score: partido.puntosEquipo, away_score: null, season_id: seasonId,
        competition_id: competitionId, meta: { source: SEASON_IMPORT_SOURCE },
      }])
    } else {
      matchId = existente.id
      rivalParaLog = rival ?? existente.opponent
      if (!dryRun) {
        const payload: Record<string, unknown> = {
          season_id: seasonId,
          meta: { ...(existente.meta ?? {}), source: SEASON_IMPORT_SOURCE },
          updated_at: new Date().toISOString(),
        }
        // Asigna la competencia dedicada de la temporada. Reasigna aunque el
        // partido ya esté en otra competencia SIEMPRE que ese vínculo lo haya
        // puesto este mismo importador (meta.source = season-xlsx) — así se
        // corrige una asignación previa incorrecta. No pisa una competencia
        // asignada a mano por el usuario.
        const compAsignadaPorImportador =
          (existente.meta as { source?: string } | null)?.source === SEASON_IMPORT_SOURCE
        if (competitionId && (!existente.competition_id || compAsignadaPorImportador)) {
          payload.competition_id = competitionId
        }
        if (rival) payload.opponent = rival // solo si el Excel lo trae
        if (fecha <= hoy) payload.status = 'finished'
        // home_score/away_score son el marcador literal de cada lado: los puntos
        // del club van al lado que le corresponde según is_home. En un partido de
        // visita, home_score es del rival y NO se toca.
        if (partido.puntosEquipo > 0) {
          if (existente.is_home) payload.home_score = partido.puntosEquipo
          else payload.away_score = partido.puntosEquipo
        }

        const { error: errUpdateMatch } = await supabase
          .from('matches')
          .update(payload)
          .eq('id', matchId)
          .eq('club_id', clubId)
        if (errUpdateMatch) {
          errors.push(`⚠️ Hoja "${hoja}": no se pudo actualizar el partido del ${fecha}: ${errUpdateMatch.message}`)
          continue
        }
      }
      matchesActualizados++
    }
    fechasProcesadas.add(fecha)

    // 7b. Construir los eventos del partido.
    const filasEventos: Array<Record<string, unknown>> = []
    for (const jugador of jugadores) {
      if (Object.keys(jugador.stats).length === 0) continue // ej: DNP registrado con puros ceros
      const athleteId = await resolverAtleta(jugador.nombre)
      if (!athleteId) continue
      for (const [eventType, eventValue] of Object.entries(jugador.stats)) {
        filasEventos.push({
          club_id: clubId,
          match_id: matchId,
          athlete_id: athleteId,
          event_type: eventType,
          event_value: eventValue,
          team: 'home',
          meta: { source: SEASON_IMPORT_SOURCE },
        })
      }
    }

    if (dryRun) {
      // Vista previa: solo contar lo que se escribiría.
      eventosEscritos += filasEventos.length
    } else {
      // 7c. Limpieza previa, siempre scoped al match (idempotencia + legacy):
      //   1) lo escrito antes por este importador (meta.source = 'season-xlsx');
      //   2) la carga antigua defectuosa completa (meta.source LIKE 'xlsx-%');
      //   3) filas SIN source cuyas claves escribe este importador o la carga
      //      legacy rota. Sin las del importador la idempotencia se rompe tras
      //      guardar en el editor de stats: upsertPlayerStats borra TODO el
      //      partido y reinserta sin meta, lo importado reaparece sin marca y un
      //      re-import lo duplicaría. Para estas claves el import es el snapshot
      //      autoritativo del partido (igual que el editor, que también
      //      reescribe todo); eventos con otras claves no se tocan.
      const { error: errDel1 } = await supabase
        .from('match_events').delete()
        .eq('club_id', clubId).eq('match_id', matchId)
        .eq('meta->>source', SEASON_IMPORT_SOURCE)
      const { error: errDel2 } = errDel1 ? { error: errDel1 } : await supabase
        .from('match_events').delete()
        .eq('club_id', clubId).eq('match_id', matchId)
        .like('meta->>source', LEGACY_SOURCE_PATTERN)
      const { error: errDel3 } = errDel2 ? { error: errDel2 } : await supabase
        .from('match_events').delete()
        .eq('club_id', clubId).eq('match_id', matchId)
        .in('event_type', CLAVES_LIMPIEZA_SIN_SOURCE)
        .is('meta->>source', null)
      const errDelete = errDel1 ?? errDel2 ?? errDel3
      if (errDelete) {
        // Sin limpieza no se inserta: evita duplicar eventos.
        errors.push(`⚠️ Hoja "${hoja}": no se pudieron limpiar eventos previos del ${fecha}: ${errDelete.message}`)
        continue
      }

      // 7d. Insertar los eventos nuevos.
      if (filasEventos.length > 0) {
        const { error: errInsertEventos } = await supabase.from('match_events').insert(filasEventos)
        if (errInsertEventos) {
          errors.push(`⚠️ Hoja "${hoja}": error insertando eventos del ${fecha}: ${errInsertEventos.message}`)
          continue
        }
        eventosEscritos += filasEventos.length
      }
    }

    const conStats = jugadores.filter((j) => Object.keys(j.stats).length > 0).length
    log.push(
      `✅ ${dryRun ? '(previa) ' : ''}Partido ${fecha}${rivalParaLog ? ` vs ${rivalParaLog}` : ''}: ` +
      `${creado ? (dryRun ? 'se creará' : 'creado') : (dryRun ? 'se actualizará' : 'actualizado')}, ` +
      `${filasEventos.length} eventos de ${conStats} jugadores`
    )
  }

  return {
    ok: true,
    dry_run: dryRun,
    log,
    errors,
    summary: {
      season: nombreTemporada,
      matches_created: matchesCreados,
      matches_updated: matchesActualizados,
      events_written: eventosEscritos,
      athletes_created: atletasCreados,
      unmatched_players: Array.from(sinResolver),
      players: Array.from(mapeoJugadores.values()),
    },
  }
}
