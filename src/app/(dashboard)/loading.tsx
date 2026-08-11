import { Skeleton } from "@/components/ui/skeleton"

/**
 * Fallback de carga para todas las vistas del panel.
 *
 * Su presencia crea un límite de Suspense entre el layout y la página, y eso es lo que cambia
 * la experiencia: Next puede enviar el shell (barra lateral y cabecera) en el primer byte y
 * transmitir el contenido después. Sin este archivo, el navegador no recibía NADA hasta que
 * terminaban todas las consultas de la página — en la PWA eso se veía como pantalla en negro.
 *
 * También cubre la navegación cliente: al tocar un ítem del menú aparece el esqueleto de
 * inmediato en lugar de dejar la vista anterior congelada.
 *
 * El esqueleto imita la forma común de estas pantallas (título, fila de métricas, tabla) para
 * que el salto al contenido real no mueva el layout.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 pb-12 pt-1" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      {/* Cabecera */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-10 w-64 rounded-xl sm:h-12 sm:w-80" />
          <Skeleton className="h-4 w-52 rounded-lg" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-11 w-32 rounded-xl" />
          <Skeleton className="hidden h-11 w-28 rounded-xl sm:block" />
        </div>
      </div>

      {/* Fila de métricas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[20px] border border-border bg-card p-4 md:p-5">
            <div className="mb-5 flex items-center gap-2.5">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="mt-2 h-3 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <Skeleton className="h-11 w-full rounded-lg sm:max-w-md" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Listado */}
      <div className="overflow-hidden rounded-[24px] border border-border bg-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-b-0 md:px-6 md:py-5">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full rounded" />
              <Skeleton className="h-3 w-56 max-w-full rounded" />
            </div>
            <Skeleton className="hidden h-6 w-20 shrink-0 rounded-full sm:block" />
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
