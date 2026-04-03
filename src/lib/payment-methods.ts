/**
 * Medios de pago en ApexLeap: la configuración vive en `clubs.settings.payment_settings`
 * (solo editable desde Configuración del club / admin).
 *
 * - Transferencia / efectivo: toggles en `enabled_methods` + datos bancarios para transfer.
 * - Pasarelas (Flow, Webpay, MercadoPago, Khipu): `*.enabled` y credenciales mínimas.
 * - La integración server-to-server de cobro online no está implementada aún; el atleta
 *   genera solicitud pendiente y el admin confirma (flujo coherente con transfer/efectivo).
 */

/** Pasarelas online (no incluye transfer ni cash). */
export const ONLINE_GATEWAY_IDS = ['flow', 'webpay', 'mercadopago', 'khipu'] as const

export type OnlineGatewayId = (typeof ONLINE_GATEWAY_IDS)[number]

function nonEmpty(s?: string | null): boolean {
  return typeof s === 'string' && s.trim().length > 0
}

type GatewayCfg = {
  enabled?: boolean
  api_key?: string
  secret_key?: string
  commerce_code?: string
}

function gatewayConfigured(id: OnlineGatewayId, g?: GatewayCfg): boolean {
  if (!g?.enabled) return false
  switch (id) {
    case 'flow':
      return nonEmpty(g.api_key) && nonEmpty(g.secret_key)
    case 'webpay':
      return nonEmpty(g.commerce_code) && nonEmpty(g.api_key) && nonEmpty(g.secret_key)
    case 'mercadopago':
      return nonEmpty(g.api_key) && nonEmpty(g.secret_key)
    case 'khipu':
      return nonEmpty(g.api_key) && nonEmpty(g.secret_key)
    default:
      return false
  }
}

/**
 * Resuelve qué IDs de método puede ver/usar el atleta.
 * - `null`: no existe `payment_settings` en settings → compatibilidad: mostrar todos los métodos “conocidos” (legacy).
 * - lista: solo métodos habilitados y con credenciales/datos mínimos.
 */
export function getEnabledPaymentMethodIdsFromClubSettings(
  settings: Record<string, unknown> | null | undefined
): string[] | null {
  if (!settings || !Object.prototype.hasOwnProperty.call(settings, 'payment_settings')) {
    return null
  }
  const raw = settings.payment_settings
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return []
  }
  const ps = raw as {
    enabled_methods?: string[]
    bank_info?: { account_number?: string | null }
    flow?: GatewayCfg
    webpay?: GatewayCfg
    mercadopago?: GatewayCfg
    khipu?: GatewayCfg
  }
  const out: string[] = []
  const em = ps.enabled_methods ?? []

  if (em.includes('transfer')) {
    const acc = ps.bank_info?.account_number
    if (nonEmpty(acc)) out.push('transfer')
  }
  if (em.includes('cash')) {
    out.push('cash')
  }
  for (const id of ONLINE_GATEWAY_IDS) {
    if (gatewayConfigured(id, ps[id])) {
      out.push(id)
    }
  }
  return out
}

export function assertPaymentMethodEnabled(
  enabledIds: string[] | null,
  paymentMethod: string
): void {
  if (enabledIds === null) return
  if (!enabledIds.includes(paymentMethod)) {
    throw new Error('Este medio de pago no está habilitado para tu club.')
  }
}

/** Suscripción queda en espera hasta que el admin confirme el pago (todos los métodos actuales). */
export function subscriptionRequiresPaymentConfirmation(paymentMethod: string): boolean {
  return (
    paymentMethod === 'transfer' ||
    paymentMethod === 'cash' ||
    (ONLINE_GATEWAY_IDS as readonly string[]).includes(paymentMethod)
  )
}
