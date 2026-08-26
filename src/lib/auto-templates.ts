/**
 * Plantillas automáticas por caso de uso (confirmación de pago, recordatorio/atraso,
 * pago rechazado, bienvenida, suspensión, baja y reactivación de la membresía). Cada club puede personalizar
 * el asunto y el texto de introducción de estos correos; si no lo hace, se usa el texto por defecto.
 *
 * Se guardan en `clubs.settings.auto_templates[<key>] = { subject, body, enabled }`.
 * Módulo PURO (sin dependencias de servidor) para poder usarse también en componentes cliente.
 */

export type AutoTemplateKey =
  | "payment_confirmation"
  | "payment_reminder"
  | "payment_failed"
  | "welcome"
  | "membership_suspended"
  | "membership_cancelled"
  | "membership_reactivated"
  | "admin_payment_alert"

export type AutoTemplate = {
  /** Asunto del correo. Admite variables {{...}}. */
  subject: string
  /** Texto de introducción (reemplaza el saludo + párrafo por defecto). Admite variables y saltos de línea. */
  body: string
  /** Si está desactivada, ese correo automático no se envía. */
  enabled: boolean
  /** Texto del botón (CTA). Vacío → se usa el texto por defecto del correo. Admite variables. */
  buttonText: string
  /** URL del botón (CTA). Vacío → se usa el botón por defecto (portal del alumno). Admite variables. */
  buttonUrl: string
  /** Muestra la tarjeta con plan y monto en el correo. Solo aplica a correos que la tienen. Default true. */
  showDetails: boolean
}

export const AUTO_TEMPLATE_KEYS: AutoTemplateKey[] = [
  "payment_confirmation",
  "payment_reminder",
  "payment_failed",
  "welcome",
  "membership_suspended",
  "membership_cancelled",
  "membership_reactivated",
  "admin_payment_alert",
]

/** Metadatos para la UI: etiqueta, descripción del disparador y variables disponibles. */
export const AUTO_TEMPLATE_META: Record<
  AutoTemplateKey,
  { label: string; trigger: string; variables: string[]; hasDetailsCard: boolean }
> = {
  payment_confirmation: {
    label: "Confirmación de pago",
    trigger: "Se envía automáticamente cuando un pago se confirma (pasarela o confirmación manual).",
    variables: ["nombre", "club", "plan", "monto"],
    hasDetailsCard: true,
  },
  payment_reminder: {
    label: "Recordatorio / atraso de mensualidad",
    trigger: "Se envía por el cron de recordatorios (si están activados) según la fecha de vencimiento.",
    variables: ["nombre", "club", "plan", "monto", "fecha_vencimiento"],
    hasDetailsCard: true,
  },
  payment_failed: {
    label: "Pago rechazado",
    trigger: "Se envía cuando la pasarela (Flow / MercadoPago) rechaza o no completa un pago.",
    variables: ["nombre", "club", "plan", "monto"],
    hasDetailsCard: true,
  },
  welcome: {
    label: "Bienvenida (nuevo alumno)",
    trigger: "Se envía al inscribir un alumno nuevo que tenga email registrado.",
    variables: ["nombre", "club"],
    hasDetailsCard: false,
  },
  membership_suspended: {
    label: "Membresía suspendida",
    trigger:
      "Se envía al alumno cuando se suspende su membresía (pausa temporal): deja de generarse " +
      "el cobro mensual hasta que se reactive.",
    variables: ["nombre", "club", "plan", "fecha"],
    hasDetailsCard: true,
  },
  membership_cancelled: {
    label: "Baja de la academia",
    trigger:
      "Se envía al alumno cuando se le da de baja de la academia: su suscripción se cancela y " +
      "no se generan cobros nuevos.",
    variables: ["nombre", "club", "plan", "fecha"],
    hasDetailsCard: true,
  },
  membership_reactivated: {
    label: "Membresía reactivada",
    trigger:
      "Se envía al alumno cuando su membresía vuelve a estar activa después de una suspensión: " +
      "se reanuda el cobro y puede volver a entrenar.",
    variables: ["nombre", "club", "plan", "fecha"],
    hasDetailsCard: true,
  },
  admin_payment_alert: {
    label: "Aviso al administrador (pago de un alumno)",
    trigger:
      "Se envía a los administradores del club cuando un alumno registra un pago desde su portal " +
      "o cuando una pasarela acredita un pago automáticamente.",
    variables: ["nombre", "club", "plan", "monto", "metodo", "estado"],
    hasDetailsCard: true,
  },
}

