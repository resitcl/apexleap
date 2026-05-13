'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, X, Loader2, Save, ChevronDown, ChevronUp, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { upsertPlayerStats, deleteMatch, updateMatch } from '@/lib/actions/matches'

/* ─── Sport-specific stat columns ─────────────────────────── */
interface StatCol { key: string; label: string; abbr: string }

const SPORT_STATS: Record<string, StatCol[]> = {
  basketball: [
    { key: 'pts2',     label: 'Puntos 2P', abbr: '2P' },
    { key: 'pts3',     label: 'Puntos 3P', abbr: '3P' },
    { key: 'ft',       label: 'Tiro libre', abbr: 'TL' },
    { key: 'reb_off',  label: 'Reb. Ofensivo', abbr: 'RO' },
    { key: 'reb_def',  label: 'Reb. Defensivo', abbr: 'RD' },
    { key: 'ast',      label: 'Asistencias', abbr: 'AS' },
    { key: 'stl',      label: 'Robos', abbr: 'RB' },
    { key: 'blk',      label: 'Tapones', abbr: 'TP' },
    { key: 'foul',     label: 'Faltas', abbr: 'FL' },
    { key: 'to',       label: 'Pérdidas', abbr: 'PE' },
  ],
  soccer: [
    { key: 'goal',        label: 'Goles',          abbr: 'G' },
    { key: 'assist',      label: 'Asistencias',    abbr: 'A' },
    { key: 'yellow_card', label: 'T. Amarilla',    abbr: 'TA' },
    { key: 'red_card',    label: 'T. Roja',        abbr: 'TR' },
    { key: 'save',        label: 'Atajadas (GK)',  abbr: 'AT' },
    { key: 'foul',        label: 'Faltas',         abbr: 'F' },
  ],
  futsal: [
    { key: 'goal',        label: 'Goles',          abbr: 'G' },
    { key: 'assist',      label: 'Asistencias',    abbr: 'A' },
    { key: 'yellow_card', label: 'T. Amarilla',    abbr: 'TA' },
    { key: 'red_card',    label: 'T. Roja',        abbr: 'TR' },
    { key: 'save',        label: 'Atajadas (GK)',  abbr: 'AT' },
  ],
  volleyball: [
    { key: 'attack_pt',  label: 'Puntos Ataque',  abbr: 'PA' },
    { key: 'serve_ace',  label: 'Aces',           abbr: 'AC' },
    { key: 'block_pt',   label: 'Puntos Bloqueo', abbr: 'PB' },
    { key: 'dig',        label: 'Recepciones',    abbr: 'RC' },
    { key: 'error',      label: 'Errores',        abbr: 'ER' },
  ],
  handball: [
    { key: 'goal',        label: 'Goles',          abbr: 'G' },
    { key: 'assist',      label: 'Asistencias',    abbr: 'A' },
    { key: 'save',        label: 'Atajadas (GK)',  abbr: 'AT' },
    { key: 'yellow_card', label: 'Amonest.',       abbr: 'AM' },
    { key: 'suspension',  label: '2 min',          abbr: '2M' },
    { key: 'red_card',    label: 'T. Roja',        abbr: 'TR' },
  ],
  generic: [
    { key: 'point',   label: 'Puntos',       abbr: 'PT' },
    { key: 'assist',  label: 'Asistencias',  abbr: 'A' },
    { key: 'foul',    label: 'Faltas',       abbr: 'F' },
  ],
}

function getCols(sport: string | null | undefined): StatCol[] {
  if (!sport) return SPORT_STATS.generic
  const key = sport.toLowerCase()
  for (const [k, v] of Object.entries(SPORT_STATS)) {
    if (key.includes(k)) return v
  }
  return SPORT_STATS.generic
}

/* ─── Types ───────────────────────────────────────────────── */
interface Athlete { id: string; name: string }
interface Match {
  id: string
  opponent: string | null
  match_date: string
  is_home: boolean
  home_score: number | null
  away_score: number | null
  status: string
  location: string | null
}
interface MatchEvent {
  athlete_id: string | null
  event_type: string
  event_value: number
  athletes: { id: string; name: string } | null
}

interface Props {
  match: Match
  competitionId: string | null
  sport: string | null
  athletes: Athlete[]
  initialEvents: MatchEvent[]
}

type StatsMap = Record<string, Record<string, number>> // athleteId → eventType → value

