'use client'

import { useState } from 'react'
import { PayNowModal } from './PayNowModal'
import { CreditCard, AlertTriangle, Clock, RefreshCw } from 'lucide-react'

interface PayNowButtonProps {
  planName: string
  planPrice: number
  planCycle: string
  hasOverdue: boolean
  hasPending: boolean
  bankInfo?: {
    bank_name?: string
    account_type?: string
    account_number?: string
    account_holder?: string
    rut?: string
    email?: string
  } | null
  enabledMethods?: string[] | null
  cashInstructions?: string
  flowCheckoutUrl?: string | null
}

export function PayNowButton({ planName, planPrice, planCycle, hasOverdue, hasPending, bankInfo, enabledMethods, cashInstructions, flowCheckoutUrl }: PayNowButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Primary CTA banner */}
      <div className={`rounded-2xl p-5 sm:p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        hasOverdue
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-primary/20 bg-primary/5'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            hasOverdue ? 'bg-destructive/20' : 'bg-primary/20'
          }`}>
            {hasOverdue
              ? <AlertTriangle className="w-6 h-6 text-destructive" />
              : hasPending
                ? <Clock className="w-6 h-6 text-amber-500" />
                : <RefreshCw className="w-6 h-6 text-primary" />
            }
          </div>
          <div>
            <p className={`font-black text-base tracking-tight ${hasOverdue ? 'text-destructive' : 'text-foreground'}`}>
              {hasOverdue
                ? 'Tienes pagos vencidos'
                : hasPending
                  ? 'Pago pendiente de validación'
                  : 'Pagar cuota del mes'}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {hasOverdue
                ? 'Regulariza tu cuenta para mantener acceso al club'
                : hasPending
                  ? 'Tu comprobante está siendo revisado por el administrador'
                  : `${planName} · $${planPrice.toLocaleString('es-CL')} / ${planCycle}`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className={`shrink-0 h-11 px-6 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-100 ${
            hasOverdue
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.25)]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {hasOverdue ? 'Pagar Ahora' : hasPending ? 'Enviar otro' : 'Pagar Cuota'}
        </button>
      </div>

      {open && (
        <PayNowModal
          planName={planName}
          planPrice={planPrice}
          planCycle={planCycle}
          bankInfo={bankInfo}
          enabledMethods={enabledMethods}
          cashInstructions={cashInstructions}
          flowCheckoutUrl={flowCheckoutUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
