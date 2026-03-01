'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const injurySchema = z.object({
  athlete_id: z.string().uuid(),
  diagnosis: z.string().min(2),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  body_part: z.string().optional().nullable(),
  start_date: z.string(),
  estimated_recovery: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type InjuryInput = z.infer<typeof injurySchema>

async function getClubId() {
  const { userId } = await auth()
  if (!userId) throw new Error('No autorizado')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  if (error || !data) throw new Error('Club no encontrado')
  return data.club_id as string
}

export async function createInjury(input: InjuryInput) {
  const clubId = await getClubId()
  const parsed = injurySchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('injuries')
    .insert({ ...parsed, club_id: clubId })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Update athlete health_status
  await supabase
    .from('athletes')
    .update({ health_status: 'injured', updated_at: new Date().toISOString() })
    .eq('id', parsed.athlete_id)
    .eq('club_id', clubId)

  revalidatePath(`/dashboard/athletes/${parsed.athlete_id}`)
  return data
}

export async function resolveInjury(injuryId: string, athleteId: string) {
  const clubId = await getClubId()
  const supabase = await createClient()

  const { error } = await supabase
    .from('injuries')
    .update({ actual_recovery: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
    .eq('id', injuryId)
    .eq('club_id', clubId)

  if (error) throw new Error(error.message)

  // Check if there are still active injuries
  const { data: activeInjuries } = await supabase
    .from('injuries')
    .select('id')
    .eq('athlete_id', athleteId)
    .eq('club_id', clubId)
    .is('actual_recovery', null)

  if (!activeInjuries?.length) {
    await supabase
      .from('athletes')
      .update({ health_status: 'healthy', updated_at: new Date().toISOString() })
      .eq('id', athleteId)
      .eq('club_id', clubId)
  }

  revalidatePath(`/dashboard/athletes/${athleteId}`)
}
