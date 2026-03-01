'use server'

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

async function getClubId() {
  const { userId } = await auth()
  if (!userId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  return data?.club_id as string | null
}

export async function getSidebarAlerts() {
  const clubId = await getClubId()
  if (!clubId) return { overduePayments: 0, expiringSoonDocs: 0, clubName: null }

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: clubData } = await supabase
    .from('clubs').select('name').eq('id', clubId).single()

  const [paymentsRes, docsRes] = await Promise.all([
    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('status', 'overdue'),

    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .gt('expiry_date', today)
      .lte('expiry_date', in30Days),
  ])

  return {
    overduePayments: paymentsRes.count ?? 0,
    expiringSoonDocs: docsRes.count ?? 0,
    clubName: clubData?.name ?? null,
  }
}
