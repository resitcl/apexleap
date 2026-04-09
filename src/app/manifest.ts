import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ApexLeap — Performance Hub',
    short_name: 'ApexLeap',
    description:
      'Gestión integral para academias y clubes deportivos: alumnos, pagos, asistencia y más.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fafafa',
    theme_color: '#dc2626',
    lang: 'es',
    dir: 'ltr',
    categories: ['sports', 'business', 'productivity'],
    icons: [
      {
        src: '/icons/pwa-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/pwa-icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