function buildInitialStats(events: MatchEvent[]): StatsMap {
  const map: StatsMap = {}
  for (const ev of events) {
    if (!ev.athlete_id) continue
    if (!map[ev.athlete_id]) map[ev.athlete_id] = {}
    map[ev.athlete_id][ev.event_type] = (map[ev.athlete_id][ev.event_type] ?? 0) + Number(ev.event_value)
  }
  return map
}

interface AIResult {
  matched: Array<{ athlete_id: string; name: string; stats: Record<string, number> }>
  unmatched: string[]
  notes?: string
}

export function MatchStatsEditor({ match, competitionId, sport, athletes, initialEvents }: Props) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [tab, setTab]           = useState<'stats' | 'score'>('stats')
  const [stats, setStats]       = useState<StatsMap>(() => buildInitialStats(initialEvents))
  const [score, setScore]       = useState({ home: match.home_score ?? '', away: match.away_score ?? '', status: match.status })
  const [isPending, start]      = useTransition()
  const [isDeleting, startDel]  = useTransition()
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  // AI import state
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult]   = useState<AIResult | null>(null)
  const [aiError, setAiError]     = useState('')

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAiLoading(true)
    setAiError('')
    setAiResult(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/stats/import-from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          athletes,
          statCols: getCols(sport),
          sport,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Error desconocido')
      setAiResult(data as AIResult)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Error al procesar imagen')
    } finally {
      setAiLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function applyAiStats() {
    if (!aiResult) return
    setStats(prev => {
      const next = { ...prev }
      for (const row of aiResult.matched) {
        next[row.athlete_id] = { ...(next[row.athlete_id] ?? {}), ...row.stats }
      }
      return next
    })
    setAiResult(null)
    setAiError('')
  }

  const cols = getCols(sport)

  function setStat(athleteId: string, eventType: string, val: string) {
    const num = val === '' ? 0 : Math.max(0, parseInt(val) || 0)
    setStats(prev => ({
      ...prev,
      [athleteId]: { ...(prev[athleteId] ?? {}), [eventType]: num },
    }))
  }

  function getStat(athleteId: string, eventType: string): string {
    const v = stats[athleteId]?.[eventType]
    return v ? String(v) : ''
  }

  function totalForAthlete(athleteId: string): number {
    const s = stats[athleteId] ?? {}
    return Object.values(s).reduce((a, b) => a + b, 0)
  }

  async function handleSaveStats() {
    setError('')
    start(async () => {
      try {
        const rows: Array<{ athlete_id: string; event_type: string; event_value: number; team: string }> = []
        for (const [athleteId, evMap] of Object.entries(stats)) {
          for (const [evType, evVal] of Object.entries(evMap)) {
            if (evVal > 0) rows.push({ athlete_id: athleteId, event_type: evType, event_value: evVal, team: 'home' })
          }
        }
        await upsertPlayerStats(match.id, competitionId, rows)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  async function handleSaveScore() {
    setError('')
    start(async () => {
      try {
        await updateMatch(match.id, competitionId, {
          home_score: score.home !== '' ? Number(score.home) : null,
          away_score: score.away !== '' ? Number(score.away) : null,
          status:     score.status,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este partido y todas sus estadísticas?')) return
    startDel(async () => {
      try {
        await deleteMatch(match.id, competitionId)
        setOpen(false)
        router.push(competitionId ? `/dashboard/competitions/${competitionId}` : '/dashboard/matches')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al eliminar')
      }
    })
  }

  const ourScore = match.is_home ? match.home_score : match.away_score
  const theirScore = match.is_home ? match.away_score : match.home_score
  const hasScore = ourScore !== null && theirScore !== null
  const won = hasScore && ourScore! > theirScore!
  const lost = hasScore && ourScore! < theirScore!
  const drew = hasScore && ourScore === theirScore

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        Estadísticas
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${won ? 'bg-green-100 text-green-700' : lost ? 'bg-red-100 text-red-700' : drew ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground'}`}>
                    {won ? 'Victoria' : lost ? 'Derrota' : drew ? 'Empate' : match.status === 'scheduled' ? 'Programado' : 'En juego'}
                  </span>
                  <p className="text-sm font-semibold">
                    vs. {match.opponent ?? '—'}
                    {hasScore && <span className="ml-2 font-bold text-primary">{ourScore} – {theirScore}</span>}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(match.match_date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  {match.location && ` · ${match.location}`}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-border px-5 shrink-0 gap-1">
              <div className="flex flex-1">
                {(['stats', 'score'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t === 'stats' ? 'Estadísticas por jugador' : 'Marcador'}
                  </button>
                ))}
              </div>
              {tab === 'stats' && (
                <div className="pb-1">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={aiLoading}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors disabled:opacity-50"
                    title="Importar estadísticas desde una captura de pantalla usando IA"
                  >
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {aiLoading ? 'Analizando...' : 'IA: importar imagen'}
                  </button>
                </div>
              )}
            </div>

            {/* AI Result preview */}
            {(aiResult || aiError) && tab === 'stats' && (
              <div className={`mx-5 mt-3 rounded-xl border p-3 text-sm ${
                aiError ? 'border-destructive/40 bg-destructive/5' : 'border-violet-200 bg-violet-50'
              }`}>
                {aiError ? (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-destructive text-xs">{aiError}</p>
                    <button onClick={() => setAiError('')} className="ml-auto text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                  </div>
                ) : aiResult && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-violet-600" />
                        <span className="font-medium text-violet-800 text-xs">
                          IA encontró {aiResult.matched.length} jugador{aiResult.matched.length !== 1 ? 'es' : ''}
                          {aiResult.unmatched.length > 0 && ` · ${aiResult.unmatched.length} sin mapear`}
                        </span>
                      </div>
                      <button onClick={() => setAiResult(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiResult.matched.map((r) => (
                        <span key={r.athlete_id} className="text-[11px] bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">
                          {r.name}
                        </span>
                      ))}
                      {aiResult.unmatched.map((n, i) => (
                        <span key={i} className="text-[11px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 line-through">{n}</span>
                      ))}
                    </div>
                    {aiResult.notes && <p className="text-[11px] text-muted-foreground italic">{aiResult.notes}</p>}
                    <button
                      onClick={applyAiStats}
                      className="w-full h-7 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors"
                    >
                      Aplicar estadísticas a la tabla
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'stats' && (
                <div className="overflow-x-auto">
                  {athletes.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground text-sm">
                      No hay jugadores en este club aún
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-card z-10">
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs min-w-[140px]">Jugador</th>
                          {cols.map(c => (
                            <th key={c.key} className="text-center px-2 py-2.5 font-medium text-muted-foreground text-xs min-w-[52px]" title={c.label}>{c.abbr}</th>
                          ))}
                          <th className="text-center px-2 py-2.5 font-medium text-muted-foreground text-xs">TOT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {athletes.map((a, i) => (
                          <tr key={a.id} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                            <td className="px-4 py-1.5 font-medium text-sm truncate max-w-[140px]">{a.name}</td>
                            {cols.map(c => (
                              <td key={c.key} className="px-1 py-1">
                                <input
                                  type="number" min="0" max="99"
                                  value={getStat(a.id, c.key)}
                                  onChange={e => setStat(a.id, c.key, e.target.value)}
                                  className="w-12 h-7 text-center rounded border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring mx-auto block"
                                  placeholder="0"
                                />
                              </td>
                            ))}
                            <td className="px-2 py-1 text-center font-bold text-primary text-sm">
                              {totalForAthlete(a.id) || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tab === 'score' && (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{match.is_home ? 'Nuestro marcador' : 'Marcador rival'}</label>
                      <input
                        type="number" min="0"
                        value={score.home}
                        onChange={e => setScore(s => ({ ...s, home: e.target.value }))}
                        className="mt-1 w-full h-12 text-center text-2xl font-bold rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{match.is_home ? 'Marcador rival' : 'Nuestro marcador'}</label>
                      <input
                        type="number" min="0"
                        value={score.away}
                        onChange={e => setScore(s => ({ ...s, away: e.target.value }))}
                        className="mt-1 w-full h-12 text-center text-2xl font-bold rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Estado</label>
                    <select
                      value={score.status}
                      onChange={e => setScore(s => ({ ...s, status: e.target.value }))}
                      className="mt-1 w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="scheduled">Programado</option>
                      <option value="in_progress">En juego</option>
                      <option value="finished">Finalizado</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center gap-2 shrink-0">
              {error && <p className="text-xs text-destructive flex-1">{error}</p>}
              {saved && <p className="text-xs text-green-600 flex-1 font-medium">✓ Guardado</p>}
              {!error && !saved && <div className="flex-1" />}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 px-3 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Eliminar'}
              </button>
              <button
                onClick={tab === 'stats' ? handleSaveStats : handleSaveScore}
                disabled={isPending}
                className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
