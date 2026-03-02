export const dynamic = "force-dynamic"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AthleteForm } from "@/components/athletes/AthleteForm"
import { ChevronLeft } from "lucide-react"

export default function NewAthletePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/athletes">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Alumno</h1>
          <p className="text-muted-foreground text-sm">Completa los datos del nuevo integrante</p>
        </div>
      </div>

      <AthleteForm />
    </div>
  )
}
