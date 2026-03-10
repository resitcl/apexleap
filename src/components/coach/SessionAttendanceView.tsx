'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, CheckCheck, X, Users, Clock, Loader2 } from 'lucide-react'
import { checkIn, markAttendanceInvalid } from '@/lib/actions/attendance'

interface Athlete {
  id: string
  name: string
  photo_url?: string | null
  health_status?: string | null
  semaforo: 'green' | 'yellow' | 'red'
}

interface Session {
  id: string
  name: string
  start_time: string
  end_time: string
  capacity?: number | null
}

interface AttendanceRecord {
  athlete_id: string
  is_valid: boolean
  checked_in_at: string
  id: string
}

interface Props {
  session: Session
  athletes: Athlete[]
  attendance: AttendanceRecord[]
  onRefresh?: () => void
}

export function SessionAttendanceView({ session, athletes, attendance, onRefresh }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [localAttendance, setLocalAttendance] = useState<Map<string, { id: string; isValid: boolean; doubleChecked: boolean }>>(
    new Map(attendance.map(a => [a.athlete_id, { id: a.id, isValid: a.is_valid, doubleChecked: false }]))
  )

  const checkedInIds = new Set(localAttendance.keys())
  const presentCount = checkedInIds.size
  const validCount = Array.from(localAttendance.values()).filter(a => a.isValid).length

  // Sort athletes: present first, then by semaforo
  const sortedAthletes = [...athletes].sort((a, b) => {
    const aPresent = checkedInIds.has(a.id) ? 0 : 1
    const bPresent = checkedInIds.has(b.id) ? 0 : 1
    if (aPresent !== bPresent) return aPresent - bPresent
    
    const semaforoOrder = { green: 0, yellow: 1, red: 2 }
    return semaforoOrder[a.semaforo] - semaforoOrder[b.semaforo]
  })

  async function handleQuickCheckIn(athleteId: string) {
    setLoading(athleteId)
    try {
      const result = await checkIn({ athleteId, scheduleId: session.id })
      setLocalAttendance(prev => {
        const next = new Map(prev)
        next.set(athleteId, { id: result.id, isValid: true, doubleChecked: false })
        return next
      })
      toast.success('Asistencia registrada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(null)
    }
  }

  async function handleDoubleCheck(athleteId: string) {
    const record = localAttendance.get(athleteId)
    if (!record) return

    setLocalAttendance(prev => {
      const next = new Map(prev)
      next.set(athleteId, { ...record, doubleChecked: true })
      return next
    })
    toast.success('Asistencia confirmada ✓✓')
  }

  async function handleInvalidate(athleteId: string) {
    const record = localAttendance.get(athleteId)
    if (!record) return

    setLoading(athleteId)
    try {
      await markAttendanceInvalid({ attendanceId: record.id })
      setLocalAttendance(prev => {
        const next = new Map(prev)
        next.set(athleteId, { ...record, isValid: false })
        return next
      })
      toast.success('Asistencia marcada como inválida')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  const getSemaforoColor = (semaforo: string) => {
    switch (semaforo) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-400'
      case 'red': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {session.name}
            <span className="text-sm font-normal text-muted-foreground">
              {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {presentCount}{session.capacity ? `/${session.capacity}` : ''}
            </Badge>
            {validCount > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                {validCount} válidos
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sortedAthletes.map(athlete => {
            const record = localAttendance.get(athlete.id)
            const isPresent = !!record
            const isValid = record?.isValid ?? false
            const isDoubleChecked = record?.doubleChecked ?? false
            const isLoading = loading === athlete.id
            const isBlocked = athlete.semaforo === 'red'

            return (
              <div
                key={athlete.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isPresent 
                    ? isValid 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                    : 'hover:bg-muted/50'
                }`}
              >
                {/* Semáforo indicator */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getSemaforoColor(athlete.semaforo)}`} />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isBlocked ? 'text-red-600' : ''}`}>
                    {athlete.name}
                  </p>
                  {isBlocked && (
                    <p className="text-xs text-red-500">
                      {athlete.health_status === 'injured' ? '🩹 Lesionado' : '🔒 Bloqueado'}
                    </p>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : isPresent ? (
                    <>
                      {/* Double check button */}
                      {isValid && !isDoubleChecked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                          onClick={() => handleDoubleCheck(athlete.id)}
                          title="Confirmar presencia (doble check)"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Status badge */}
                      {isDoubleChecked ? (
                        <Badge className="bg-green-600 text-white gap-1">
                          <CheckCheck className="w-3 h-3" />
                          Confirmado
                        </Badge>
                      ) : isValid ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                          <Check className="w-3 h-3" />
                          Presente
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <X className="w-3 h-3" />
                          Inválido
                        </Badge>
                      )}

                      {/* Invalidate button */}
                      {isValid && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-100"
                          onClick={() => handleInvalidate(athlete.id)}
                          title="Marcar como inválido"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                    /* Quick check-in button */
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleQuickCheckIn(athlete.id)}
                      disabled={isBlocked}
                    >
                      <Check className="w-3 h-3" />
                      Marcar
                    </Button>
                  )}
                </div>
              </div>
            )
          })}

          {athletes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay atletas asignados a esta sesión
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
