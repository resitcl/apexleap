'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  MoreHorizontal,
  User,
  CreditCard,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  UserX,
} from 'lucide-react'
import { archiveAthlete, reactivateAthlete, suspendAthlete } from '@/lib/actions/athletes'
import { ConfirmTransferButton } from '@/components/payments/ConfirmTransferButton'

/** Cuota con comprobante esperando validación del admin, si el alumno tiene una. */
export interface PendingTransfer {
  id: string
  concept: string
  amount: number
  due_date: string
  notes: string | null
  athlete_id: string
  plan_id: string | null
  plans: { name: string; billing_cycle?: string } | null
}

interface Props {
  athleteId: string
  athleteName: string
  status: string
  pendingTransfer?: PendingTransfer | null
  /** Día de cobro vigente, para el aviso del diálogo de confirmación. */
  billingAnchorDay?: number | null
}

type ConfirmKind = 'suspend' | 'reactivate' | 'archive'

const CONFIRM_COPY: Record<ConfirmKind, { title: (n: string) => string; body: string; cta: string; danger: boolean }> = {
  suspend: {
    title: (n) => `¿Suspender a ${n}?`,
    body:
      'Queda suspendido y se pausa la facturación: no se generan cuotas nuevas mientras lo esté. ' +
      'Las cuotas vencidas existentes se mantienen. Puedes reactivarlo cuando vuelva a entrenar.',
    cta: 'Suspender',
    danger: false,
  },
  reactivate: {
    title: (n) => `¿Reactivar a ${n}?`,
    body:
      'Vuelve a estado activo y se reanuda la facturación desde el período actual ' +
      '(no se cobra el tiempo que estuvo suspendido).',
    cta: 'Reactivar',
    danger: false,
  },
  archive: {
    title: (n) => `¿Dar de baja a ${n}?`,
    body:
      'Dejará de aparecer en alumnos y no podrá fichar. Sus pagos e historial financiero NO se borran ' +
      'y seguirán contando en reportes e ingresos pasados.',
    cta: 'Dar de baja',
    danger: true,
  },
}

export function AthleteRowActions({ athleteId, athleteName, status, pendingTransfer, billingAnchorDay }: Props) {
  const router = useRouter()
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isSuspended = status === 'suspended'

  async function runConfirm() {
    if (!confirmKind) return
    setLoading(true)
    try {
      if (confirmKind === 'suspend') {
        await suspendAthlete(athleteId)
        toast.success('Alumno suspendido — facturación en pausa')
      } else if (confirmKind === 'reactivate') {
        await reactivateAthlete(athleteId)
        toast.success('Alumno reactivado — facturación reanudada')
      } else {
        await archiveAthlete(athleteId)
        toast.success('Alumno dado de baja. Sus pagos siguen en contabilidad.')
      }
      setConfirmKind(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo completar la acción')
    } finally {
      setLoading(false)
    }
  }

  const copy = confirmKind ? CONFIRM_COPY[confirmKind] : null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de ${athleteName}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{athleteName}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => router.push(`/dashboard/athletes/${athleteId}`)}>
            <User className="h-4 w-4" />
            Ver perfil
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => router.push(`/dashboard/payments/new?athleteId=${athleteId}`)}>
            <CreditCard className="h-4 w-4" />
            Registrar pago
          </DropdownMenuItem>

          {pendingTransfer ? (
            <DropdownMenuItem
              onSelect={() => {
                // El diálogo se monta fuera del menú: hay que esperar a que Radix cierre el
                // popover, si no el foco vuelve al trigger y cierra el modal recién abierto.
                setTimeout(() => setTransferOpen(true), 0)
              }}
              className="text-emerald-600 focus:text-emerald-600 dark:text-emerald-400 dark:focus:text-emerald-400"
            >
              <CheckCircle className="h-4 w-4" />
              Confirmar transferencia
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setConfirmKind(isSuspended ? 'reactivate' : 'suspend')}>
            {isSuspended ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
            {isSuspended ? 'Reactivar' : 'Suspender'}
          </DropdownMenuItem>

          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmKind('archive')}
          >
            <UserX className="h-4 w-4" />
            Dar de baja
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {copy ? (
        <AlertDialog open onOpenChange={(o) => { if (!o) setConfirmKind(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{copy.title(athleteName)}</AlertDialogTitle>
              <AlertDialogDescription>{copy.body}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); void runConfirm() }}
                disabled={loading}
                className={copy.danger ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {loading ? 'Procesando…' : copy.cta}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {pendingTransfer ? (
        <ConfirmTransferButton
          hideButton
          open={transferOpen}
          onOpenChange={setTransferOpen}
          billingAnchorDay={billingAnchorDay ?? null}
          payment={{
            ...pendingTransfer,
            athletes: { id: athleteId, name: athleteName },
          }}
        />
      ) : null}
    </>
  )
}
