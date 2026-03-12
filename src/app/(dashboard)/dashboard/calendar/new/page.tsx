export const dynamic = "force-dynamic"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { ScheduleForm } from "@/components/calendar/ScheduleForm"
import { getVenues } from "@/lib/actions/venues"

export default async function NewSchedulePage() {
  const venues = await getVenues().catch(() => [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/calendar">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nueva Sesión</h1>
          <p className="text-muted-foreground text-sm">Configura una sesión recurrente</p>
        </div>
      </div>
      <ScheduleForm
        venues={venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          address: venue.address ?? null,
          city: venue.city ?? null,
        }))}
      />
    </div>
  )
}
