export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMediaItems, getMediaByMonth, getFeaturedMedia } from "@/lib/actions/media"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportVocab } from "@/lib/sport-vocab"
import { Badge } from "@/components/ui/badge"
import {
  Film, Image, FileText, PlayCircle, ExternalLink, Video,
  Calendar, Star, ChevronLeft, ChevronRight, Sparkles, Play,
} from "lucide-react"

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  match:     { label: "Partido",       emoji: "⚽", color: "emerald" },
  highlight: { label: "Highlight",     emoji: "✨", color: "amber" },
  training:  { label: "Entrenamiento", emoji: "🏋️", color: "blue" },
  technique: { label: "Técnica",       emoji: "🥋", color: "violet" },
  analysis:  { label: "Análisis",      emoji: "📊", color: "cyan" },
  event:     { label: "Evento",        emoji: "🎉", color: "pink" },
  photo:     { label: "Foto",          emoji: "📸", color: "rose" },
  other:     { label: "Otro",          emoji: "📁", color: "slate" },
}

const TYPE_ICON: Record<string, React.ElementType> = {
  video:    PlayCircle,
  photo:    Image,
  document: FileText,
}

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
  return null
}

interface PageProps {
  searchParams: Promise<{ type?: string; category?: string; page?: string; month?: string }>
}

