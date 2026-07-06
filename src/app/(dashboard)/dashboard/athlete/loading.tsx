export default function AthleteSectionLoading() {
  return (
    <div className="space-y-6 pt-1 animate-pulse" aria-busy="true" aria-label="Cargando…">
      <div className="h-8 w-48 rounded-lg bg-muted/40" />
      <div className="h-4 w-72 rounded bg-muted/20" />
      <div className="h-40 rounded-2xl border border-white/[0.04] bg-muted/10" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-24 rounded-2xl border border-white/[0.04] bg-muted/10" />
        <div className="h-24 rounded-2xl border border-white/[0.04] bg-muted/10" />
        <div className="h-24 rounded-2xl border border-white/[0.04] bg-muted/10" />
      </div>
      <div className="h-64 rounded-2xl border border-white/[0.04] bg-muted/10" />
    </div>
  )
}
