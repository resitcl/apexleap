export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMediaItems, getMediaByMonth, getFeaturedMedia, getMediaYears, getMediaWeekBuckets } from "@/lib/actions/media"
import { groupMediaByWeek, weekLabelEs, monthLabelEs } from "@/lib/media-archive"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportVocab } from "@/lib/sport-vocab"
import { Badge } from "@/components/ui/badge"
import { AthleteSectionHeader } from "@/components/athlete/AthleteSectionHeader"
import {
  Library, Image, FileText, PlayCircle, ExternalLink, Video,
  Calendar, Star, ChevronLeft, ChevronRight, Sparkles, Play, Search, Filter,
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

type MediaItemRow = NonNullable<Awaited<ReturnType<typeof getMediaItems>>['items']>[number]

function AthleteMediaCard({ item }: { item: MediaItemRow }) {
  const catMeta = CATEGORY_META[item.category as string] ?? CATEGORY_META.other
  const TypeIcon = TYPE_ICON[item.type as string] ?? Video
  const thumb =
    (item.thumbnail_url as string | null) ??
    (item.type === 'video' ? getYoutubeThumbnail(item.url as string) : null)
  const mediaDate = (item as Record<string, unknown>).media_date as string | null
  const isFeatured = (item as Record<string, unknown>).is_featured as boolean

  return (
    <a
      href={item.url as string}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
    >
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
              <Star className="w-3 h-3" />
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
        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{item.title as string}</p>
        {(item.description as string | null) && (
          <p className="text-xs text-muted-foreground/60 truncate mt-1">{item.description as string}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
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
}

interface PageProps {
  searchParams: Promise<{
    type?: string
    category?: string
    page?: string
    month?: string
    year?: string
    week?: string
    search?: string
  }>
}

export default async function AthleteContentPage({ searchParams }: PageProps) {
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

  const archiveMonthNoWeek = Boolean(month) && weekNum === undefined
  const listLimit = archiveMonthNoWeek ? 500 : 24
  const listPage = archiveMonthNoWeek ? 1 : page

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
  let mediaYears: number[] = [currentYear]
  let weekBuckets: number[] = [0, 0, 0, 0, 0]

  try {
    const [mediaResult, byMonth, featured, years] = await Promise.all([
      getMediaItems({
        type: type || undefined,
        category: category || undefined,
        search: search || undefined,
        month: month || undefined,
        weekOfMonth: weekNum,
        year: month ? undefined : selectedYear,
        visibilityIn: ['public', 'members'],
        page: listPage,
        limit: listLimit,
      }),
      getMediaByMonth(selectedYear, { visibilityIn: ['public', 'members'] }),
      getFeaturedMedia(4),
      getMediaYears(),
    ])
    result = mediaResult
    monthlyData = byMonth
    featuredMedia = featured
    mediaYears = years
    if (month) {
      weekBuckets = await getMediaWeekBuckets(month, { visibilityIn: ['public', 'members'] })
    }
  } catch { /* silent */ }

  const { items, total, tableExists } = result
  const perPage = listLimit
  const totalPages = Math.ceil(total / perPage)
  const itemsWithDate = items.filter((i) => Boolean((i as Record<string, unknown>).media_date))
  const itemsNoDate = items.filter((i) => !(i as Record<string, unknown>).media_date)
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
    return `/dashboard/athlete/content${s ? `?${s}` : ''}`
  }

  return (
    <div className="space-y-6 pb-12 pt-1">
      <AthleteSectionHeader
        icon={Library}
        title="Contenido"
        description="Archivo por mes y semana: repasa lo trabajado en clase o recupera el material si faltaste. Busca por título o descripción."
      />

      {!tableExists ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-16 text-center">
          <Library className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-black tracking-tight mb-2">Sin contenido publicado</h3>
          <p className="text-muted-foreground text-sm font-medium">El club aún no ha publicado fotos o videos.</p>
        </div>
      ) : (
        <>
          {/* ── FEATURED SECTION ── */}
          {featuredMedia.length > 0 && !month && !type && !category && !search && (
            <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Star className="w-4 h-4" /> Contenido destacado
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
                      className="group rounded-xl overflow-hidden bg-black/30 hover:ring-2 hover:ring-primary/50 transition-all"
                    >
                      <div className="relative aspect-video">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt={item.title as string} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10">
                            <Play className="w-8 h-8 text-primary" />
                          </div>
                        )}
                        {item.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-lg group-hover:scale-110 transition-transform" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{item.title as string}</p>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── AÑO + ARCHIVO MENSUAL ── */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-4">
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
                          : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border'
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
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
              {MONTHS_SHORT.map((m, i) => {
                const monthKey = `${selectedYear}-${String(i + 1).padStart(2, '0')}`
                const data = monthlyData[monthKey]
                const isActive = month === monthKey
                const hasContent = data && data.total > 0

                return (
                  <Link key={monthKey} href={buildHref({ month: isActive ? undefined : monthKey, week: undefined, page: '1' })}>
                    <div
                      className={`p-2.5 rounded-lg text-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                          : hasContent
                            ? 'bg-muted/30 hover:bg-muted/50 border border-border'
                            : 'bg-muted/20 text-muted-foreground/30 hover:bg-muted/35'
                      }`}
                    >
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

            {month && (
              <div className="pt-2 border-t border-border">
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
                              : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border'
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
                  Sin filtro de semana se agrupa el mes por bloques del 1–7, 8–14, etc.
                </p>
              </div>
            )}
          </div>

          {/* ── BUSCADOR + FILTROS ── */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
            <form method="get" action="/dashboard/athlete/content" className="flex items-center gap-2 flex-wrap">
              <input type="hidden" name="year" value={String(selectedYear)} />
              {type && <input type="hidden" name="type" value={type} />}
              {category && <input type="hidden" name="category" value={category} />}
              {month && <input type="hidden" name="month" value={month} />}
              {weekNum && <input type="hidden" name="week" value={String(weekNum)} />}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Buscar por título o descripción…"
                  className="h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[12rem] w-full max-w-sm"
                />
              </div>
              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
              >
                Buscar
              </button>
            </form>

            <div className="w-px h-8 bg-border mx-1 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              {[['', 'Todo'], ['video', 'Videos'], ['photo', 'Fotos']].map(([val, lbl]) => (
                <Link key={val || 'all'} href={buildHref({ type: val || undefined, page: '1' })}>
                  <button
                    className={`h-9 px-4 rounded-full text-[10px] uppercase tracking-widest font-black transition-all ${
                      (val === '' && !type) || type === val
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {lbl}
                  </button>
                </Link>
              ))}
            </div>

            <div className="w-px h-8 bg-border mx-1 hidden sm:block" />

            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.entries(CATEGORY_META).slice(0, 6).map(([val, meta]) => (
                <Link key={val} href={buildHref({ category: category === val ? undefined : val, page: '1' })}>
                  <button
                    className={`h-9 px-3 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${
                      category === val
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground border border-transparent'
                    }`}
                  >
                    <span>{meta.emoji}</span> {meta.label}
                  </button>
                </Link>
              ))}
            </div>

            {(type || category || month || search || weekNum || selectedYear !== currentYear) && (
              <Link
                href="/dashboard/athlete/content"
                className="ml-auto text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
              >
                <Filter className="w-3.5 h-3.5" /> Limpiar
              </Link>
            )}
          </div>

          {/* ── CONTENT GRID ── */}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-16 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-xl font-black tracking-tight mb-2">Sin contenido</h3>
              <p className="text-muted-foreground text-sm">
                {month
                  ? `No hay contenido en ${MONTHS_ES[parseInt(month.split('-')[1] ?? '1', 10) - 1]} ${month.split('-')[0]}`
                  : 'No se encontró contenido con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground/60 font-medium">
                {total} resultado{total !== 1 ? 's' : ''}{' '}
                {month && `en ${MONTHS_ES[parseInt(month.split('-')[1] ?? '1', 10) - 1]}`}
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
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary/90 border-b border-border pb-2">
                          {weekLabelEs(month, w)}
                        </h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {list.map((item) => (
                            <AthleteMediaCard key={item.id as string} item={item} />
                          ))}
                        </div>
                      </section>
                    )
                  })}
                  {itemsNoDate.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                        Sin fecha en el archivo
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {itemsNoDate.map((item) => (
                          <AthleteMediaCard key={item.id as string} item={item} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => (
                    <AthleteMediaCard key={item.id as string} item={item} />
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
                  <button className="h-10 px-4 rounded-full border border-border bg-muted/40 text-xs font-bold hover:bg-muted/60 transition-colors flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground/60 font-medium px-4">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })}>
                  <button className="h-10 px-4 rounded-full border border-border bg-muted/40 text-xs font-bold hover:bg-muted/60 transition-colors flex items-center gap-2">
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
