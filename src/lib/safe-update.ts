import type { z } from 'zod'

/**
 * Deja pasar solo los campos que declara el schema de la entidad (lista blanca de columnas).
 *
 * Un server action recibe JSON arbitrario: el tipo `Partial<XInput>` solo existe en TypeScript.
 * Las ediciones hacían `update({ ...input })`, así que quien llamara la acción a mano podía
 * escribir columnas que el formulario nunca ofrece (`club_id`, `user_id`, `created_at`…). Como la
 * base se accede con service-role (sin RLS), nada más lo impedía.
 *
 * Solo filtra CLAVES; no valida tipos ni aplica los `.default()` del schema. Es a propósito: los
 * formularios de edición mandan valores que el schema de creación rechazaría (p. ej. una hora
 * `18:00:00` leída de la base contra el formato `HH:MM`), y un default pisaría columnas que el
 * usuario no tocó. Las claves ausentes o `undefined` se omiten.
 */
export function pickSchemaFields<S extends z.ZodObject<z.ZodRawShape>>(
  schema: S,
  input: unknown,
): Record<string, unknown> {
  return pickFields(input, Object.keys(schema.shape))
}

/** Igual que `pickSchemaFields`, con la lista de columnas editables dada a mano. */
export function pickFields(input: unknown, allowedKeys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const allowed = new Set(allowedKeys)
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(
      ([key, value]) => allowed.has(key) && value !== undefined,
    ),
  )
}
