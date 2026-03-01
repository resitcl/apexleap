export * from './database.types'

export interface ClubContext {
  clubId: string
  clubName: string
  role: 'admin' | 'coach' | 'athlete'
}

export interface Athlete {
  id: string
  clubId: string
  name: string
  email: string | null
  phone: string | null
  status: 'active' | 'inactive' | 'suspended'
  healthStatus: 'healthy' | 'injured' | 'observation'
  photoUrl: string | null
}

export interface Plan {
  id: string
  clubId: string
  name: string
  description: string | null
  price: number
  billingCycle: 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  sessionLimit: number | null
  multiSede: boolean
  isActive: boolean
}

export interface Payment {
  id: string
  clubId: string
  athleteId: string
  concept: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'failed' | 'cancelled'
  dueDate: string
  paidAt: string | null
}

export interface EligibilityResult {
  isEligible: boolean
  blockedReasons: string[]
  warnings: string[]
}
