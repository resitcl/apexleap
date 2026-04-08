'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar, CreditCard, ClipboardList, QrCode, BarChart3,
  FileText, ArrowRight, ArrowLeft, CheckCircle, Sparkles,
  Loader2, Home, Swords, Trophy,
} from 'lucide-react'
import { markTourCompleted } from '@/lib/actions/athlete-enrollment'
import type { OnboardingData } from '@/lib/athlete-enrollment-shared'

interface Props {
  data: OnboardingData
  isTeamSport: boolean
}

interface ModuleInfo {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  features: string[]
  teamOnly?: boolean
}

const MODULES: ModuleInfo[] = [
  {
    id: 'dashboard',
    title: 'Tu Panel Principal',
    description: 'Tu centro de control personal donde puedes ver tu estado actual, próximas sesiones y alertas importantes.',
    icon: <Home className="w-8 h-8" />,
    color: 'from-blue-500 to-indigo-600',
    features: [
      'Semáforo de disponibilidad (🟢 Apto, 🟡 Observación, 🔴 Bloqueado)',
      'Resumen de tu membresía y pagos',
      'Próximas clases y eventos',
      'Alertas de documentos por vencer',
    ],
  },
  {
    id: 'calendar',
    title: 'Calendario y Horarios',
    description: 'Consulta los horarios de clases, entrenamientos y eventos especiales de tu club.',
    icon: <Calendar className="w-8 h-8" />,
    color: 'from-green-500 to-emerald-600',
    features: [
      'Vista de calendario mensual y semanal',
      'Detalles de cada sesión',
      'Información de instructores',
      'Capacidad disponible',
    ],
  },
  {
    id: 'checkin',
    title: 'Check-in QR',
    description: 'Marca tu asistencia escaneando el código QR al llegar al club.',
    icon: <QrCode className="w-8 h-8" />,
    color: 'from-purple-500 to-violet-600',
    features: [
      'Escanea el QR de la sala',
      'Validación automática de tu membresía',
      'Historial de asistencias',
      'Geolocalización de seguridad',
    ],
  },
  {
    id: 'payments',
    title: 'Pagos y Membresía',
    description: 'Gestiona tu suscripción, consulta pagos pendientes y revisa tu historial.',
    icon: <CreditCard className="w-8 h-8" />,
    color: 'from-amber-500 to-orange-600',
    features: [
      'Estado de tu membresía',
      'Pagos pendientes y vencidos',
      'Historial de transacciones',
      'Renovación automática',
    ],
  },
  {
    id: 'documents',
    title: 'Mis Documentos',
    description: 'Sube y gestiona documentos requeridos como certificados médicos o fichas.',
    icon: <FileText className="w-8 h-8" />,
    color: 'from-cyan-500 to-teal-600',
    features: [
      'Subir documentos requeridos',
      'Ver estado de aprobación',
      'Alertas de vencimiento',
      'Historial de documentos',
    ],
  },
  {
    id: 'rosters',
    title: 'Mis Citaciones',
    description: 'Revisa las nóminas en las que has sido convocado para partidos y competencias.',
    icon: <ClipboardList className="w-8 h-8" />,
    color: 'from-indigo-500 to-purple-600',
    features: [
      'Próximas convocatorias',
      'Tu número y posición asignada',
      'Información del rival',
      'Historial de citaciones',
    ],
    teamOnly: true,
  },
  {
    id: 'matches',
    title: 'Mis Partidos',
    description: 'Consulta los partidos en los que has participado y tus estadísticas.',
    icon: <Swords className="w-8 h-8" />,
    color: 'from-red-500 to-rose-600',
    features: [
      'Próximos partidos',
      'Resultados anteriores',
      'Tu récord personal',
      'Estadísticas de equipo',
    ],
    teamOnly: true,
  },
  {
    id: 'stats',
    title: 'Mi Rendimiento',
    description: 'Visualiza tu progreso, estadísticas y evolución en el tiempo.',
    icon: <BarChart3 className="w-8 h-8" />,
    color: 'from-pink-500 to-rose-600',
    features: [
      'Estadísticas personales',
      'Gráficos de progreso',
      'Comparativa con promedios',
      'Logros y metas',
    ],
  },
]

export function PlatformTourWizard({ data, isTeamSport }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const clubName = data.club.name
  const primaryColor = data.club.primary_color || '#6366f1'

  // Filter modules based on sport type
  const modules = MODULES.filter(m => !m.teamOnly || isTeamSport)
  const currentModule = modules[currentIndex]
  const isLast = currentIndex === modules.length - 1
  const isFirst = currentIndex === 0

  async function handleFinish() {
    setLoading(true)
    try {
      await markTourCompleted()
      startTransition(() => {
        router.refresh()
      })
    } catch {
      // Silent fail, just refresh
      startTransition(() => {
        router.refresh()
      })
    }
  }

  function renderClubHeader() {
    return (
      <div className="flex items-center justify-center gap-3 mb-4">
        {data.club.logo_url ? (
          <Image src={data.club.logo_url} alt={clubName} width={36} height={36} className="rounded-lg object-contain" />
        ) : (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {clubName.charAt(0)}
          </div>
        )}
        <span className="font-semibold">{clubName}</span>
      </div>
    )
  }

  function renderProgressDots() {
    return (
      <div className="flex items-center justify-center gap-1.5 mb-6">
        {modules.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex
                ? 'w-6 bg-primary'
                : i < currentIndex
                  ? 'bg-green-500'
                  : 'bg-muted'
            }`}
          />
        ))}
      </div>
    )
  }

  function renderIntroScreen() {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        {renderClubHeader()}
        
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
          <Trophy className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">¡Perfil completado!</h2>
          <p className="text-muted-foreground">
            Ahora te mostraremos las funcionalidades de tu portal de atleta
          </p>
        </div>

        <Card className="text-left">
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm font-medium mb-4">En este tour conocerás:</p>
            <div className="space-y-2">
              {modules.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-3 text-sm">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-white shrink-0`}>
                    {m.icon}
                  </div>
                  <span>{m.title}</span>
                </div>
              ))}
              {modules.length > 4 && (
                <p className="text-xs text-muted-foreground pl-11">
                  Y {modules.length - 4} módulos más...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full text-white"
          style={{ backgroundColor: primaryColor }}
          onClick={() => setCurrentIndex(0)}
        >
          Comenzar Tour <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <button
          onClick={handleFinish}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Omitir tour
        </button>
      </div>
    )
  }

  function renderModuleScreen() {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {renderClubHeader()}
        {renderProgressDots()}

        <div className="text-center space-y-4">
          <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br ${currentModule.color} text-white shadow-lg`}>
            {currentModule.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{currentModule.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentModule.description}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground mb-4">Funcionalidades:</p>
            <ul className="space-y-3">
              {currentModule.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {!isFirst && (
            <Button variant="outline" onClick={() => setCurrentIndex(i => i - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
            </Button>
          )}
          {isLast ? (
            <Button
              className="flex-1 text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={handleFinish}
              disabled={loading || isPending}
            >
              {loading || isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> ¡Comenzar!
                </>
              )}
            </Button>
          ) : (
            <Button
              className={`${isFirst ? 'w-full' : 'flex-1'} text-white`}
              style={{ backgroundColor: primaryColor }}
              onClick={() => setCurrentIndex(i => i + 1)}
            >
              Siguiente <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {!isLast && (
          <button
            onClick={handleFinish}
            className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Omitir tour
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto px-4 py-8">
        {currentIndex === -1 ? renderIntroScreen() : renderModuleScreen()}
      </div>
    </div>
  )
}
