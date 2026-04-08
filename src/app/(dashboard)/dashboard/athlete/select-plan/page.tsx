export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import {
  getVisiblePlans,
  getMySubscriptionStatus,
  getAthleteFinancialAccessState,
} from "@/lib/actions/athlete-enrollment"
import { PlanSelectionClient } from "@/components/athlete/PlanSelectionClient"
import { AthleteSectionHeader } from "@/components/athlete/AthleteSectionHeader"
import { BookOpen } from "lucide-react"

export default async function SelectPlanPage() {
  // Si ya tiene suscripción activa y no está en bloqueo por mora, volver al portal
  try {
    const status = await getMySubscriptionStatus()
    const financial = await getAthleteFinancialAccessState()
    if (status.hasActiveSubscription && !financial.delinquency.hardBlocked) {
      redirect("/dashboard/athlete")
    }
  } catch { /* continue — nuevo usuario sin perfil atleta */ }

  let plans: Awaited<ReturnType<typeof getVisiblePlans>> = []
  try {
    plans = await getVisiblePlans()
  } catch { /* silent */ }

  return (
    <div className="space-y-8 pb-12 pt-1">
      <AthleteSectionHeader
        centered
        icon={BookOpen}
        title="Elige tu plan"
        description="Selecciona un plan para acceder a los entrenamientos, horarios y más funcionalidades del club."
      />

      {plans.length === 0 ? (
        <div className="rounded-2xl border-dashed border-white/[0.05] bg-muted/5 py-20 text-center">
          <p className="text-muted-foreground font-medium">
            No hay planes disponibles en este momento. Contacta al administrador del club.
          </p>
        </div>
      ) : (
        <PlanSelectionClient plans={plans} />
      )}
    </div>
  )
}
