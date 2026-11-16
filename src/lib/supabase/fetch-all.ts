/**
 * Lee TODAS las filas de una consulta, paginando.
 *
 * PostgREST (Supabase) corta cada respuesta en `max-rows` (1.000 por defecto) sin avisar. Las
 * consultas que suman o cuentan "todo" (KPIs, exportaciones) quedaban truncadas en silencio
 * cuando el club pasaba de 1.000 cuotas o suscripciones, y como no llevaban orden, sobre una
 * parte arbitraria del historial.
 *
 * La consulta debe pedir `{ count: 'exact' }` y un orden ESTABLE (p. ej. `.order('id')`); sin
 * orden estable dos páginas pueden repetir u omitir filas.
 *
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase
 *       .from('payments')
 *       .select('status, amount', { count: 'exact' })
 *       .eq('club_id', clubId)
 *       .order('id')
 *       .range(from, to),
 *   )
 *
 * Es una corrección de exactitud, no de rendimiento: para clubes grandes lo correcto es mover
 * estos agregados a SQL (vista o RPC con `sum`/`count`).
 */

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
  count?: number | null
}

const PAGE_SIZE = 1000
/** Tope de seguridad contra un bucle sin fin (200 páginas = 200.000 filas). */
const MAX_PAGES = 200

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = []

  for (let i = 0; i < MAX_PAGES; i++) {
    // Se avanza por filas realmente recibidas: si el servidor recorta la página por debajo de
    // PAGE_SIZE, la siguiente petición continúa donde quedó en vez de saltarse filas.
    const from = rows.length
    const { data, error, count } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)

    const batch = data ?? []
    rows.push(...batch)

    if (batch.length === 0) break
    if (typeof count === 'number') {
      if (rows.length >= count) break
    } else if (batch.length < PAGE_SIZE) {
      break
    }
  }

  return rows
}
