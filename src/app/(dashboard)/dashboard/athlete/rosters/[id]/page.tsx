export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { getMyRosterById } from "@/lib/actions/athlete-enrollment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Trophy, 
  Shirt, 
  Shield, 
  CheckCircle2, 
  XCircle,
  Clock
} from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  tournament: "Torneo", 
  league: "Liga", 
  friendly: "Amistoso", 
  championship: "Campeonato",
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  confirmed: { 
    label: "Confirmado", 
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  pending: { 
    label: "Pendiente",  
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <Clock className="w-4 h-4" />
  },
  declined: { 
    label: "No disponible", 
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="w-4 h-4" />
  },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AthleteRosterDetailPage({ params }: PageProps) {
  const { id } = await params

  let rosterData
  try {
    rosterData = await getMyRosterById(id)
  } catch {
    notFound()
  }

  const roster = rosterData.rosters!
  const statusM = STATUS_META[rosterData.status] ?? STATUS_META.pending
  const isToday = roster.match_date === new Date().toISOString().split('T')[0]
  const match = roster.matches?.[0]

  // Parse score from notes if available
  const score = (() => { 
    try { 
      return JSON.parse(roster.notes ?? '') 
    } catch { 
      return null 
    } 
  })()

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/athlete/rosters">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Mi Citación</h1>
          <p className="text-muted-foreground text-sm">Detalles de tu convocatoria</p>
        </div>
      </div>

      {/* Match Info Card */}
      <Card className={`${isToday ? "ring-2 ring-primary/50" : ""}`}>
        {isToday && <div className="h-1 bg-gradient-to-r from-primary to-blue-500" />}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">{roster.name}</CardTitle>
            {isToday && <Badge variant="default">Hoy</Badge>}
          </div>
          {roster.competitions && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              {TYPE_LABELS[roster.competitions.type] ?? roster.competitions.type} · {roster.competitions.name}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date & Venue */}
          <div className="grid gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {new Date(roster.match_date + "T12:00:00").toLocaleDateString("es-CL", { 
                    weekday: "long", 
                    day: "numeric", 
                    month: "long" 
                  })}
                </p>
                <p className="text-sm text-muted-foreground">Fecha del partido</p>
              </div>
            </div>

            {roster.opponent && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">vs. {roster.opponent}</p>
                  <p className="text-sm text-muted-foreground">Rival</p>
                </div>
              </div>
            )}

            {roster.venue && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">{roster.venue}</p>
                  <p className="text-sm text-muted-foreground">Lugar</p>
                </div>
              </div>
            )}
          </div>

          {/* Score if available */}
          {(score || match) && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Resultado</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">Local</p>
                  <p className="text-2xl font-bold">{score?.home ?? match?.home_score ?? "—"}</p>
                </div>
                <div className="text-muted-foreground">vs</div>
                <div className="flex-1 text-center">
                  <p className="text-sm text-muted-foreground">Visita</p>
                  <p className="text-2xl font-bold">{score?.away ?? match?.away_score ?? "—"}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Assignment Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shirt className="w-5 h-5" /> Tu Asignación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {/* Jersey Number */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex flex-col items-center justify-center text-white shrink-0">
              <Shirt className="w-6 h-6 opacity-80" />
              <span className="text-3xl font-bold">{rosterData.number ?? "—"}</span>
            </div>

            <div className="flex-1 space-y-1">
              {rosterData.number && (
                <p className="text-sm text-muted-foreground">Número asignado: <span className="font-medium text-foreground">{rosterData.number}</span></p>
              )}
              {rosterData.position && (
                <p className="text-sm text-muted-foreground">Posición: <span className="font-medium text-foreground">{rosterData.position}</span></p>
              )}
              {rosterData.is_captain && (
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                  © Capitán
                </Badge>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Estado de tu citación</p>
            <Badge className={`text-sm px-3 py-1 ${statusM.color} flex items-center gap-2 w-fit`}>
              {statusM.icon}
              {statusM.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            Presentate 30 minutos antes del partido. Trae tu equipamiento completo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
