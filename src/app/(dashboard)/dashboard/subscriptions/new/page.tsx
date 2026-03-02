export const dynamic = "force-dynamic"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { NewSubscriptionForm } from "@/components/subscriptions/NewSubscriptionForm"
import { getAthletes } from "@/lib/actions/athletes"
import { getPlans } from "@/lib/actions/plans"

interface Props { searchParams: Promise<{ athleteId?: string }> }

export default async function NewSubscriptionPage({ searchParams }: Props) {
  const { athleteId } = await searchParams
  const [athletesResult, plans] = await Promise.all([
    getAthletes({ limit: 200 }),
    getPlans(),
  ])

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/subscriptions">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Asignar Plan</h1>
          <p className="text-muted-foreground text-sm">Vincula un alumno a un plan de membresía</p>
        </div>
      </div>

      <NewSubscriptionForm
        athletes={athletesResult.athletes.map((a) => ({ id: a.id, name: a.name }))}
        defaultAthleteId={athleteId}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          billing_cycle: p.billing_cycle,
        }))}
      />
    </div>
  )
}
