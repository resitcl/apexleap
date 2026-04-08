/** Normaliza color de marca del club (#RRGGBB) para CSS y contrastes. */

const HEX6 = /^#([0-9A-Fa-f]{6})$/
const HEX3 = /^#([0-9A-Fa-f]{3})$/

export const DEFAULT_CLUB_PRIMARY = '#34d399'

export function normalizeClubPrimary(input: string | null | undefined, fallback = DEFAULT_CLUB_PRIMARY): string {
  if (!input || typeof input !== 'string') return fallback
  const t = input.trim()
  let m = t.match(HEX6)
  if (m) return `#${m[1].toLowerCase()}`
  m = t.match(HEX3)
  if (m) {
    const s = m[1].toLowerCase()
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`
  }
  return fallback
}

/** Contraste legible sobre el color de marca (botones, sidebar). */
export function primaryForegroundForHex(hex: string): '#000000' | '#ffffff' {
  const m = hex.replace('#', '')
  if (m.length !== 6) return '#000000'
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 180 ? '#000000' : '#ffffff'
}

/** Variables CSS para alinear Tailwind `primary` / sidebar con la marca del club. */
export function dashboardBrandingCssVars(primaryHex: string): Record<string, string> {
  const p = normalizeClubPrimary(primaryHex)
  const fg = primaryForegroundForHex(p)
  return {
    '--primary': p,
    '--primary-foreground': fg,
    '--ring': p,
    '--sidebar-primary': p,
    '--sidebar-primary-foreground': fg,
    '--sidebar-ring': p,
  }
}

/**
 * Lee `clubs.settings.use_brand_primary_for_ui` (JSON).
 * Si falta la clave, se asume `true` (comportamiento histórico: color de marca en la UI).
 */
export function useBrandPrimaryFromClubSettings(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return true
  return (settings as Record<string, unknown>).use_brand_primary_for_ui !== false
}

/** Solo aplica variables de tema si el club eligió sustituir el verde por su color de marca. */
export function clubThemeBrandingVars(
  primaryHex: string | null | undefined,
  useBrandForUi: boolean | null | undefined,
): Record<string, string> {
  const on = useBrandForUi !== false
  if (!on) return {}
  return dashboardBrandingCssVars(normalizeClubPrimary(primaryHex))
}
