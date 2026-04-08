export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMediaItems, getMediaStats, getMediaByMonth, getMediaYears, getMediaWeekBuckets } from "@/lib/actions/media"
import { groupMediaByWeek, weekLabelEs, monthLabelEs, defaultContentDateForUpload, effectiveMediaDay } from "@/lib/media-archive"
import { AthleteSectionHeader } from "@/components/athlete/AthleteSectionHeader"
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

type MediaItemRow = NonNullable<Awaited<ReturnType<typeof getMediaItems>>['items']>[number]

function MediaHubCard({ item }: { item: MediaItemRow }) {
  const catMeta = CATEGORY_META[item.category as string] ?? CATEGORY_META.other
  const TypeIcon = TYPE_ICON[item.type as string] ?? VideoIcon
  const thumb =
    (item.thumbnail_url as string | null) ??
    (item.type === 'video' ? getYoutubeThumbnail(item.url as string) : null)
  const isFeatured = (item as Record<string, unknown>).is_featured as boolean
  const mediaDate = effectiveMediaDay({
    media_date: (item as Record<string, unknown>).media_date as string | null,
    created_at: (item as Record<string, unknown>).created_at as string | null,
  })

  return (
    <div className="group rounded-2xl bg-[#111111] border border-white/[0.04] overflow-hidden hover:border-primary/30 transition-all">
      <div className="relative aspect-video bg-black/50 overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={item.title as string}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.02] to-white/[0.05]">
            <TypeIcon className="w-12 h-12 text-muted-foreground/20" />
          </div>
        )}
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
            <PlayCircle className="w-14 h-14 text-white/80 drop-shadow-lg group-hover:scale-110 transition-transform" />
          </div>
        )}
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
        {mediaDate && (
          <div className="absolute bottom-3 right-3">
            <span className="text-[10px] font-bold bg-black/70 text-white/80 backdrop-blur-md px-2 py-1 rounded">
              {new Date(mediaDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{item.title as string}</p>
            {(item.description as string | null) && (
              <p className="text-xs text-muted-foreground/60 truncate mt-1">{item.description as string}</p>
            )}
          </div>
        </div>
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
}

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
  return null
}

interface PageProps {
  searchParams: Promise<{
    type?: string
    category?: string
    search?: string
    page?: string
    month?: string
    year?: string
    week?: string
  }>
}

export default async function MediaPage({ searchParams }: PageProps) {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const params = await searchParams
  const type     = params.type     ?? ""
  const category = params.category ?? ""
  const search   = params.search   ?? ""
  const month    = params.month    ?? ""
  const page     = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const currentYear = new Date().getFullYear()
  const selectedYear = Math.min(
    currentYear + 1,
    Math.max(2000, parseInt(params.year ?? String(currentYear), 10) || currentYear)
  )
  const weekRaw = params.week ?? ""
  const weekNum =
    weekRaw && /^[1-5]$/.test(weekRaw) ? parseInt(weekRaw, 10) : undefined

  const suggestedUploadDate = defaultContentDateForUpload(selectedYear, month || undefined, weekNum)

  const archiveMonthNoWeek = Boolean(month) && weekNum === undefined
  const listLimit = archiveMonthNoWeek ? 500 : 24
  const listPage = archiveMonthNoWeek ? 1 : page

  // Fetch data
  let result: Awaited<ReturnType<typeof getMediaItems>> = { items: [], total: 0, tableExists: true }
  let stats: Awaited<ReturnType<typeof getMediaStats>> = null
  let monthlyData: Awaited<ReturnType<typeof getMediaByMonth>> = {}
  let mediaYears: number[] = [currentYear]
  let weekBuckets: number[] = [0, 0, 0, 0, 0]

  try {
    result = await getMediaItems({
      type: type || undefined,
      category: category || undefined,
      search: search || undefined,
      month: month || undefined,
      weekOfMonth: weekNum,
      year: month ? undefined : selectedYear,
      page: listPage,
      limit: listLimit,
    })
  } catch (err) {
    console.error('[MediaHub] getMediaItems failed:', err)
  }

  try { stats = await getMediaStats() } catch { /* stats are optional */ }
  try { monthlyData = await getMediaByMonth(selectedYear) } catch { /* optional */ }
  try { mediaYears = await getMediaYears() } catch { /* optional */ }
  try { if (month) weekBuckets = await getMediaWeekBuckets(month) } catch { /* optional */ }

  const { items, total, tableExists } = result
  const perPage = listLimit
  const totalPages = Math.ceil(total / perPage)
  const itemsWithDate = items.filter((i) =>
    Boolean(effectiveMediaDay({ media_date: (i as Record<string, unknown>).media_date as string | null, created_at: (i as Record<string, unknown>).created_at as string | null })),
  )
  const itemsNoDate = items.filter(
    (i) => !effectiveMediaDay({ media_date: (i as Record<string, unknown>).media_date as string | null, created_at: (i as Record<string, unknown>).created_at as string | null }),
  )
  const groupedByWeek = archiveMonthNoWeek ? groupMediaByWeek(itemsWithDate) : null

  function buildHref(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string> = {
      year: String(selectedYear),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(search ? { search } : {}),
      ...(month ? { month } : {}),
      ...(weekNum ? { week: String(weekNum) } : {}),
      ...(page > 1 && !archiveMonthNoWeek ? { page: String(page) } : {}),
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === '') delete (merged as Record<string, string>)[k]
      else (merged as Record<string, string>)[k] = v
    }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    const s = p.toString()
    return `/dashboard/media${s ? `?${s}` : ""}`
  }

  return (
    <div className="space-y-6 pb-12">
      <AthleteSectionHeader
        icon={Film}
        title="Media Hub"
        description="Archivo del año: el coach documenta qué se trabaja por mes y semana; los alumnos buscan o repasan clase a clase."
        endSlot={<MediaUploadButton suggestedMediaDate={suggestedUploadDate} defaultType={(type || undefined) as 'video' | 'photo' | 'document' | undefined} defaultCategory={(category || undefined) as 'match' | 'highlight' | 'training' | 'technique' | 'analysis' | 'event' | 'promo' | 'photo' | 'other' | undefined} />}
      />

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

          {/* ── AÑO + CALENDARIO MENSUAL ── */}
          <div className="rounded-xl bg-[#111111] border border-white/[0.04] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Archivo por mes
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Año</span>
                <div className="flex flex-wrap gap-1">
                  {mediaYears.map((y) => (
                    <Link
                      key={y}
                      href={buildHref({ year: String(y), month: undefined, week: undefined, page: undefined })}
                      className={`h-8 min-w-[2.5rem] px-2 rounded-lg text-xs font-black flex items-center justify-center transition-colors ${
                        selectedYear === y
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] border border-white/[0.08]'
                      }`}
                    >
                      {y}
                    </Link>
                  ))}
                </div>
                {month && (
                  <Link href={buildHref({ month: undefined, week: undefined, page: '1' })} className="text-[10px] font-bold text-primary hover:underline">
                    Ver año completo
                  </Link>
                )}
              </div>
            </div>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
              {MONTHS_ES.map((m, i) => {
                const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`
                const data = monthlyData[monthKey]
                const isActive = month === monthKey
                const hasContent = data && data.total > 0

                return (
                  <Link key={monthKey} href={buildHref({ month: isActive ? undefined : monthKey, week: undefined, page: '1' })}>
                    <div
                      className={`p-2 rounded-lg text-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : hasContent
                            ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]'
                            : 'bg-white/[0.01] text-muted-foreground/30'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase">{m}</p>
                      {hasContent && (
                        <p className={`text-xs font-black mt-0.5 ${isActive ? '' : 'text-primary'}`}>{data.total}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Semanas del mes (1–5) */}
            {month && (
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">
                  {monthLabelEs(month)} — por semana
                </p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((w) => {
                    const count = weekBuckets[w - 1] ?? 0
                    const isWeek = weekNum === w
                    return (
                      <Link key={w} href={buildHref({ week: isWeek ? undefined : String(w), page: '1' })}>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all ${
                            isWeek
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] border border-white/[0.08]'
                          }`}
                        >
                          {weekLabelEs(month, w)}
                          {count > 0 && <span className="opacity-80">({count})</span>}
                        </span>
                      </Link>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground/50 mt-2">
                  Sin filtro de semana se agrupa todo el mes por bloques del 1–7, 8–14, etc.
                </p>
              </div>
            )}
          </div>

          {/* ── FILTERS ── */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            {/* Search */}
            <form method="get" action="/dashboard/media" className="flex items-center gap-2 flex-wrap">
              <input type="hidden" name="year" value={String(selectedYear)} />
              {type     && <input type="hidden" name="type"     value={type}     />}
              {category && <input type="hidden" name="category" value={category} />}
              {month    && <input type="hidden" name="month"    value={month}    />}
              {weekNum  && <input type="hidden" name="week"     value={String(weekNum)} />}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <input 
                  type="text" 
                  name="search" 
                  defaultValue={search}
                  placeholder="Buscar contenido..."
                  className="h-10 pl-10 pr-4 rounded-lg border border-white/[0.08] bg-white/[0.02] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[12rem] w-full max-w-sm" 
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
                <Link key={val || 'all'} href={buildHref({ type: val || undefined, page: '1' })}>
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
                <Link key={val} href={buildHref({ category: category === val ? undefined : val, page: '1' })}>
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

            {(type || category || search || month || weekNum || selectedYear !== currentYear) && (
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
              <MediaUploadButton suggestedMediaDate={suggestedUploadDate} defaultType={(type || undefined) as 'video' | 'photo' | 'document' | undefined} defaultCategory={(category || undefined) as 'match' | 'highlight' | 'training' | 'technique' | 'analysis' | 'event' | 'promo' | 'photo' | 'other' | undefined} />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground/60 font-medium">
                {total} archivo{total !== 1 ? 's' : ''}{' '}
                {month && `en ${MONTHS_ES[parseInt(month.split('-')[1] ?? '1', 10) - 1]} ${month.split('-')[0]}`}
                {archiveMonthNoWeek && total > 500 && (
                  <span className="text-amber-400/90"> — Mostrando los primeros 500; acota por semana o busca.</span>
                )}
              </p>

              {archiveMonthNoWeek && month && (groupedByWeek && groupedByWeek.size > 0 || itemsNoDate.length > 0) ? (
                <div className="space-y-10">
                  {[1, 2, 3, 4, 5].map((w) => {
                    const list = groupedByWeek?.get(w) ?? []
                    if (!list.length) return null
                    return (
                      <section key={w} className="space-y-3">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary/90 border-b border-white/10 pb-2">
                          {weekLabelEs(month, w)}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {list.map((item) => (
                            <MediaHubCard key={item.id as string} item={item} />
                          ))}
                        </div>
                      </section>
                    )
                  })}
                  {itemsNoDate.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-white/10 pb-2">
                        Sin fecha en el archivo
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {itemsNoDate.map((item) => (
                          <MediaHubCard key={item.id as string} item={item} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => (
                    <MediaHubCard key={item.id as string} item={item} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── PAGINATION ── */}
          {!archiveMonthNoWeek && totalPages > 1 && (
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
