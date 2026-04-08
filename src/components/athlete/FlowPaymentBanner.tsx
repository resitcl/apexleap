'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export function FlowPaymentBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const flow = searchParams.get('flow')
  const flowReason = searchParams.get('flow_reason')
  const [visible, setVisible] = useState(!!flow)

  useEffect(() => {
    if (!flow) return
    const t = setTimeout(() => {
      dismiss()
    }, 12_000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow])

  if (!flow || !visible) return null

  const paid = flow === 'paid'
  const pending = flow === 'pending'

  function dismiss() {
    setVisible(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('flow')
    url.searchParams.delete('flow_reason')
    url.searchParams.delete('token')
    router.replace(url.pathname + url.search, { scroll: false })
  }

  return (
    <div
      className={`relative rounded-2xl border px-5 py-4 shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${
        paid
          ? 'border-primary/30 bg-primary/10'
          : pending
            ? 'border-amber-500/30 bg-amber-500/10'
            : 'border-destructive/30 bg-destructive/10'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          paid ? 'bg-primary/20' : pending ? 'bg-amber-500/20' : 'bg-destructive/20'
        }`}
      >
        {paid ? (
          <CheckCircle2 className="w-6 h-6 text-primary" />
        ) : pending ? (
          <CheckCircle2 className="w-6 h-6 text-amber-500" />
        ) : (
          <XCircle className="w-6 h-6 text-destructive" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-black tracking-tight uppercase ${paid ? 'text-primary' : pending ? 'text-amber-500' : 'text-destructive'}`}>
          {paid ? 'Pago confirmado por Flow' : pending ? 'Pago en validación' : 'Pago no confirmado'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {paid
            ? 'Tu pago fue procesado exitosamente. La suscripción ya está activa.'
            : pending
              ? 'Estamos esperando la confirmación final de Flow. Esto puede tardar algunos segundos.'
              : 'El pago no pudo ser verificado. Si realizaste el pago, puede tardar unos minutos en reflejarse.'}
        </p>
        {flowReason && (
          <p className="text-[10px] mt-1 text-muted-foreground/70">Ref: {flowReason}</p>
        )}
      </div>

      <button
        onClick={dismiss}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
