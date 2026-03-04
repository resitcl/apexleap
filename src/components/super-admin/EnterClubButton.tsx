'use client'

import { useTransition } from 'react'
import { superAdminEnterClub } from '@/lib/actions/super-admin'
import { LogIn, Loader2 } from 'lucide-react'

export function EnterClubButton({ clubId, clubName }: { clubId: string; clubName: string }) {
  const [isPending, start] = useTransition()

  return (
    <button
      onClick={() => start(() => superAdminEnterClub(clubId))}
      disabled={isPending}
      title={`Entrar al dashboard de ${clubName}`}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
    >
      {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
      Entrar
    </button>
  )
}
