'use client'

import { useState, useTransition } from 'react'
import { setClubActive } from '@/lib/actions/super-admin'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface Props {
  clubId: string
  isActive: boolean
  clubName: string
}

export function ClubToggleButton({ clubId, isActive, clubName }: Props) {
  const [active, setActive] = useState(isActive)
  const [isPending, start] = useTransition()

  function handleToggle() {
    if (!confirm(
      active
        ? `¿Desactivar "${clubName}"? Los usuarios no podrán acceder.`
        : `¿Activar "${clubName}"?`
    )) return

    start(async () => {
      await setClubActive(clubId, !active)
      setActive((prev) => !prev)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
        active
          ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800'
          : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800'
      }`}
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : active ? (
        <XCircle className="w-3 h-3" />
      ) : (
        <CheckCircle2 className="w-3 h-3" />
      )}
      {active ? 'Desactivar' : 'Activar'}
    </button>
  )
}
