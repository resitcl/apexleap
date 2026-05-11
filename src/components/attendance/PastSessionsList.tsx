'use client'

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, ChevronDown, ChevronRight, Users } from "lucide-react"

export interface SessionGroupRecord {
  id: string
  athlete_id: string | null
  schedule_id: string | null
  checked_in_at: string
  is_valid: boolean | null
  notes: string | null
  athletes: { id: string; name: string; photo_url: string | null } | null
  schedules: { id: string; name: string } | null
}

export interface SessionGroup {
  scheduleId: string
  scheduleName: string
  /** YYYY-MM-DD en zona Chile */
  date: string
  total: number
  valid: number
  records: SessionGroupRecord[]
}

interface Props {
  groups: SessionGroup[]
}

function formatDate(yyyymmdd: string) {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0))
  return dt.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Santiago',
  })
}

export function PastSessionsList({ groups }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Sin entrenamientos con asistencia registrada en el período</p>
        </CardContent>
      </Card>
    )
  }

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const key = `${g.scheduleId}__${g.date}`
        const open = expanded.has(key)
        const pct = g.total > 0 ? Math.round((g.valid / g.total) * 100) : 0
        const pctClass =
          pct >= 80 ? 'bg-green-100 text-green-700' :
          pct >= 50 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        return (
          <Card key={key}>
            <CardContent className="p-0">
              <button
                type="button"
                onClick={() => toggle(key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                {open ? (
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{g.scheduleName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{formatDate(g.date)}</p>
                </div>
                <Badge variant="outline" className="gap-1 shrink-0">
                  <Users className="w-3 h-3" />
                  {g.total}
                </Badge>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${pctClass}`}>
                  {g.valid}/{g.total} · {pct}%
                </span>
              </button>

              {open && (
                <div className="border-t border-border divide-y">
                  {g.records.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Sin registros</p>
                  ) : (
                    g.records.map((r) => {
                      const a = r.athletes
                      const dt = new Date(r.checked_in_at)
                      return (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-[10px] font-semibold">
                              {(a?.name ?? '??').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{a?.name ?? 'Desconocido'}</p>
                            <p className="text-xs text-muted-foreground">
                              {dt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' })}
                              {r.notes ? ` · ${r.notes}` : ''}
                            </p>
                          </div>
                          <Badge variant={r.is_valid ? 'default' : 'destructive'} className="text-xs shrink-0">
                            {r.is_valid ? (r.notes ? 'Justificado' : 'Válido') : 'Inválido'}
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
