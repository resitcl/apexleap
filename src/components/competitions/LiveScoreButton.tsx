'use client'

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Radio, Minus, Plus } from "lucide-react"
import { updateRosterScore } from "@/lib/actions/rosters"

interface Props {
  rosterId: string
  competitionId: string
  clubName: string
  opponent: string | null
  initialScore?: { home: number; away: number; status: string } | null
}

export function LiveScoreButton({ rosterId, competitionId, clubName, opponent, initialScore }: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [home, setHome] = useState(initialScore?.home ?? 0)
  const [away, setAway] = useState(initialScore?.away ?? 0)
  const [status, setStatus] = useState<'upcoming' | 'live' | 'finished'>(
    (initialScore?.status as 'upcoming' | 'live' | 'finished') ?? 'upcoming'
  )

  async function handleSave() {
    setSaving(true)
    try {
      await updateRosterScore({ rosterId, competitionId, homeScore: home, awayScore: away, status })
      toast.success('Marcador actualizado')
      setOpen(false)
    } catch {
      toast.error('Error al guardar marcador')
    } finally {
      setSaving(false)
    }
  }

  const statusColor = status === 'live' ? 'bg-red-500 animate-pulse' : status === 'finished' ? 'bg-gray-400' : 'bg-gray-200'
  const hasScore = initialScore && (initialScore.home > 0 || initialScore.away > 0 || initialScore.status !== 'upcoming')

  return (
    <>
      <Button
        size="sm"
        variant={status === 'live' ? 'destructive' : 'outline'}
        className="gap-1.5 h-8 text-xs"
        onClick={() => setOpen(true)}
      >
        <Radio className="w-3.5 h-3.5" />
        {hasScore ? `${initialScore!.home}–${initialScore!.away}` : 'Live Score'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
              Mesa de Control
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Estado del partido */}
            <div className="flex gap-2 justify-center">
              {(['upcoming', 'live', 'finished'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    status === s
                      ? s === 'live' ? 'bg-red-500 text-white border-red-500'
                        : s === 'finished' ? 'bg-gray-700 text-white border-gray-700'
                        : 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                >
                  {s === 'upcoming' ? 'Por jugar' : s === 'live' ? '🔴 EN VIVO' : 'Finalizado'}
                </button>
              ))}
            </div>

            {/* Marcador */}
            <div className="flex items-center justify-center gap-6">
              {/* Local */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground truncate max-w-[100px] text-center">{clubName}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHome((h) => Math.max(0, h - 1))}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-accent"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-5xl font-bold w-14 text-center">{home}</span>
                  <button
                    onClick={() => setHome((h) => h + 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-accent bg-primary/5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <span className="text-3xl font-bold text-muted-foreground">–</span>

              {/* Visitante */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground truncate max-w-[100px] text-center">{opponent ?? 'Rival'}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAway((a) => Math.max(0, a - 1))}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-accent"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-5xl font-bold w-14 text-center">{away}</span>
                  <button
                    onClick={() => setAway((a) => a + 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-accent bg-primary/5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Resultado */}
            {status === 'finished' && (
              <div className="text-center">
                <Badge className={
                  home > away ? 'bg-green-100 text-green-700 border-green-200' :
                  away > home ? 'bg-red-100 text-red-700 border-red-200' :
                  'bg-gray-100 text-gray-700 border-gray-200'
                }>
                  {home > away ? '✓ Victoria' : away > home ? '✗ Derrota' : '= Empate'}
                </Badge>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
