'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileSpreadsheet, Upload, Loader2, CheckCircle2, XCircle,
  AlertTriangle, UserPlus, Link2, Eye, Archive,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/** Copia local del contrato de /api/season-import (ver src/lib/season-import.ts). */
interface PlayerMatchInfo {
  excel: string
  matched: string | null
  kind: 'exact' | 'fuzzy' | 'create' | 'ambiguous'
  archived: boolean
  candidates?: string[]
}

interface SeasonImportSummary {
  season: string
  matches_created: number
  matches_updated: number
  events_written: number
  athletes_created: string[]
  unmatched_players: string[]
  players?: PlayerMatchInfo[]
}

interface SeasonImportResult {
  ok: boolean
  dry_run?: boolean
  log?: string[]
  errors?: string[]
  summary?: SeasonImportSummary
  /** Presente en respuestas 4xx/5xx ({ error: string }). */
  error?: string
}

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB, igual que el endpoint

type Phase = 'idle' | 'previewing' | 'preview' | 'importing' | 'done'

export function SeasonImportDialog() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen]         = useState(false)
  const [phase, setPhase]       = useState<Phase>('idle')
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile]         = useState<File | null>(null)
  const [result, setResult]     = useState<SeasonImportResult | null>(null)

  const busy = phase === 'previewing' || phase === 'importing'

  function reset() {
    setPhase('idle')
    setFile(null)
    setResult(null)
  }

  async function subir(f: File, dryRun: boolean): Promise<SeasonImportResult> {
    const fd = new FormData()
    fd.append('file', f)
    if (dryRun) fd.append('dry_run', '1')
    const res  = await fetch('/api/season-import', { method: 'POST', body: fd })
    const data = (await res.json().catch(() => null)) as SeasonImportResult | null
    if (!data) return { ok: false, error: `Respuesta inválida del servidor (HTTP ${res.status})` }
    if (!data.ok && !data.error) data.error = 'Error al importar la temporada'
    return data
  }

  /** Paso 1: archivo elegido → vista previa (dry-run, no escribe nada). */
  async function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Solo se aceptan archivos .xlsx')
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error('El archivo supera el máximo de 5 MB')
      return
    }
    setFile(f)
    setResult(null)
    setPhase('previewing')
    try {
      const data = await subir(f, true)
      setResult(data)
      if (data.ok) {
        setPhase('preview')
      } else {
        setPhase('idle')
        setFile(null)
        toast.error(data.error ?? 'Error al generar la vista previa')
      }
    } catch (e) {
      setPhase('idle')
      setFile(null)
      const msg = e instanceof Error ? e.message : 'Error inesperado al subir el archivo'
      setResult({ ok: false, error: msg })
      toast.error(msg)
    }
  }

  /** Paso 2: confirmación → importación real. */
  async function confirmar() {
    if (!file) return
    setPhase('importing')
    try {
      const data = await subir(file, false)
      setResult(data)
      if (data.ok) {
        setPhase('done')
        toast.success(
          data.summary?.season
            ? `Temporada "${data.summary.season}" importada correctamente`
            : 'Temporada importada correctamente'
        )
        router.refresh()
      } else {
        setPhase('preview') // se mantiene la previa para reintentar o cancelar
        toast.error(data.error ?? 'Error al importar la temporada')
      }
    } catch (e) {
      setPhase('preview')
      toast.error(e instanceof Error ? e.message : 'Error inesperado al importar')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (busy || phase === 'preview') return
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const summary  = result?.ok ? result.summary : undefined
  const players  = summary?.players ?? []
  const exactos  = players.filter((p) => p.kind === 'exact')
  const fuzzy    = players.filter((p) => p.kind === 'fuzzy')
  const nuevos   = players.filter((p) => p.kind === 'create')
  const ambiguos = players.filter((p) => p.kind === 'ambiguous')
  // La vista previa sigue visible mientras corre la importación real.
  const esPrevia = phase === 'preview' || phase === 'importing'

  const counters: Array<{ label: string; value: number }> = summary
    ? [
        { label: esPrevia ? 'Partidos a crear'      : 'Partidos creados',      value: summary.matches_created },
        { label: esPrevia ? 'Partidos a actualizar' : 'Partidos actualizados', value: summary.matches_updated },
        { label: esPrevia ? 'Stats a escribir'      : 'Stats escritas',        value: summary.events_written },
        { label: esPrevia ? 'Atletas a crear'       : 'Atletas creados',       value: summary.athletes_created.length },
      ]
    : []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) return // no cerrar mientras trabaja
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <FileSpreadsheet className="w-4 h-4" />
          Importar temporada
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Importar temporada desde Excel
          </DialogTitle>
          <DialogDescription>
            Sube el .xlsx de la temporada: una hoja resumen (ej. &quot;2026-1&quot;) y una hoja
            por partido. Primero verás una vista previa con cómo se vinculará cada jugador;
            nada se guarda hasta que confirmes.
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone (oculto durante la vista previa para centrar la decisión) */}
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={onFileChange} />
        {(phase === 'idle' || phase === 'previewing') && (
          <div
            onClick={() => !busy && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/20'
            } ${busy ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {busy ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs font-medium">
                  {phase === 'previewing' ? 'Generando vista previa...' : 'Importando temporada...'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs font-medium">Arrastra el archivo aquí o haz clic para seleccionar</p>
                <p className="text-[10px] text-muted-foreground">Solo .xlsx · máx 5 MB</p>
              </div>
            )}
          </div>
        )}

        {/* Error sin vista previa (archivo inválido, 4xx/5xx) */}
        {result && !result.ok && phase === 'idle' && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10 p-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="font-semibold text-sm text-red-700 dark:text-red-400">{result.error}</p>
          </div>
        )}

        {/* Vista previa o resultado final */}
        {summary && (esPrevia || phase === 'done') && (
          <div className={`rounded-lg border p-4 space-y-3 ${
            esPrevia
              ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10'
              : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
          }`}>
            <div className="flex items-center gap-2">
              {esPrevia ? (
                <Eye className="w-5 h-5 text-blue-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              )}
              <div>
                <p className={`font-semibold text-sm ${
                  esPrevia ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'
                }`}>
                  {esPrevia
                    ? `Vista previa — temporada "${summary.season}"`
                    : `✅ Temporada "${summary.season}" importada correctamente`}
                </p>
                {esPrevia && (
                  <p className="text-xs text-muted-foreground">
                    Todavía no se ha guardado nada. Revisa y confirma.
                  </p>
                )}
              </div>
            </div>

            {/* Contadores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {counters.map((c) => (
                <div key={c.label} className="text-center p-2 rounded-md bg-background/60 border border-border">
                  <p className="text-lg font-bold">{c.value}</p>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>

            {/* Ambiguos: lo primero, porque requieren acción */}
            {ambiguos.length > 0 && (
              <div className="space-y-1 rounded-md border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/10 p-2">
                <p className="text-xs font-semibold flex items-center gap-1 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" /> Jugadores ambiguos ({ambiguos.length}) — sus stats NO se importan
                </p>
                <ul className="space-y-0.5">
                  {ambiguos.map((p) => (
                    <li key={p.excel} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{p.excel}</span> calza con:{' '}
                      {p.candidates?.join(' · ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Vinculaciones por nombre parcial */}
            {fuzzy.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> {esPrevia ? 'Se vincularán' : 'Vinculados'} por nombre parcial ({fuzzy.length})
                </p>
                <ul className="space-y-0.5 max-h-36 overflow-y-auto">
                  {fuzzy.map((p) => (
                    <li key={p.excel} className="text-xs text-muted-foreground">
                      {p.excel} <span className="mx-1">→</span>
                      <span className="text-foreground">{p.matched}</span>
                      {p.archived && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-yellow-700 dark:text-yellow-400">
                          <Archive className="w-3 h-3" /> archivado
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Atletas nuevos */}
            {nuevos.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium flex items-center gap-1">
                  <UserPlus className="w-3 h-3" /> {esPrevia ? 'Se crearán como atletas nuevos' : 'Atletas creados'} ({nuevos.length})
                </p>
                <p className="text-xs text-muted-foreground">{nuevos.map((p) => p.excel).join(', ')}</p>
              </div>
            )}

            {/* Reconocidos exactos (colapsado: no requieren decisión) */}
            {exactos.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {exactos.length} jugador{exactos.length > 1 ? 'es' : ''} reconocido{exactos.length > 1 ? 's' : ''} con nombre exacto
                </summary>
                <ul className="mt-1 space-y-0.5 pl-2 border-l-2 border-border">
                  {exactos.map((p) => (
                    <li key={p.excel} className="text-muted-foreground">
                      {p.excel}
                      {p.archived && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-yellow-700 dark:text-yellow-400">
                          <Archive className="w-3 h-3" /> perfil archivado
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* Jugadores sin resolver (fallo al crear, solo import real) */}
            {summary.unmatched_players.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="w-3 h-3" /> Jugadores sin resolver ({summary.unmatched_players.length})
                </p>
                <p className="text-xs text-muted-foreground">{summary.unmatched_players.join(', ')}</p>
              </div>
            )}

            {/* Advertencias */}
            {result?.errors && result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="w-3 h-3" /> {result.errors.length} advertencia{result.errors.length > 1 ? 's' : ''}
                </p>
                <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-muted-foreground">{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Log completo (colapsado) */}
            {result?.log && result.log.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Ver log completo ({result.log.length} operaciones)
                </summary>
                <ul className="mt-2 space-y-0.5 max-h-40 overflow-y-auto pl-2 border-l-2 border-border">
                  {result.log.map((l, i) => (
                    <li key={i} className="text-muted-foreground">{l}</li>
                  ))}
                </ul>
              </details>
            )}

            {/* Acciones de la vista previa */}
            {phase === 'preview' && (
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={confirmar} disabled={busy} className="gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmar importación
                </Button>
              </div>
            )}

            {/* Importación en curso desde la vista previa */}
            {phase === 'importing' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importando temporada...
              </div>
            )}

            {/* Cerrar tras importar */}
            {phase === 'done' && (
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={reset}>
                  Importar otro archivo
                </Button>
                <Button size="sm" onClick={() => { setOpen(false); reset() }}>
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
