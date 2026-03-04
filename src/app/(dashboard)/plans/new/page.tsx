import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlanForm } from "@/components/plans/PlanForm"
import { ChevronLeft } from "lucide-react"

export default function NewPlanPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/plans">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Plan</h1>
          <p className="text-muted-foreground text-sm">Configura el plan de membresía</p>
        </div>
      </div>
      <PlanForm />
    </div>
  )
}
