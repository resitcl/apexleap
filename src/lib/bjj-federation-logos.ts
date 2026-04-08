/**
 * Badges / marcas visuales por clave de federación BJJ (selectores en sport-fields).
 * Assets en /public/federations/bjj/*.svg (siglas y colores alineados a la identidad pública de cada circuito).
 */

export const BJJ_FEDERATION_LOGO_SRC: Record<string, string> = {
  IBJJF: '/federations/bjj/ibjjf.svg',
  AJP: '/federations/bjj/ajp.svg',
  ADCC: '/federations/bjj/adcc.svg',
  UAEJJF: '/federations/bjj/uaejjf.svg',
  JiuJitsu_FEST: '/federations/bjj/jiujitsu_fest.svg',
  Open_Chile: '/federations/bjj/open_chile.svg',
  Torneo_Kimura: '/federations/bjj/torneo_kimura.svg',
  Copa_Local: '/federations/bjj/copa_local.svg',
}

/** Resuelve ruta del badge; si el texto es libre, intenta coincidencia por palabras clave. */
export function resolveBjjFederationLogoSrc(federationRaw: string): string | null {
  const key = federationRaw.trim()
  if (!key) return null
  if (BJJ_FEDERATION_LOGO_SRC[key]) return BJJ_FEDERATION_LOGO_SRC[key]

  const lower = key.toLowerCase()
  if (lower.includes('ibjjf')) return BJJ_FEDERATION_LOGO_SRC.IBJJF
  if (lower.includes('ajp') || lower.includes('abu dhabi pro')) return BJJ_FEDERATION_LOGO_SRC.AJP
  if (lower.includes('adcc')) return BJJ_FEDERATION_LOGO_SRC.ADCC
  if (lower.includes('uaejjf') || lower.includes('uae jiu')) return BJJ_FEDERATION_LOGO_SRC.UAEJJF
  if (lower.includes('fest') && lower.includes('jiu')) return BJJ_FEDERATION_LOGO_SRC.JiuJitsu_FEST
  if (lower.includes('open') && lower.includes('chile')) return BJJ_FEDERATION_LOGO_SRC.Open_Chile
  if (lower.includes('kimura')) return BJJ_FEDERATION_LOGO_SRC.Torneo_Kimura
  if (lower.includes('copa') || lower.includes('local')) return BJJ_FEDERATION_LOGO_SRC.Copa_Local

  return null
}
