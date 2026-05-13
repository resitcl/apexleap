/**
 * Mensaje legible ante fallos de la Geolocation API (solo navegador).
 */
export function geolocationErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === 'no-geo') {
    return 'Tu navegador no permite obtener la ubicación. Prueba con otro navegador o actualiza la página.'
  }
  const geo = err as Partial<GeolocationPositionError> | null
  if (geo && typeof geo.code === 'number') {
    if (geo.code === 1) {
      return 'Activa el permiso de ubicación para este sitio en la configuración del navegador.'
    }
    if (geo.code === 2) {
      return 'No se pudo determinar la ubicación. Activa el GPS o comprueba la conexión a internet.'
    }
    if (geo.code === 3) {
      return 'Tiempo de espera de ubicación agotado. Mejora la señal GPS y reintenta.'
    }
  }
  return 'No se pudo obtener tu ubicación.'
}
