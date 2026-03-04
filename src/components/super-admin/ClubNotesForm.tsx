'use client'

import { useState, useTransition } from 'react'
import { updateClubNotes } from '@/lib/actions/super-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StickyNote, Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  clubId: string
  currentNotes: string
}

export function ClubNotesForm({ clubId, currentNotes }: Props) {
  const [notes, setNotes] = useState(currentNotes)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  function handleSave() {
    setError('')
    setSaved(false)
    start(async () => {
      try {
        await updateClubNotes(clubId, notes)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al guardar')
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="w-4 h-4" />
          Notas Internas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Notas privadas del Super Admin sobre este club (no visibles para el club)..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved ? <><CheckCircle2 className="w-3 h-3" /> Guardado</> : 'Guardar notas'}
        </button>
      </CardContent>
    </Card>
  )
}
