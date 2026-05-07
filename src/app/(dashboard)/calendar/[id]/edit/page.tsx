import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { getClubId } from "@/lib/actions/club-context"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { ScheduleForm } from "@/components/calendar/ScheduleForm"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditSchedulePage({ params }: PageProps) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  const supabase = await createClient()
  let clubId: string
  try {
    clubId = await getClubId()
  } catch {
    notFound()
  }

  const { data: schedule, error } = await supabase
    .from("schedules").select("*").eq("id", id).eq("club_id", clubId).single()
  if (error || !schedule) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/calendar/${id}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Sesión</h1>
          <p className="text-muted-foreground text-sm">{schedule.name}</p>
        </div>
      </div>
      <ScheduleForm
        scheduleId={id}
        defaultValues={{
          name: schedule.name,
          description: schedule.description ?? '',
          day_of_week: schedule.day_of_week as number[],
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          start_date: schedule.start_date,
          end_date: schedule.end_date ?? '',
          capacity: schedule.capacity,
          access_rule: schedule.access_rule as 'open' | 'subscription' | 'profile',
          is_active: schedule.is_active,
        }}
      />
    </div>
  )
}
