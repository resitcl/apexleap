import Link from "next/link"
import { notFound } from "next/navigation"
import { getPlanById } from "@/lib/actions/plans"
import { PlanForm } from "@/components/plans/PlanForm"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPlanPage({ params }: PageProps) {
  const { id } = await params

  let plan
  try {
    plan = await getPlanById(id)
  } catch {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/plans/${id}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Plan</h1>
          <p className="text-muted-foreground text-sm">{plan.name}</p>
        </div>
      </div>

      <PlanForm
        planId={id}
        defaultValues={{
          name: plan.name,
          description: plan.description ?? '',
          price: Number(plan.price),
          enrollment_fee: Number(plan.enrollment_fee),
          billing_cycle: plan.billing_cycle as 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'single',
          session_limit: plan.session_limit,
          multi_sede: plan.multi_sede,
          content_level: plan.content_level ?? '',
          grace_period_days: plan.grace_period_days,
          is_visible: plan.is_visible,
          is_active: plan.is_active,
        }}
      />
    </div>
  )
}
