export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type HealthStatus = 'healthy' | 'injured' | 'observation'

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'failed' | 'cancelled'

export type AthleteStatus = 'active' | 'inactive' | 'suspended'

export type RuleType = 'financial' | 'attendance' | 'discipline' | 'documentation'

export interface Database {
  public: {
    Tables: {
      clubs: {
        Row: {
          id: string
          name: string
          slug: string
          sport_type: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sport_type?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sport_type?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      athletes: {
        Row: {
          id: string
          club_id: string
          user_id: string | null
          name: string
          email: string | null
          phone: string | null
          document_number: string | null
          birth_date: string | null
          photo_url: string | null
          status: AthleteStatus
          health_status: HealthStatus
          performance_meta: Json
          technical_meta: Json
          emergency_contact: string | null
          emergency_phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          club_id: string
          user_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          document_number?: string | null
          birth_date?: string | null
          photo_url?: string | null
          status?: AthleteStatus
          health_status?: HealthStatus
          performance_meta?: Json
          technical_meta?: Json
          emergency_contact?: string | null
          emergency_phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          user_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          document_number?: string | null
          birth_date?: string | null
          photo_url?: string | null
          status?: AthleteStatus
          health_status?: HealthStatus
          performance_meta?: Json
          technical_meta?: Json
          emergency_contact?: string | null
          emergency_phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          club_id: string
          name: string
          description: string | null
          price: number
          billing_cycle: string
          session_limit: number | null
          multi_sede: boolean
          content_level: string | null
          grace_period_days: number
          is_visible: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          club_id: string
          name: string
          description?: string | null
          price: number
          billing_cycle?: string
          session_limit?: number | null
          multi_sede?: boolean
          content_level?: string | null
          grace_period_days?: number
          is_visible?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          name?: string
          description?: string | null
          price?: number
          billing_cycle?: string
          session_limit?: number | null
          multi_sede?: boolean
          content_level?: string | null
          grace_period_days?: number
          is_visible?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          club_id: string
          athlete_id: string
          plan_id: string | null
          concept: string
          amount: number
          status: PaymentStatus
          due_date: string
          paid_at: string | null
          payment_method: string | null
          transaction_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          athlete_id: string
          plan_id?: string | null
          concept: string
          amount: number
          status?: PaymentStatus
          due_date: string
          paid_at?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          athlete_id?: string
          plan_id?: string | null
          concept?: string
          amount?: number
          status?: PaymentStatus
          due_date?: string
          paid_at?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      rules: {
        Row: {
          id: string
          club_id: string
          name: string
          type: RuleType
          config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          club_id: string
          name: string
          type: RuleType
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          name?: string
          type?: RuleType
          config?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      health_status: HealthStatus
      payment_status: PaymentStatus
      athlete_status: AthleteStatus
      rule_type: RuleType
    }
  }
}