/** Texto por defecto (subject + body) de cada caso. `enabled` por defecto es true. */
export const AUTO_TEMPLATE_DEFAULTS: Record<AutoTemplateKey, { subject: string; body: string }> = {
  payment_confirmation: {
    subject: "Pago confirmado – {{club}}",
    body: "¡Gracias, {{nombre}}!\n\nRecibimos tu pago en {{club}}. Tu membresía está al día.",
  },
  payment_reminder: {
    subject: "Recordatorio de pago – {{club}}",
    body: "Hola, {{nombre}}\n\nTe recordamos que tienes un pago pendiente en {{club}}.",
  },
  payment_failed: {
    subject: "Tu pago no se pudo procesar – {{club}}",
    body:
      "Hola, {{nombre}}\n\nIntentamos procesar tu pago en {{club}}, pero fue rechazado o no se completó. " +
      "Puedes reintentarlo desde tu cuenta cuando quieras.",
  },
  welcome: {
    subject: "¡Bienvenido/a a {{club}}! 🥋",
    body:
      "¡Bienvenido/a, {{nombre}}!\n\nTu academia {{club}} te ha dado de alta en su plataforma. " +
      "Desde tu cuenta puedes ver tus pagos y el estado de tu membresía.",
  },
  membership_suspended: {
    subject: "Tu membresía quedó suspendida – {{club}}",
    body:
      "Hola, {{nombre}}\n\nTu membresía en {{club}} quedó suspendida a partir del {{fecha}}. " +
      "Mientras esté suspendida no se generarán nuevos cobros ni podrás registrar asistencia. " +
      "Si tienes dudas, responde este correo y conversamos.",
  },
  membership_cancelled: {
    subject: "Tu membresía en {{club}} fue dada de baja",
    body:
      "Hola, {{nombre}}\n\nTe informamos que tu membresía en {{club}} fue dada de baja el {{fecha}}. " +
      "Tu suscripción quedó cancelada y no se generarán cobros nuevos. " +
      "Gracias por haber sido parte de la academia; si crees que se trata de un error, responde este correo.",
  },
  membership_reactivated: {
    subject: "Tu membresía en {{club}} está activa de nuevo",
    body:
      "¡Bienvenido/a de vuelta, {{nombre}}!\n\nTu membresía en {{club}} quedó reactivada el {{fecha}}. " +
      "Ya puedes volver a entrenar y tu plan retoma su ciclo normal de cobro.",
  },
  admin_payment_alert: {
    subject: "{{nombre}} registró un pago – {{club}}",
    body:
      "Nuevo pago registrado\n\n{{nombre}} registró un pago de {{monto}} por {{metodo}} en {{club}}. " +
      "Revisa el detalle y confirma el cobro desde el panel de Pagos.",
  },
}

/** Devuelve la plantilla efectiva de un caso: lo guardado por el club sobre el default. */
export function getAutoTemplate(
  settings: Record<string, unknown> | null | undefined,
  key: AutoTemplateKey,
): AutoTemplate {
  const def = AUTO_TEMPLATE_DEFAULTS[key]
  const all = (settings?.auto_templates ?? {}) as Record<string, Partial<AutoTemplate> | undefined>
  const saved = all[key] ?? {}
  return {
    subject: typeof saved.subject === "string" && saved.subject.trim() ? saved.subject : def.subject,
    body: typeof saved.body === "string" && saved.body.trim() ? saved.body : def.body,
    enabled: saved.enabled !== false, // por defecto activado
    buttonText: typeof saved.buttonText === "string" ? saved.buttonText : "",
    buttonUrl: typeof saved.buttonUrl === "string" ? saved.buttonUrl : "",
    showDetails: saved.showDetails !== false, // por defecto se muestra
  }
}

/** Reemplaza {{variable}} por su valor. Variables desconocidas quedan vacías. */
export function renderTemplateVars(text: string, vars: Record<string, string | number | undefined>): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, name: string) => {
    const v = vars[name.toLowerCase()]
    return v === undefined || v === null ? "" : String(v)
  })
}

/** Resuelve asunto + cuerpo ya interpolados para un caso; null si el club lo desactivó. */
export function resolveAutoEmail(
  settings: Record<string, unknown> | null | undefined,
  key: AutoTemplateKey,
  vars: Record<string, string | number | undefined>,
): { subject: string; intro: string; button: { text: string; url: string } | null; showDetails: boolean } | null {
  const tpl = getAutoTemplate(settings, key)
  if (!tpl.enabled) return null
  // Botón personalizado solo si el club definió una URL; el texto cae a "Ver más" si va vacío.
  const url = renderTemplateVars(tpl.buttonUrl, vars).trim()
  const button = url
    ? { text: renderTemplateVars(tpl.buttonText, vars).trim() || "Ver más", url }
    : null
  return {
    subject: renderTemplateVars(tpl.subject, vars),
    intro: renderTemplateVars(tpl.body, vars),
    button,
    showDetails: tpl.showDetails,
  }
}
