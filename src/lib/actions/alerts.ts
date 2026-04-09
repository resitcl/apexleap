'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { useBrandPrimaryFromClubSettings } from '@/lib/club-branding'
import { getClubId, getClubMembershipRole } from '@/lib/actions/club-context'

export async function getSidebarAlerts() {
  let clubId: string
  try { clubId = await getClubId() } catch {
    return {
      overduePayments: 0,
      expiringSoonDocs: 0,
      expiringSubscriptions: 0,
      pendingEnrollments: 0,
      pendingEnrollmentPaid: 0,
      paidToday: 0,
      clubName: null,
      primaryColor: null,
      secondaryColor: null,
      logoUrl: null,
      useBrandPrimaryForUi: true,
    }
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const dayStartIso = new Date(`${today}T00:00:00.000Z`).toISOString()
  const in7Days  = new Date(Date.now() +  7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: clubData } = await supabase
    .from('clubs')
    .select('name, primary_color, secondary_color, logo_url, settings')
    .eq('id', clubId)
    .single()

  const emptyStaffCounts = {
    overduePayments: 0,
    expiringSoonDocs: 0,
    expiringSubscriptions: 0,
    pendingEnrollments: 0,
    pendingEnrollmentPaid: 0,
    paidToday: 0,
  }

  try {
    const membership = await getClubMembershipRole()
    if (membership === 'athlete') {
      return {
        ...emptyStaffCounts,
        clubName:         clubData?.name          ?? null,
        primaryColor:     clubData?.primary_color ?? null,
        secondaryColor:   clubData?.secondary_color ?? null,
        logoUrl:          clubData?.logo_url       ?? null,
        useBrandPrimaryForUi: useBrandPrimaryFromClubSettings(clubData?.settings),
      }
    }
  } catch {
    /* sin rol → seguir con consultas de staff */
  }

  const [paymentsRes, docsRes, subsRes, enrollmentsRes, paidTodayRes, pendingEnrollmentPaidRes] = await Promise.all([
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

    supabase
      .from('athletes')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('enrollment_status', 'pending_approval'),

    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('status', 'paid')
      .gte('paid_at', dayStartIso),

    // Inscripciones ya pagadas de atletas aún pendientes de aprobación.
    supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('status', 'paid')
      .ilike('concept', 'Inscripción%')
      .in(
        'athlete_id',
        (
          await supabase
            .from('athletes')
            .select('id')
            .eq('club_id', clubId)
            .eq('enrollment_status', 'pending_approval')
        ).data?.map((a) => a.id) ?? ['00000000-0000-0000-0000-000000000000']
      ),
  ])

  return {
    overduePayments:       paymentsRes.count ?? 0,
    expiringSoonDocs:      docsRes.count     ?? 0,
    expiringSubscriptions: subsRes.count     ?? 0,
    pendingEnrollments:    enrollmentsRes.count ?? 0,
    pendingEnrollmentPaid: pendingEnrollmentPaidRes.count ?? 0,
    paidToday:             paidTodayRes.count ?? 0,
    clubName:         clubData?.name          ?? null,
    primaryColor:     clubData?.primary_color ?? null,
    secondaryColor:   clubData?.secondary_color ?? null,
    logoUrl:          clubData?.logo_url       ?? null,
    useBrandPrimaryForUi: useBrandPrimaryFromClubSettings(clubData?.settings),
  }
}
