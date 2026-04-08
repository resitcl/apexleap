export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Trophy, Medal, Calendar, ArrowLeft } from 'lucide-react'
import { checkUserHasClub } from '@/lib/actions/onboarding'
import { getMySubscriptionStatus } from '@/lib/actions/athlete-enrollment'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId } from '@/lib/actions/club-context'
import { getClubSettings } from '@/lib/actions/settings'
import { isMartialArtsAcademySport, parseTournamentHistory } from '@/lib/sport-fields'
import {
  aggregateTournamentStats,
  formatTournamentPlacingLine,
} from '@/lib/martial-arts-tournament-results'
import { Button } from '@/components/ui/button'
import { BjjFederationLogo } from '@/components/athlete/BjjFederationLogo'
import { AthleteSectionHeader } from '@/components/athlete/AthleteSectionHeader'

export default async function AthleteLogrosPage() {
  const hasClub = await checkUserHasClub().catch(() => false)
  if (!hasClub) redirect('/onboarding')

  const subStatus = await getMySubscriptionStatus().catch(() => null)
  if (!subStatus?.hasAthleteProfile || !subStatus.athlete) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Tu perfil de atleta aún no ha sido vinculado.</p>
      </div>
    )
  }

  const clubId = await getClubId()
  const supabase = createAdminClient()

  const [athleteRes, settings] = await Promise.all([
    supabase
      .from('athletes')
      .select('id, name, technical_meta')
      .eq('club_id', clubId)
      .eq('id', subStatus.athlete.id)
      .single(),
    getClubSettings().catch(() => null),
  ])

  if (!athleteRes.data) redirect('/dashboard/athlete')

  const sportType = (settings as { sport_type?: string | null } | null)?.sport_type ?? null
  if (!isMartialArtsAcademySport(sportType)) {
    redirect('/dashboard/athlete')
  }

  const meta = (athleteRes.data as { technical_meta?: Record<string, unknown> | null }).technical_meta ?? {}
  const entries = parseTournamentHistory(meta)
  const stats = aggregateTournamentStats(entries)

  const sorted = [...entries].sort((a, b) => {
    const da = a.date ? new Date(a.date + 'T12:00:00').getTime() : 0
    const db = b.date ? new Date(b.date + 'T12:00:00').getTime() : 0
    return db - da
  })

  return (
    <div className="space-y-8 pb-12 pt-1 max-w-3xl">
      <Link
        href="/dashboard/athlete"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver al portal
      </Link>

      <AthleteSectionHeader
        icon={Trophy}
        title="Torneos y logros"
        description={
          <>
            Resumen competitivo para academias de artes marciales. Actualiza tus resultados en{' '}
            <Link href="/dashboard/athlete/profile" className="text-primary font-semibold underline-offset-4 hover:underline">
              Mi perfil
            </Link>
            .
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-card p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">Torneos</p>
          <p className="text-3xl font-black tabular-nums">{stats.tournaments}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-card p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">Podios / resultados</p>
          <p className="text-3xl font-black tabular-nums">{stats.results}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80 dark:text-amber-400/80 mb-2 flex items-center gap-1">
            <Medal className="w-3 h-3" /> Oro
          </p>
          <p className="text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">{stats.gold}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-card p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-2">Plata / Bronce</p>
          <p className="text-2xl font-black tabular-nums">
            <span className="text-slate-400">{stats.silver}</span>
            <span className="text-muted-foreground/40 mx-1">/</span>
            <span className="text-amber-800/90 dark:text-amber-700">{stats.bronze}</span>
          </p>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <Trophy className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-foreground">Aún no hay torneos registrados</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Pide a tu academia que cargue tus resultados o añádelos desde tu ficha en Mi perfil.
          </p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/athlete/profile">Ir a Mi perfil</Link>
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Historial
        </h2>

        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin eventos en el historial.</p>
        )}

        {sorted.map((e) => {
          const dateLabel = e.date
            ? new Date(e.date + 'T12:00:00').toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : null
          const lines = (e.results ?? []).map((p) => formatTournamentPlacingLine(sportType ?? 'Jiu-Jitsu', p))
          const legacy = e.achievements?.trim()

          return (
            <div
              key={e.id}
              className="rounded-2xl border border-white/[0.06] bg-card/80 p-5 shadow-sm"
            >
              <div className="flex gap-4 items-start mb-3">
                <BjjFederationLogo federation={e.federation} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground text-lg leading-tight">{e.event_name || 'Evento sin nombre'}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {e.federation ? (
                      <>
                        <span className="font-semibold text-foreground/85">{e.federation}</span>
                        {dateLabel ? <span> · {dateLabel}</span> : null}
                      </>
                    ) : (
                      dateLabel ?? 'Sin federación indicada'
                    )}
                  </p>
                </div>
              </div>

              {lines.length > 0 && (
                <ul className="space-y-2 mt-3">
                  {lines.map((line, i) => (
                    <li key={i} className="text-sm leading-relaxed pl-3 border-l-2 border-primary/40 text-foreground/95">
                      {line}
                    </li>
                  ))}
                </ul>
              )}

              {legacy && (
                <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border/40">
                  <span className="text-[10px] uppercase font-bold text-amber-600/80">Nota anterior: </span>
                  {legacy}
                </p>
              )}

              {lines.length === 0 && !legacy && (
                <p className="text-xs text-muted-foreground">Sin resultados detallados para este evento.</p>
              )}

              {e.notes?.trim() && (
                <p className="text-xs text-muted-foreground mt-2 italic">{e.notes}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
