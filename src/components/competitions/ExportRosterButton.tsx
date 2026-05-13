'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { partitionRosterByStarter, isRosterTitular } from '@/lib/roster-partition'

interface RosterAthlete {
  number: number | null
  position: string | null
  is_captain: boolean
  is_starter?: boolean | null
  status: string
  athletes: { name: string } | null
}

interface Roster {
  name: string
  match_date: string
  opponent: string | null
  venue: string | null
  roster_athletes: RosterAthlete[]
}

export function ExportRosterButton({ roster, competitionName }: { roster: Roster; competitionName: string }) {
  function handle() {
    const BOM = '\uFEFF'
    const lines: string[] = []

    lines.push(`"${competitionName} — ${roster.name}"`)
    lines.push(`"Fecha";"${new Date(roster.match_date + 'T12:00:00').toLocaleDateString('es-CL')}"`)
    if (roster.opponent) lines.push(`"Rival";"${roster.opponent}"`)
    if (roster.venue) lines.push(`"Sede";"${roster.venue}"`)
    lines.push('')
    lines.push('"N°";"Nombre";"Posición";"Titular/Suplente";"Capitán";"Estado"')

    const athletes = roster.roster_athletes ?? []
    const { titulares, suplentes } = partitionRosterByStarter(athletes)
    const pushRows = (list: RosterAthlete[]) => {
      for (const ra of list) {
        lines.push([
          `"${ra.number ?? ''}"`,
          `"${ra.athletes?.name ?? '—'}"`,
          `"${ra.position ?? '—'}"`,
          `"${isRosterTitular(ra.is_starter) ? 'Titular' : 'Suplente'}"`,
          `"${ra.is_captain ? 'Sí' : 'No'}"`,
          `"${ra.status === 'confirmed' ? 'Confirmado' : ra.status === 'pending' ? 'Pendiente' : 'Descartado'}"`,
        ].join(';'))
      }
    }
    if (titulares.length) {
      lines.push('"--- Titulares ---"')
      pushRows(titulares)
    }
    if (suplentes.length) {
      lines.push('"--- Suplentes / reservas ---"')
      pushRows(suplentes)
    }

    const csv = BOM + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nomina-${roster.name.toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handle} className="gap-1.5 h-8 text-xs">
      <Download className="w-3.5 h-3.5" />
      CSV
    </Button>
  )
}
