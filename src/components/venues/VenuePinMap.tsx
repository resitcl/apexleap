'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  lat: number
  lng: number
  draggable: boolean
  onChange: (location: { lat: string; lng: string }) => void
}

declare global {
  interface Window {
    L?: {
      map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap
      tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
      marker: (latlng: [number, number], options?: Record<string, unknown>) => LeafletMarker
    }
  }
}

interface LeafletMap {
  setView: (latlng: [number, number], zoom: number) => LeafletMap
  remove: () => void
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker
  setLatLng: (latlng: [number, number]) => LeafletMarker
  dragging?: { enable: () => void; disable: () => void }
  on: (event: string, handler: () => void) => LeafletMarker
  getLatLng: () => { lat: number; lng: number }
}

let leafletPromise: Promise<void> | null = null

function loadLeaflet() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.L) return Promise.resolve()
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise<void>((resolve, reject) => {
    const existingCss = document.querySelector('link[data-leaflet="true"]')
    if (!existingCss) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      css.dataset.leaflet = 'true'
      document.head.appendChild(css)
    }

    const existingScript = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('leaflet-load-error')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.dataset.leaflet = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('leaflet-load-error'))
    document.body.appendChild(script)
  })

  return leafletPromise
}

export function VenuePinMap({ lat, lng, draggable, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const markerRef = useRef<LeafletMarker | null>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    loadLeaflet()
      .then(() => {
        if (!mounted || !containerRef.current || !window.L) return

        if (!mapRef.current) {
          const map = window.L.map(containerRef.current, {
            zoomControl: true,
            attributionControl: true,
          }).setView([lat, lng], 17)

          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map)

          const marker = window.L.marker([lat, lng], { draggable }).addTo(map)
          marker.on('dragend', () => {
            const point = marker.getLatLng()
            onChange({ lat: point.lat.toFixed(6), lng: point.lng.toFixed(6) })
          })

          mapRef.current = map
          markerRef.current = marker
        }

        setReady(true)
      })
      .catch(() => {
        if (mounted) setError('No se pudo cargar el mapa interactivo')
      })

    return () => {
      mounted = false
    }
  }, [lat, lng, draggable, onChange])

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return
    mapRef.current.setView([lat, lng], 17)
    markerRef.current.setLatLng([lat, lng])
    if (draggable) markerRef.current.dragging?.enable()
    else markerRef.current.dragging?.disable()
  }, [lat, lng, draggable])

  useEffect(() => {
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  if (error) {
    return <div className="flex h-56 items-center justify-center rounded-lg border text-sm text-muted-foreground">{error}</div>
  }

  return (
    <div className="relative overflow-hidden rounded-lg border bg-background">
      <div ref={containerRef} className="h-56 w-full" />
      {!ready ? <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground">Cargando mapa...</div> : null}
    </div>
  )
}
