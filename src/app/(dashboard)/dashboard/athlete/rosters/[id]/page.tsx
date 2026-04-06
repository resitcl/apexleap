export const dynamic = "force-dynamic"

import type { ReactNode } from "react"
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
  Clock,
  ClipboardList,
} from "lucide-react"

const TYPE_LABELS: Record<string, string> = {
  tournament: "Torneo", 
  league: "Liga", 
  friendly: "Amistoso", 
  championship: "Campeonato",
}

const STATUS_META: Record<string, { label: string; color: string; icon: ReactNode }> = {
  confirmed: {
    label: "Confirmado",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  pending: {
    label: "Pendiente",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: <Clock className="w-4 h-4" />,
  },
  declined: {
    label: "No disponible",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <XCircle className="w-4 h-4" />,
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

  type RosterInfo = {
    id: string
    name: string
    match_date: string
    opponent: string | null
    venue: string | null
    notes: string | null
    competitions: { id: string; name: string; type: string; status: string } | null
    matches: { id: string; home_score: number | null; away_score: number | null; status: string; is_home: boolean }[] | null
  }
  
  // Supabase may return nested relation as object or array depending on query
  const rostersData = rosterData.rosters as unknown
  const roster: RosterInfo | null = Array.isArray(rostersData) 
    ? (rostersData[0] as RosterInfo | undefined) ?? null 
    : (rostersData as RosterInfo | null)
  
  if (!roster) notFound()
  
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
    <div className="space-y-8 pb-12 pt-1 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/athlete/rosters">
          <Button variant="ghost" size="icon" className="shrink-0 mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none text-foreground flex items-center gap-3 flex-wrap">
            <ClipboardList className="w-10 h-10 text-primary" /> Mi citación
          </h1>
          <p className="text-sm md:text-base text-muted-foreground/80 mt-3 max-w-xl font-medium">
            Detalles de tu convocatoria y asignación para el encuentro.
          </p>
        </div>
      </div>

      {/* Match Info Card */}
      <Card className={`rounded-2xl border border-white/[0.04] bg-card shadow-sm overflow-hidden ${isToday ? "ring-2 ring-primary/40" : ""}`}>
        {isToday && <div className="h-1 bg-gradient-to-r from-primary to-primary/60" />}
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
                <div className="w-10 h-10 rounded-lg bg-muted/40 border border-white/[0.04] flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">vs. {roster.opponent}</p>
                  <p className="text-sm text-muted-foreground">Rival</p>
                </div>
              </div>
            )}

            {roster.venue && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
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
      <Card className="rounded-2xl border border-white/[0.04] bg-card shadow-sm">
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
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold">
                  © Capitán
                </Badge>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Estado de tu citación</p>
            <Badge variant="outline" className={`text-sm px-3 py-1.5 ${statusM.color} flex items-center gap-2 w-fit border font-semibold`}>
              {statusM.icon}
              {statusM.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="rounded-2xl border border-white/[0.04] bg-muted/20 shadow-sm">
        <CardContent className="py-5">
          <p className="text-sm text-muted-foreground text-center">
            Presentate 30 minutos antes del partido. Trae tu equipamiento completo.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
