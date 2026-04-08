import Link from "next/link"
import { requireClubStaffPage } from "@/lib/actions/club-context"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { NewPaymentForm } from "@/components/payments/NewPaymentForm"
import { getAthletes } from "@/lib/actions/athletes"
import { getPlans } from "@/lib/actions/plans"

export default async function NewPaymentPage() {
  await requireClubStaffPage()
  const [athletesResult, plans] = await Promise.all([
    getAthletes({ limit: 200 }),
    getPlans(),
  ])

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Registrar Pago</h1>
          <p className="text-muted-foreground text-sm">Carga un pago manualmente</p>
        </div>
      </div>

      <NewPaymentForm
        athletes={athletesResult.athletes.map((a) => ({ id: a.id, name: a.name }))}
        plans={plans.map((p) => ({ id: p.id, name: p.name, price: Number(p.price) }))}
      />
    </div>
  )
}
