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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  MoreHorizontal,
  User,
  CreditCard,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  UserX,
  BellRing,
  Loader2,
  MailCheck,
} from 'lucide-react'
import { archiveAthlete, reactivateAthlete, suspendAthlete } from '@/lib/actions/athletes'
import { sendPaymentRequest } from '@/lib/actions/communications'
import { formatReminderAge, daysSince, type LastReminder } from '@/lib/payment-reminders'
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
  /** Sin email no se puede enviar cobro; la opción queda deshabilitada con el motivo. */
  hasEmail?: boolean
  /** Deuda vencida, para dar contexto en el diálogo de cobro. */
  debt?: number
  /** Último cobro enviado a este alumno (migración 038). */
  lastReminder?: LastReminder | null
}

/** Ventana en la que reenviar un cobro se considera insistir de más. */
const REMINDER_NAG_DAYS = 3

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

export function AthleteRowActions({
  athleteId,
  athleteName,
  status,
  pendingTransfer,
  billingAnchorDay,
  hasEmail = true,
  debt = 0,
  lastReminder = null,
}: Props) {
  const router = useRouter()
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const isSuspended = status === 'suspended'

  // `Date.now()` en render es impuro y además provocaría desajuste de hidratación; el diálogo
  // solo necesita la referencia temporal cuando el usuario ya lo abrió.
  const [nowMs, setNowMs] = useState<number | null>(null)
  const reminderAge = lastReminder && nowMs ? daysSince(lastReminder.sentAt, nowMs) : null
  const sentRecently = reminderAge !== null && reminderAge < REMINDER_NAG_DAYS

  function openReminder() {
    setNowMs(new Date().getTime())
    setNote('')
    setReminderOpen(true)
  }

  async function sendReminder() {
    setLoading(true)
    try {
      const res = await sendPaymentRequest(athleteId, note)
      if (res.ok) {
        toast.success(`Cobro enviado a ${athleteName}`)
        setReminderOpen(false)
        router.refresh()
      } else {
        toast.error(res.error ?? 'No se pudo enviar el cobro')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo enviar el cobro')
    } finally {
      setLoading(false)
    }
  }

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

          <DropdownMenuItem
            disabled={!hasEmail}
            title={hasEmail ? undefined : 'El alumno no tiene email registrado'}
            // El diálogo se monta fuera del menú: hay que dejar que Radix cierre el popover
            // antes de abrirlo, si no el foco vuelve al trigger y lo cierra.
            onSelect={() => setTimeout(openReminder, 0)}
          >
            <BellRing className="h-4 w-4" />
            Enviar cobro
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

      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar cobro a {athleteName}</DialogTitle>
            <DialogDescription>
              Se envía por correo con el monto pendiente y un botón para pagar desde el portal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {debt > 0 ? (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm">
                <span className="font-bold text-red-600 dark:text-red-400">
                  ${debt.toLocaleString('es-CL')}
                </span>{' '}
                <span className="text-muted-foreground">en cuotas vencidas</span>
              </div>
            ) : null}

            {lastReminder ? (
              <div
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs ${
                  sentRecently
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'border-border bg-muted/40 text-muted-foreground'
                }`}
              >
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Último cobro {nowMs ? formatReminderAge(lastReminder.sentAt, nowMs).toLowerCase().replace('cobro ', '') : ''}
                  {' · '}
                  {lastReminder.source === 'cron' ? 'recordatorio automático' : 'enviado por el equipo'}
                  {lastReminder.sentCount > 1 ? ` · ${lastReminder.sentCount} envíos en total` : ''}
                  {sentRecently ? '. Considera esperar antes de volver a insistir.' : '.'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No hay cobros enviados a este alumno todavía.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`note-${athleteId}`}>Nota (opcional)</Label>
              <Textarea
                id={`note-${athleteId}`}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej: Recuerda regularizar antes del viernes."
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setReminderOpen(false)}
              disabled={loading}
              className="h-10 rounded-md border border-input px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void sendReminder()}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              {loading ? 'Enviando…' : 'Enviar cobro'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
