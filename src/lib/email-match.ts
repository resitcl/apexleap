/**
 * Patrón para `.ilike('email', …)` que compara el email EXACTO sin distinguir mayúsculas.
 *
 * Escapa los comodines de LIKE (`%`, `_`) y el backslash: sin esto, un email como
 * `juan_perez@x.cl` también calzaría con `juanXperez@x.cl` (y podría enlazar la ficha de otra
 * persona). Coincide con el índice único `idx_athletes_unique_email` (club_id, lower(email)).
 */
export function ilikeExact(value: string): string {
  return value.trim().replace(/[\\%_]/g, (c) => `\\${c}`)
}
