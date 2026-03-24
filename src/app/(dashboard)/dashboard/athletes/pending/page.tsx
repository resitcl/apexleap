export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import Link from "next/link"
import { checkUserHasClub } from "@/lib/actions/onboarding"
import { getUserRole } from "@/lib/actions/club-context"
import { getPendingEnrollments } from "@/lib/actions/athlete-enrollment"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportConfig } from "@/lib/sport-fields"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Clock, User, Phone, Calendar, FileText } from "lucide-react"
import { EnrollmentReviewActions } from "./EnrollmentReviewActions"

export default async function PendingEnrollmentsPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect("/onboarding")

  const role = await getUserRole().catch(() => 'athlete' as const)
  if (role === 'athlete') redirect("/dashboard/athlete")

  let pending: Awaited<ReturnType<typeof getPendingEnrollments>> = []
  try {
    pending = await getPendingEnrollments()
  } catch (e) {
    console.error("Error fetching pending enrollments:", e)
  }

  let sportType: string | null = null
  try {
    const settings = await getClubSettings()
    sportType = (settings as { sport_type?: string | null })?.sport_type ?? null
  } catch { /* silent */ }
  
  const sportConfig = getSportConfig(sportType)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/athletes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Solicitudes Pendientes
          </h1>
          <p className="text-muted-foreground text-sm">
            Revisa y aprueba las solicitudes de inscripción de nuevos atletas
          </p>
        </div>
      </div>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-muted mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No hay solicitudes pendientes</p>
            <p className="text-sm text-muted-foreground mt-1">
              Las nuevas solicitudes aparecerán aquí cuando los atletas se registren
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pending.map((athlete) => (
            <Card key={athlete.id} className="overflow-hidden">
              <CardHeader className="pb-3 bg-amber-50/50 border-b border-amber-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-amber-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{athlete.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{athlete.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <Clock className="w-3 h-3 mr-1" /> Pendiente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                  {athlete.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{athlete.phone}</span>
                    </div>
                  )}
                  {athlete.birth_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {new Date(athlete.birth_date + "T12:00:00").toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  )}
                  {athlete.enrollment_requested_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        Solicitado {new Date(athlete.enrollment_requested_at).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sport-specific info */}
                {sportConfig && athlete.technical_meta && Object.keys(athlete.technical_meta as object).length > 0 && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {sportConfig.sectionTitle}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sportConfig.fields.map((field) => {
                        const val = (athlete.technical_meta as Record<string, unknown>)?.[field.key]
                        if (!val) return null
                        let displayVal = String(val)
                        if (field.type === 'select' && field.options) {
                          displayVal = field.options.find(o => o.value === val)?.label ?? String(val)
                        }
                        if (field.type === 'multiselect' && Array.isArray(val)) {
                          displayVal = (val as string[]).map(v => 
                            field.options?.find(o => o.value === v)?.label ?? v
                          ).join(', ')
                        }
                        return (
                          <Badge key={field.key} variant="secondary" className="text-xs">
                            {field.label}: {displayVal}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {athlete.notes && (
                  <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-blue-700 flex items-center gap-1 mb-1">
                      <FileText className="w-3 h-3" /> Notas del aspirante
                    </p>
                    <p className="text-sm text-blue-800">{athlete.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <EnrollmentReviewActions athleteId={athlete.id} athleteName={athlete.name} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
