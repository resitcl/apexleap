import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Pencil, Clock, Users, MapPin } from "lucide-react"
import { DeleteScheduleButton } from "@/components/calendar/DeleteScheduleButton"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ScheduleDetailPage({ params }: PageProps) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  const supabase = await createClient()

  const { data: userClub } = await supabase
    .from("user_clubs")
    .select("club_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single()

  if (!userClub) notFound()

  const { data: schedule, error } = await supabase
    .from("schedules")
    .select("*, venues(id, name)")
    .eq("id", id)
    .eq("club_id", userClub.club_id)
    .single()

  if (error || !schedule) notFound()

  const days = (schedule.day_of_week as number[]).map((d) => DAYS[d])
  const venue = schedule.venues as { id: string; name: string } | null

  const durationMin =
    (() => {
      const [sh, sm] = schedule.start_time.split(":").map(Number)
      const [eh, em] = schedule.end_time.split(":").map(Number)
      return (eh * 60 + em) - (sh * 60 + sm)
    })()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/calendar">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Calendario
          </Button>
        </Link>
        <div className="flex-1" />
        <Link href={`/dashboard/calendar/${id}/edit`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="w-4 h-4" />
            Editar
          </Button>
        </Link>
        <DeleteScheduleButton scheduleId={id} />
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{schedule.name}</h1>
              {schedule.description && (
                <p className="text-muted-foreground mt-1">{schedule.description}</p>
              )}
            </div>
            <Badge variant={schedule.is_active ? "default" : "secondary"}>
              {schedule.is_active ? "Activa" : "Inactiva"}
            </Badge>
          </div>

          <div className="flex gap-2 flex-wrap">
            {days.map((d) => (
              <Badge key={d} variant="outline" className="font-medium">{d}</Badge>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{schedule.start_time.slice(0,5)} – {schedule.end_time.slice(0,5)}</p>
                <p className="text-xs text-muted-foreground">{durationMin} min</p>
              </div>
            </div>
            {schedule.capacity && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">Cupo: {schedule.capacity}</p>
                  <p className="text-xs text-muted-foreground">máximo por sesión</p>
                </div>
              </div>
            )}
            {venue && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">{venue.name}</p>
                  <p className="text-xs text-muted-foreground">sede</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vigencia</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Desde</p>
            <p className="font-medium">{new Date(schedule.start_date).toLocaleDateString("es-CL")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Hasta</p>
            <p className="font-medium">
              {schedule.end_date
                ? new Date(schedule.end_date).toLocaleDateString("es-CL")
                : "Sin fecha límite"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Acceso</p>
            <p className="font-medium capitalize">
              {schedule.access_rule === "open"
                ? "Abierta"
                : schedule.access_rule === "subscription"
                ? "Requiere suscripción"
                : "Requiere perfil"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
