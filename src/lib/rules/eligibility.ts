import type { EligibilityResult } from '@/types'

interface AthleteData {
  id: string
  healthStatus: 'healthy' | 'injured' | 'observation'
  paymentStatus: 'current' | 'pending' | 'overdue'
  attendancePercentage: number
  documentsExpired: boolean
}

interface ClubRules {
  maxOverduePayments: number
  minAttendancePercentage: number
  blockOnExpiredDocuments: boolean
}

export function checkEligibility(
  athlete: AthleteData,
  rules: ClubRules
): EligibilityResult {
  const blockedReasons: string[] = []
  const warnings: string[] = []

  // Check health status
  if (athlete.healthStatus === 'injured') {
    blockedReasons.push('Lesión activa registrada')
  } else if (athlete.healthStatus === 'observation') {
    warnings.push('En observación médica')
  }

  // Check payment status
  if (athlete.paymentStatus === 'overdue') {
    blockedReasons.push(`Deuda pendiente - máximo permitido: ${rules.maxOverduePayments} cuota(s)`)
  } else if (athlete.paymentStatus === 'pending') {
    warnings.push('Pago pendiente próximo a vencer')
  }

  // Check attendance
  if (athlete.attendancePercentage < rules.minAttendancePercentage) {
    blockedReasons.push(
      `Asistencia insuficiente: ${athlete.attendancePercentage}% (mínimo requerido: ${rules.minAttendancePercentage}%)`
    )
  }

  // Check documents
  if (rules.blockOnExpiredDocuments && athlete.documentsExpired) {
    blockedReasons.push('Documentación vencida (ficha médica u otros)')
  }

  return {
    isEligible: blockedReasons.length === 0,
    blockedReasons,
    warnings,
  }
}

export function getEligibilityColor(result: EligibilityResult): 'green' | 'yellow' | 'red' {
  if (!result.isEligible) return 'red'
  if (result.warnings.length > 0) return 'yellow'
  return 'green'
}

export function getEligibilityLabel(color: 'green' | 'yellow' | 'red'): string {
  switch (color) {
    case 'green':
      return 'Apto'
    case 'yellow':
      return 'Observación'
    case 'red':
      return 'Bloqueado'
  }
}
