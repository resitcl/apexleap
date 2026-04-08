'use client'

import { useMemo } from 'react'
import { ExternalLink, PlayCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (!m) return null
  return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`
}

function vimeoEmbed(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  if (!m) return null
  return `https://player.vimeo.com/video/${m[1]}?autoplay=1`
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
}

export function MediaPlayerDialog({
  title,
  url,
  children,
}: {
  title: string
  url: string
  children: React.ReactNode
}) {
  const source = useMemo(() => {
    const yt = youtubeEmbed(url)
    if (yt) return { kind: 'iframe' as const, src: yt }
    const vm = vimeoEmbed(url)
    if (vm) return { kind: 'iframe' as const, src: vm }
    if (isDirectVideo(url)) return { kind: 'video' as const, src: url }
    return { kind: 'external' as const, src: url }
  }, [url])

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-5xl w-[96vw] p-3 sm:p-4 bg-[#0b0b0b] border-white/10">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-sm sm:text-base truncate">{title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/70">
            Reproductor de contenido
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
          {source.kind === 'iframe' && (
            <iframe
              src={source.src}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
          {source.kind === 'video' && (
            <video className="w-full h-full" src={source.src} controls autoPlay playsInline />
          )}
          {source.kind === 'external' && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <PlayCircle className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Este contenido no admite reproductor embebido.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
              >
                Abrir enlace externo <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
