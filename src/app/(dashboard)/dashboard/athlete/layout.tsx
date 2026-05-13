import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getClubMembershipRole } from '@/lib/actions/club-context'
import { getAthleteFinancialAccessState } from '@/lib/actions/athlete-enrollment'

const ALLOWED_WHEN_HARD = new Set([
  '/dashboard/athlete/payments',
  '/dashboard/athlete/subscription',
  '/dashboard/athlete/select-plan',
])

function isAllowedWhenHardBlocked(pathname: string): boolean {
  if (ALLOWED_WHEN_HARD.has(pathname)) return true
  return [...ALLOWED_WHEN_HARD].some((prefix) => pathname.startsWith(`${prefix}/`))
}

export default async function AthleteSectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let role = 'admin'
  try {
    role = await getClubMembershipRole()
  } catch {
    return <>{children}</>
  }

  if (role !== 'athlete') {
    if (role === 'admin_athlete') {
      return (
        <>
          <div
            role="note"
            className="mb-4 rounded-xl border border-violet-500/25 bg-violet-500/[0.07] px-4 py-3 text-sm text-foreground/90"
          >
            <p className="font-semibold text-violet-700 dark:text-violet-300">Administrador + jugador</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              En este portal ves tu actividad como atleta. Los bloqueos automáticos por mora o inscripción pendiente
              no aplican a tu cuenta de staff; igual puedes revisar tus pagos y documentos aquí.
            </p>
          </div>
          {children}
        </>
      )
    }
    return <>{children}</>
  }

  const pathname = ((await headers()).get('x-pathname') ?? '').replace(/\/$/, '')

  let access: Awaited<ReturnType<typeof getAthleteFinancialAccessState>>
  try {
    access = await getAthleteFinancialAccessState()
  } catch {
    return <>{children}</>
  }

  if (pathname && access.awaitingAdminPaymentConfirmation && pathname !== '/dashboard/athlete') {
    redirect('/dashboard/athlete')
  }

  if (
    pathname &&
    access.delinquency.hardBlocked &&
    !access.awaitingAdminPaymentConfirmation &&
    !isAllowedWhenHardBlocked(pathname)
  ) {
    redirect('/dashboard/athlete/payments?regularizar=1')
  }

  return (
    <>
      {access.delinquency.isLate &&
        !access.delinquency.hardBlocked &&
        !access.awaitingAdminPaymentConfirmation && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          >
            <p className="font-semibold">{access.delinquency.message}</p>
          </div>
        )}
      {access.delinquency.hardBlocked && !access.awaitingAdminPaymentConfirmation && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-semibold">Para poder seguir inscrito debes regularizar tu suscripción.</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Solo puedes usar Mis pagos, Mi suscripción o cambiar de plan hasta regularizar tu situación.
          </p>
        </div>
      )}
      {children}
    </>
  )
}
