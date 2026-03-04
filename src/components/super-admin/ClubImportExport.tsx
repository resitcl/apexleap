'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Download, Upload, Loader2, CheckCircle2, XCircle,
  FileSpreadsheet, AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ImportResult {
  ok: boolean
  clubId?: string
  clubName?: string
  slug?: string
  log?: string[]
  errors?: string[]
  summary?: Record<string, number>
  error?: string
}

export function ClubImportExport() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [result,      setResult]      = useState<ImportResult | null>(null)
  const [dragOver,    setDragOver]    = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch('/api/club-template')
      if (!res.ok) throw new Error('Error al generar plantilla')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'apexleap-club-template.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error descargando plantilla')
    } finally {
      setDownloading(false)
    }
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Solo se aceptan archivos .xlsx o .xls')
      return
    }
    setUploading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/club-import', { method: 'POST', body: fd })
      const data = await res.json() as ImportResult
      setResult(data)
      if (data.ok) router.refresh()
    } catch (e) {
      setResult({ ok: false, error: e instanceof Error ? e.message : 'Error inesperado' })
    } finally {
      setUploading(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const SUMMARY_LABELS: Record<string, string> = {
    categories: 'Categorías', plans: 'Planes', venues: 'Sedes',
    athletes: 'Atletas', coaches: 'Entrenadores', schedules: 'Horarios',
    competitions: 'Competencias', rules: 'Reglas',
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Importar / Exportar Club desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Step 1: Download template */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Descarga la plantilla Excel</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Incluye hojas: CONFIG, CATEGORIAS, PLANES, SEDES, ENTRENADORES, HORARIOS, ATLETAS, COMPETENCIAS, REGLAS
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {downloading ? 'Generando...' : 'Descargar plantilla .xlsx'}
            </button>
          </div>
        </div>

        {/* Step 2: Upload filled template */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Completa y sube el Excel</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rellena cada hoja con los datos reales del club y súbela aquí.
            </p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
            <div
              onClick={() => !uploading && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent/20'
              } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs font-medium">Importando datos...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <p className="text-xs font-medium">Arrastra el archivo aquí o haz clic para seleccionar</p>
                  <p className="text-[10px] text-muted-foreground">Solo .xlsx / .xls</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-lg border p-4 space-y-3 ${
            result.ok
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
          }`}>
            <div className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <div>
                <p className={`font-semibold text-sm ${result.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {result.ok ? `✅ Club "${result.clubName}" importado correctamente` : `❌ Error: ${result.error}`}
                </p>
                {result.ok && result.slug && (
                  <p className="text-xs text-muted-foreground">Slug: <code>{result.slug}</code></p>
                )}
              </div>
            </div>

            {/* Summary grid */}
            {result.ok && result.summary && (
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(result.summary).map(([key, val]) => (
                  <div key={key} className="text-center p-2 rounded-md bg-background/60 border border-border">
                    <p className="text-lg font-bold">{val}</p>
                    <p className="text-[10px] text-muted-foreground">{SUMMARY_LABELS[key] ?? key}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Errors list */}
            {result.errors && result.errors.length > 0 && (
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

            {/* Log (collapsed by default) */}
            {result.ok && result.log && result.log.length > 0 && (
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
