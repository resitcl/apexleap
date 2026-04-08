/**
 * Constantes y tipos del flujo de enrollment / portal atleta.
 * Deben vivir fuera de `athlete-enrollment.ts` (`"use server"`) porque Next.js
 * solo permite exportar funciones async desde archivos de server actions.
 */

/** Días con cuota impaga antes de bloquear el portal (solo pagos / suscripción / cambio de plan). */
export const ATHLETE_OVERDUE_HARD_BLOCK_DAYS = 3

export type AthleteFinancialAccessState = {
  /** Primer pago (transferencia / efectivo) sin confirmar por el admin */
  awaitingAdminPaymentConfirmation: boolean
  delinquency: {
    isLate: boolean
    daysPastDue: number
    hardBlocked: boolean
    message: string | null
  }
}

export type OnboardingClub = {
  id: string
  name: string
  slug: string
  sport_type: string | null
  logo_url: string | null
  primary_color: string | null
  settings: Record<string, unknown>
}

export type OnboardingAthlete = {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  technical_meta: Record<string, unknown> | null
  enrollment_status: string | null
}

export type OnboardingPlanRow = {
  id: string
  name: string
  description: string | null
  price: number
  billing_cycle: string
  session_limit: number | null
  enrollment_fee: number | null
}

export type OnboardingData = {
  needsEnrollmentRequest: boolean
  isPendingApproval: boolean
  isRejected: boolean
  isApproved: boolean
  isTeamSport: boolean
  needsOnboarding: boolean
  needsProfileOnboarding: boolean
  needsPlatformTour: boolean
  hasPendingPayment: boolean
  pendingPaymentPlanName: string | null
  club: OnboardingClub
  bankInfo: {
    bank_name?: string
    account_type?: string
    account_number?: string
    account_holder?: string
    rut?: string
    email?: string
    whatsapp_phone?: string
  } | null
  user: { fullName: string; email: string | null; photoUrl: string | null }
  athlete: OnboardingAthlete | null
  profileComplete: boolean
  tourCompleted: boolean
  hasActiveSubscription: boolean
  plans: OnboardingPlanRow[]
}