export default async function AthleteContentPage({ searchParams }: PageProps) {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const params = await searchParams
  const type     = params.type     ?? ""
  const category = params.category ?? ""
  const month    = params.month    ?? ""
  const page     = parseInt(params.page ?? "1")

  // Get club settings for sport-specific vocabulary
  let sportType: string | null = null
  try {
    const settings = await getClubSettings()
    sportType = (settings as { sport_type?: string | null })?.sport_type ?? null
  } catch { /* silent */ }
  const vocab = getSportVocab(sportType)

  // Fetch data
  let result: Awaited<ReturnType<typeof getMediaItems>> = { items: [], total: 0, tableExists: true }
  let monthlyData: Awaited<ReturnType<typeof getMediaByMonth>> = {}
  let featuredMedia: Awaited<ReturnType<typeof getFeaturedMedia>> = []

  try {
    const [mediaResult, byMonth, featured] = await Promise.all([
      getMediaItems({
        type: type || undefined,
        category: category || undefined,
        month: month || undefined,
        visibility: 'public',
        page
      }),
      getMediaByMonth(),
      getFeaturedMedia(4),
    ])
    result = mediaResult
    monthlyData = byMonth
    featuredMedia = featured
  } catch { /* silent */ }

  const { items: allItems, total, tableExists } = result
  // Filter to only show public content for athletes
  const items = allItems.filter((i) => {
    const visibility = (i as Record<string, unknown>).visibility as string | undefined
    return visibility === 'public' || visibility === 'members' || (i as Record<string, unknown>).is_public !== false
  })
  const totalPages = Math.ceil(total / 24)
  const currentYear = new Date().getFullYear()

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(type     ? { type }     : {}),
      ...(category ? { category } : {}),
      ...(month    ? { month }    : {}),
      ...(page > 1 ? { page: String(page) } : {}),
      ...overrides,
    })
    const s = p.toString()
    return `/dashboard/athlete/content${s ? `?${s}` : ""}`
  }

  return (
    <div className="space-y-6 pb-12 pt-1">
      {/* ── PREMIUM HEADER ── */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Film className="w-6 h-6 text-white" />
          </div>
          Media Hub
        </h1>
        <p className="text-muted-foreground/80 mt-3 font-medium max-w-xl">
          Videos de {vocab.competitions.toLowerCase()}, técnicas de entrenamiento, highlights y contenido exclusivo del club.
        </p>
      </div>

      {!tableExists ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-16 text-center">
          <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-black tracking-tight mb-2">Sin contenido publicado</h3>
          <p className="text-muted-foreground text-sm font-medium">El club aún no ha publicado fotos o videos.</p>
        </div>
      ) : (
        <>
          {/* ── FEATURED SECTION ── */}
          {featuredMedia.length > 0 && !month && !type && !category && (
            <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black uppercase tracking-widest text-violet-400 flex items-center gap-2">
                  <Star className="w-4 h-4" /> Contenido Destacado
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredMedia.map((item) => {
                  const thumb = (item.thumbnail_url as string | null) ??
                    (item.type === "video" ? getYoutubeThumbnail(item.url as string) : null)
                  return (
                    <a
                      key={item.id}
                      href={item.url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl overflow-hidden bg-black/30 hover:ring-2 hover:ring-violet-500/50 transition-all"
                    >
                      <div className="relative aspect-video">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={item.title as string} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                            <Play className="w-8 h-8 text-violet-400" />
                          </div>
                        )}
                        {item.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-lg group-hover:scale-110 transition-transform" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-bold truncate group-hover:text-violet-400 transition-colors">{item.title as string}</p>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── CALENDAR NAVIGATION ── */}
          {Object.keys(monthlyData).length > 0 && (
            <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Archivo por Mes — {currentYear}
                </p>
                {month && (
                  <Link href={buildHref({ month: '', page: '1' })} className="text-[10px] font-bold text-primary hover:underline">
                    Ver todo
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                {MONTHS_SHORT.map((m, i) => {
                  const monthKey = `${currentYear}-${String(i + 1).padStart(2, '0')}`
                  const data = monthlyData[monthKey]
                  const isActive = month === monthKey
                  const hasContent = data && data.total > 0
                  
                  return (
                    <Link key={monthKey} href={buildHref({ month: isActive ? '' : monthKey, page: '1' })}>
                      <div className={`p-2.5 rounded-lg text-center transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/50' 
                          : hasContent 
                            ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]' 
                            : 'bg-white/[0.01] text-muted-foreground/30 hover:bg-white/[0.02]'
                      }`}>
                        <p className="text-[10px] font-bold uppercase">{m}</p>
                        {hasContent && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <p className={`text-xs font-black ${isActive ? '' : 'text-primary'}`}>{data.total}</p>
                          </div>
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
              {Object.entries(CATEGORY_META).slice(0, 6).map(([val, meta]) => (
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

            {(type || category || month) && (
              <Link href="/dashboard/athlete/content" className="ml-auto text-xs text-red-400 hover:text-red-300 font-bold">
                ✕ Limpiar filtros
              </Link>
            )}
          </div>

          {/* ── CONTENT GRID ── */}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-16 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-xl font-black tracking-tight mb-2">Sin contenido</h3>
              <p className="text-muted-foreground text-sm">
                {month ? `No hay contenido en ${MONTHS_ES[parseInt(month.split('-')[1]) - 1]} ${month.split('-')[0]}` : 'No se encontró contenido con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground/60 font-medium">
                {items.length} archivo{items.length !== 1 ? "s" : ""} {month && `en ${MONTHS_ES[parseInt(month.split('-')[1]) - 1]}`}
              </p>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => {
                  const catMeta = CATEGORY_META[item.category as string] ?? CATEGORY_META.other
                  const TypeIcon = TYPE_ICON[item.type as string] ?? Video
                  const thumb = (item.thumbnail_url as string | null) ??
                    (item.type === "video" ? getYoutubeThumbnail(item.url as string) : null)
                  const mediaDate = (item as Record<string, unknown>).media_date as string | null
                  const isFeatured = (item as Record<string, unknown>).is_featured as boolean

                  return (
                    <a
                      key={item.id}
                      href={item.url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-2xl bg-[#111111] border border-white/[0.04] overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
                    >
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
                              <Star className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                        
                        {/* Date */}
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
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{item.title as string}</p>
                        {(item.description as string | null) && (
                          <p className="text-xs text-muted-foreground/60 truncate mt-1">{item.description as string}</p>
                        )}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                          <div className="flex items-center gap-1.5 text-muted-foreground/40">
                            <TypeIcon className="w-3.5 h-3.5" />
                            <span className="text-[9px] uppercase font-bold tracking-widest">
                              {item.type === 'video' ? 'Video' : item.type === 'photo' ? 'Foto' : 'Doc'}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase font-black tracking-widest text-primary flex items-center gap-1">
                            Ver <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </a>
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
