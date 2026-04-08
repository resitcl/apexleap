export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { createAdminClient } from "@/lib/supabase/admin"
import { getClubId } from "@/lib/actions/club-context"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportConfig } from "@/lib/sport-fields"
import { AthleteProfileForm } from "@/components/athlete/AthleteProfileForm"
import { Badge } from "@/components/ui/badge"
import { UserCog } from "lucide-react"

export default async function AthleteProfilePage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const subStatus = await getMySubscriptionStatus().catch(() => null)
  if (!subStatus?.hasAthleteProfile || !subStatus.athlete) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tu perfil de atleta aún no ha sido vinculado.</p>
      </div>
    )
  }

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const [athleteRes, settings] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, name, phone, birth_date, emergency_contact, emergency_phone, technical_meta")
      .eq("club_id", clubId)
      .eq("id", subStatus.athlete.id)
      .single(),
    getClubSettings().catch(() => null),
  ])

  if (!athleteRes.data) redirect("/dashboard/athlete")

  const athlete = athleteRes.data as {
    id: string
    name: string
    phone: string | null
    birth_date: string | null
    emergency_contact: string | null
    emergency_phone: string | null
    technical_meta: Record<string, unknown> | null
  }

  const sportType = (settings as { sport_type?: string | null } | null)?.sport_type ?? null
  const sportConfig = getSportConfig(sportType)

  return (
    <div className="space-y-8 pb-12 pt-1">

      <AthleteProfileForm athlete={athlete} sportConfig={sportConfig} sportType={sportType} />
    </div>
  )
}
