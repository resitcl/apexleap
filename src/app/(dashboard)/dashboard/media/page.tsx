export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMediaItems, getMediaStats, getMediaByMonth } from "@/lib/actions/media"
import { Badge } from "@/components/ui/badge"
import { MediaUploadButton } from "@/components/media/MediaUploadModal"
import { DeleteMediaButton } from "@/components/media/DeleteMediaButton"
import { LandingFeaturedButton } from "@/components/media/LandingFeaturedButton"
import {
  Film, Image, ExternalLink, FileText, PlayCircle, Video as VideoIcon,
  Calendar, Star, Eye, ChevronLeft, ChevronRight, Search, Filter, Sparkles,
} from "lucide-react"

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  match:     { label: "Partido",        emoji: "⚽", color: "emerald" },
  highlight: { label: "Highlight",      emoji: "✨", color: "amber" },
  training:  { label: "Entrenamiento",  emoji: "🏋️", color: "blue" },
  technique: { label: "Técnica",        emoji: "🥋", color: "violet" },
  analysis:  { label: "Análisis",       emoji: "📊", color: "cyan" },
  event:     { label: "Evento",         emoji: "🎉", color: "pink" },
  promo:     { label: "Promocional",    emoji: "📣", color: "orange" },
  photo:     { label: "Foto",           emoji: "📸", color: "rose" },
  other:     { label: "Otro",           emoji: "📁", color: "slate" },
}

const TYPE_ICON: Record<string, React.ElementType> = {
  video:    PlayCircle,
  photo:    Image,
  document: FileText,
}

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
  return null
}

interface PageProps {
  searchParams: Promise<{ type?: string; category?: string; search?: string; page?: string; month?: string }>
}

