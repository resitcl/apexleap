/**
 * Enlaces wa.me para enviar comprobante de transferencia.
 */

export function normalizeWhatsAppDigits(input: string): string | null {
  const d = input.replace(/\D/g, '')
  if (d.length < 8) return null
  if (d.startsWith('56')) return d
  if (d.length === 9) return `56${d}`
  return d
}

export function buildWhatsAppTransferLink(phone: string, message: string): string | null {
  const digits = normalizeWhatsAppDigits(phone)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
