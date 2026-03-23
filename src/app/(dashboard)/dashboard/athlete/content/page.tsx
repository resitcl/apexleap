export const dynamic = "force-dynamic"

import Link from "next/link"
import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMediaItems } from "@/lib/actions/media"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Film, Image, FileText, PlayCircle, ExternalLink, Video } from "lucide-react"

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  match:     { label: "Partido",       emoji: "⚽" },
  highlight: { label: "Highlight",     emoji: "✨" },
  training:  { label: "Entrenamiento", emoji: "🏋️" },
  photo:     { label: "Foto",          emoji: "📸" },
  other:     { label: "Otro",          emoji: "📁" },
}

const TYPE_ICON: Record<string, React.ElementType> = {
  video:    PlayCircle,
  photo:    Image,
  document: FileText,
}

function getYoutubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
  return null
}

interface PageProps {
  searchParams: Promise<{ type?: string; category?: string; page?: string }>
}

export default async function AthleteContentPage({ searchParams }: PageProps) {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const params = await searchParams
  const type     = params.type     ?? ""
  const category = params.category ?? ""
  const page     = parseInt(params.page ?? "1")

  let result: Awaited<ReturnType<typeof getMediaItems>> = { items: [], total: 0, tableExists: true }
  try {
    result = await getMediaItems({ type: type || undefined, category: category || undefined, page })
  } catch { /* silent */ }

  const { items: allItems, total, tableExists } = result
  const items = allItems.filter((i) => (i as Record<string, unknown>).is_public !== false)
  const totalPages = Math.ceil(total / 24)

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({
      ...(type     ? { type }     : {}),
      ...(category ? { category } : {}),
      ...(page > 1 ? { page: String(page) } : {}),
      ...overrides,
    })
    const s = p.toString()
    return `/dashboard/athlete/content${s ? `?${s}` : ""}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Film className="w-8 h-8" /> Contenido del Club
        </h1>
        <p className="text-muted-foreground">Videos, fotos e highlights compartidos por el club</p>
      </div>

      {!tableExists ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground text-sm">El club aún no ha publicado contenido.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            {[["", "Todo"], ["video", "Videos"], ["photo", "Fotos"], ["document", "Docs"]].map(([val, lbl]) => (
              <Link key={val} href={buildHref({ type: val, page: "1" })}>
                <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
                  (val === "" && !type) || type === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-input hover:bg-accent"
                }`}>{lbl}</button>
              </Link>
            ))}
            <span className="w-px h-5 bg-border mx-1" />
            {Object.entries(CATEGORY_META).map(([val, meta]) => (
              <Link key={val} href={buildHref({ category: category === val ? "" : val, page: "1" })}>
                <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
                  category === val ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-accent"
                }`}>{meta.emoji} {meta.label}</button>
              </Link>
            ))}
            {(type || category) && (
              <Link href="/dashboard/athlete/content" className="text-xs text-muted-foreground hover:text-foreground ml-1">
                ✕ Limpiar
              </Link>
            )}
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Film className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground text-sm">No hay contenido disponible por el momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const catMeta = CATEGORY_META[item.category as string] ?? CATEGORY_META.other
                const TypeIcon = TYPE_ICON[item.type as string] ?? Video
                const thumb = (item.thumbnail_url as string | null) ??
                  (item.type === "video" ? getYoutubeThumbnail(item.url as string) : null)

                return (
                  <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={item.title as string} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TypeIcon className="w-10 h-10 text-muted-foreground opacity-40" />
                        </div>
                      )}
                      {item.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <PlayCircle className="w-10 h-10 text-white drop-shadow" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Badge className="text-xs bg-black/60 text-white border-0 backdrop-blur-sm">
                          {catMeta.emoji} {catMeta.label}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="py-3 px-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title as string}</p>
                          {(item.description as string | null) && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description as string}</p>
                          )}
                        </div>
                        <a
                          href={item.url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded flex items-center justify-center hover:bg-accent text-muted-foreground shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Link href={buildHref({ page: String(page - 1) })}>
                  <button className="h-8 px-3 rounded-md border text-xs hover:bg-accent">← Anterior</button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })}>
                  <button className="h-8 px-3 rounded-md border text-xs hover:bg-accent">Siguiente →</button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