export default async function MediaPage({ searchParams }: PageProps) {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const params = await searchParams
  const type     = params.type     ?? ""
  const category = params.category ?? ""
  const search   = params.search   ?? ""
  const month    = params.month    ?? ""
  const page     = parseInt(params.page ?? "1")

  // Fetch data
  let result: Awaited<ReturnType<typeof getMediaItems>> = { items: [], total: 0, tableExists: true }
  let stats: Awaited<ReturnType<typeof getMediaStats>> = null
  let monthlyData: Awaited<ReturnType<typeof getMediaByMonth>> = {}
  
  try {
    const [mediaResult, mediaStats, byMonth] = await Promise.all([
      getMediaItems({ 
        type: type || undefined, 
        category: category || undefined, 
        search: search || undefined, 
        month: month || undefined,
        page 
      }),
      getMediaStats(),
      getMediaByMonth(),
    ])
    result = mediaResult
    stats = mediaStats
    monthlyData = byMonth
  } catch { /* silent */ }

  const { items, total, tableExists } = result
  const totalPages = Math.ceil(total / 24)
  const currentYear = new Date().getFullYear()

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(type     ? { type }     : {}),
      ...(category ? { category } : {}),
      ...(search   ? { search }   : {}),
      ...(month    ? { month }    : {}),
      ...(page > 1 ? { page: String(page) } : {}),
      ...overrides,
    })
    const s = p.toString()
    return `/dashboard/media${s ? `?${s}` : ""}`
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── PREMIUM HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Film className="w-6 h-6 text-white" />
            </div>
            Media Hub
          </h1>
          <p className="text-muted-foreground/80 mt-2 font-medium">
            Gestiona videos, fotos e highlights del club. Organiza por fecha y categoría.
          </p>
        </div>
        <MediaUploadButton />
      </div>

      {!tableExists ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-12 text-center">
          <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-black tracking-tight mb-2">Tabla no configurada</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Ejecuta la migración <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">030_media_hub_enhanced.sql</code> para habilitar el Media Hub.
          </p>
        </div>
      ) : (
        <>
          {/* ── KPI ROW ── */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Total</p>
                <p className="text-2xl font-black text-foreground">{stats.total}</p>
              </div>
              <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1 flex items-center gap-1">
                  <PlayCircle className="w-3 h-3" /> Videos
                </p>
                <p className="text-2xl font-black text-violet-400">{stats.videos}</p>
              </div>
              <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1 flex items-center gap-1">
                  <Image className="w-3 h-3" /> Fotos
                </p>
                <p className="text-2xl font-black text-emerald-400">{stats.photos}</p>
              </div>
              <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1 flex items-center gap-1">
                  <Star className="w-3 h-3" /> Destacados
                </p>
                <p className="text-2xl font-black text-amber-400">{stats.featured}</p>
              </div>
              <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Públicos
                </p>
                <p className="text-2xl font-black text-cyan-400">{stats.public}</p>
              </div>
              <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Partidos</p>
                <p className="text-2xl font-black text-primary">{stats.matches}</p>
              </div>
            </div>
          )}

          {/* ── CALENDAR ROW ── */}
          {Object.keys(monthlyData).length > 0 && (
            <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Contenido por Mes — {currentYear}
                </p>
                {month && (
                  <Link href={buildHref({ month: '', page: '1' })} className="text-[10px] font-bold text-primary hover:underline">
                    Ver todo
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
                {MONTHS_ES.map((m, i) => {
                  const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`
                  const data = monthlyData[monthKey]
                  const isActive = month === monthKey
                  const hasContent = data && data.total > 0
                  
                  return (
                    <Link key={monthKey} href={buildHref({ month: isActive ? '' : monthKey, page: '1' })}>
                      <div className={`p-2 rounded-lg text-center transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : hasContent 
                            ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]' 
                            : 'bg-white/[0.01] text-muted-foreground/30'
                      }`}>
                        <p className="text-[10px] font-bold uppercase">{m}</p>
                        {hasContent && (
                          <p className={`text-xs font-black mt-0.5 ${isActive ? '' : 'text-primary'}`}>{data.total}</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── FILTERS ── */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            {/* Search */}
            <form method="get" action="/dashboard/media" className="flex items-center gap-2">
              {type     && <input type="hidden" name="type"     value={type}     />}
              {category && <input type="hidden" name="category" value={category} />}
              {month    && <input type="hidden" name="month"    value={month}    />}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <input 
                  type="text" 
                  name="search" 
                  defaultValue={search}
                  placeholder="Buscar contenido..."
                  className="h-10 pl-10 pr-4 rounded-lg border border-white/[0.08] bg-white/[0.02] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-48" 
                />
              </div>
              <button type="submit" className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
                Buscar
              </button>
            </form>

            <div className="w-px h-8 bg-white/[0.08] mx-1 hidden sm:block" />

            {/* Type filters */}
            <div className="flex items-center gap-1.5">
              {[["", "Todo"], ["video", "Videos"], ["photo", "Fotos"]].map(([val, lbl]) => (
                <Link key={val} href={buildHref({ type: val, page: "1" })}>
                  <button className={`h-9 px-4 rounded-full text-[10px] uppercase tracking-widest font-black transition-all ${
                    (val === "" && !type) || type === val
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
                  }`}>{lbl}</button>
                </Link>
              ))}
            </div>

            <div className="w-px h-8 bg-white/[0.08] mx-1 hidden sm:block" />

            {/* Category filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(CATEGORY_META).slice(0, 5).map(([val, meta]) => (
                <Link key={val} href={buildHref({ category: category === val ? "" : val, page: "1" })}>
                  <button className={`h-9 px-3 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                    category === val 
                      ? "bg-primary/20 text-primary border border-primary/30" 
                      : "bg-white/[0.02] text-muted-foreground hover:text-foreground border border-transparent"
                  }`}>
                    <span>{meta.emoji}</span> {meta.label}
                  </button>
                </Link>
              ))}
            </div>

            {(type || category || search || month) && (
              <Link href="/dashboard/media" className="ml-auto text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Limpiar
              </Link>
            )}
          </div>

          {/* ── CONTENT GRID ── */}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-16 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-xl font-black tracking-tight mb-2">Sin contenido</h3>
              <p className="text-muted-foreground text-sm mb-6">Agrega videos, fotos e highlights del club</p>
              <MediaUploadButton />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground/60 font-medium">
                {total} archivo{total !== 1 ? "s" : ""} {month && `en ${MONTHS_ES[parseInt(month.split('-')[1]) - 1]} ${month.split('-')[0]}`}
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => {
                  const catMeta = CATEGORY_META[item.category as string] ?? CATEGORY_META.other
                  const TypeIcon = TYPE_ICON[item.type as string] ?? VideoIcon
                  const thumb = (item.thumbnail_url as string | null) ??
                    (item.type === "video" ? getYoutubeThumbnail(item.url as string) : null)
                  const isFeatured = (item as Record<string, unknown>).is_featured as boolean
                  const mediaDate = (item as Record<string, unknown>).media_date as string | null

                  return (
                    <div key={item.id} className="group rounded-2xl bg-[#111111] border border-white/[0.04] overflow-hidden hover:border-primary/30 transition-all">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-black/50 overflow-hidden">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={item.title as string} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.02] to-white/[0.05]">
                            <TypeIcon className="w-12 h-12 text-muted-foreground/20" />
                          </div>
                        )}
                        {item.type === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <PlayCircle className="w-14 h-14 text-white/80 drop-shadow-lg group-hover:scale-110 transition-transform" />
                          </div>
                        )}
                        
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <Badge className="text-[9px] uppercase font-black tracking-wider bg-black/70 text-white border-0 backdrop-blur-md px-2 py-1">
                            {catMeta.emoji} {catMeta.label}
                          </Badge>
                          {isFeatured && (
                            <Badge className="text-[9px] uppercase font-black tracking-wider bg-amber-500/90 text-black border-0 px-2 py-1">
                              <Star className="w-3 h-3 mr-1" /> Destacado
                            </Badge>
                          )}
                        </div>
                        
                        {/* Date badge */}
                        {mediaDate && (
                          <div className="absolute bottom-3 right-3">
                            <span className="text-[10px] font-bold bg-black/70 text-white/80 backdrop-blur-md px-2 py-1 rounded">
                              {new Date(mediaDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{item.title as string}</p>
                            {(item.description as string | null) && (
                              <p className="text-xs text-muted-foreground/60 truncate mt-1">{item.description as string}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                          <div className="flex items-center gap-1">
                            <LandingFeaturedButton
                              id={item.id as string}
                              initialFeatured={(item as Record<string, unknown>).landing_featured as boolean ?? false}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={item.url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.08] text-muted-foreground/60 hover:text-primary transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <DeleteMediaButton id={item.id as string} title={item.title as string} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Link href={buildHref({ page: String(page - 1) })}>
                  <button className="h-10 px-4 rounded-full border border-white/[0.08] bg-white/[0.02] text-xs font-bold hover:bg-white/[0.06] transition-colors flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground/60 font-medium px-4">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })}>
                  <button className="h-10 px-4 rounded-full border border-white/[0.08] bg-white/[0.02] text-xs font-bold hover:bg-white/[0.06] transition-colors flex items-center gap-2">
                    Siguiente <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
