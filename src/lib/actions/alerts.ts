'use server'

import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getClubId() {
  const { userId } = await auth()
  if (!userId) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_clubs').select('club_id').eq('user_id', userId).eq('is_active', true).single()
  return data?.club_id as string | null
}

export async function getSidebarAlerts() {
  const clubId = await getClubId()
  if (!clubId) return { overduePayments: 0, expiringSoonDocs: 0, expiringSubscriptions: 0, clubName: null, primaryColor: null, secondaryColor: null, logoUrl: null }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const in7Days  = new Date(Date.now() +  7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: clubData } = await supabase
    .from('clubs').select('name, primary_color, secondary_color, logo_url').eq('id', clubId).single()

  const [paymentsRes, docsRes, subsRes] = await Promise.all([
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

    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('status', 'active')
      .gte('end_date', today)
      .lte('end_date', in7Days),
  ])

  return {
    overduePayments:       paymentsRes.count ?? 0,
    expiringSoonDocs:      docsRes.count     ?? 0,
    expiringSubscriptions: subsRes.count     ?? 0,
    clubName:         clubData?.name          ?? null,
    primaryColor:     clubData?.primary_color ?? null,
    secondaryColor:   clubData?.secondary_color ?? null,
    logoUrl:          clubData?.logo_url       ?? null,
  }
}
