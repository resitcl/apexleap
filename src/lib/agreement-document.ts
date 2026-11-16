/**
 * Rellena el texto de una plantilla de acuerdo: reemplaza cada `{{variable}}` por su valor.
 *
 * - Una variable que no existe se deja tal cual (`{{algo}}`), para que el club note el error de
 *   tipeo en vez de que desaparezca en silencio.
 * - Los valores se insertan como texto literal: un nombre con `$1` o `$&` no se interpreta como
 *   patrón de reemplazo, y una llave no se trata como expresión regular.
 */
export function renderAgreementDocument(templateContent: string, variables: Record<string, string>): string {
  return templateContent.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match,
  )
}
