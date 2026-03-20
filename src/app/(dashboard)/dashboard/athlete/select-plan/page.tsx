export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getVisiblePlans, getMySubscriptionStatus } from "@/lib/actions/athlete-enrollment"
import { PlanSelectionClient } from "@/components/athlete/PlanSelectionClient"

export default async function SelectPlanPage() {
  // If already subscribed, go to portal
  try {
    const status = await getMySubscriptionStatus()
    if (status.hasActiveSubscription) redirect("/dashboard/athlete")
  } catch { /* continue — new user without athlete profile yet */ }

  let plans: Awaited<ReturnType<typeof getVisiblePlans>> = []
  try {
    plans = await getVisiblePlans()
  } catch { /* silent */ }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Elige tu Plan</h1>
        <p className="text-muted-foreground">
          Selecciona un plan para acceder a los entrenamientos, horarios y más.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            No hay planes disponibles en este momento. Contacta al administrador del club.
          </p>
        </div>
      ) : (
        <PlanSelectionClient plans={plans} />
      )}
    </div>
  )
}
