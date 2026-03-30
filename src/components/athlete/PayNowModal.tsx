'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  X, CreditCard, Upload, ImageIcon, CheckCircle2, 
  Clock, AlertTriangle, Loader2, ChevronRight,
  Banknote, Building2, Smartphone, Wallet
} from 'lucide-react'
import { submitSelfPayment, uploadTransferReceipt } from '@/lib/actions/athlete-enrollment'
import { toast } from 'sonner'

interface PayNowModalProps {
  planName: string
  planPrice: number
  planCycle: string
  bankInfo?: {
    bank_name?: string
    account_type?: string
    account_number?: string
    account_holder?: string
    rut?: string
    email?: string
  } | null
  enabledMethods?: string[]
  cashInstructions?: string
  onClose: () => void
}

const BILLING_LABEL: Record<string, string> = {
  monthly: 'mes', quarterly: 'trimestre', semiannual: 'semestre', annual: 'año', single: 'pago único',
}

const PAYMENT_METHODS = [
  { id: 'transfer',     label: 'Transferencia Bancaria', icon: Building2,   description: 'Transfiere y adjunta tu comprobante' },
  { id: 'cash',         label: 'Efectivo',               icon: Banknote,    description: 'Pago presencial en el club' },
  { id: 'webpay',       label: 'Webpay',                 icon: CreditCard,  description: 'Transbank — tarjeta de crédito/débito' },
  { id: 'mercadopago',  label: 'MercadoPago',            icon: Wallet,      description: 'Tarjeta o saldo MercadoPago' },
  { id: 'flow',         label: 'Flow',                   icon: Smartphone,  description: 'Pago online con Flow.cl' },
]

type Step = 'method' | 'transfer_details' | 'done' | 'waiting'

export function PayNowModal({ planName, planPrice, planCycle, bankInfo, enabledMethods, cashInstructions, onClose }: PayNowModalProps) {
  // If no enabled_methods configured, show all; otherwise filter to configured ones
  const visibleMethods = (enabledMethods && enabledMethods.length > 0)
    ? PAYMENT_METHODS.filter((m) => enabledMethods.includes(m.id))
    : PAYMENT_METHODS
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('method')
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB'); return }
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  async function handleConfirm() {
    if (!selectedMethod) return
    const isTransfer = selectedMethod === 'transfer'
    if (isTransfer && !receiptFile) { toast.error('Adjunta el comprobante de transferencia'); return }

    setLoading(true)
    try {
      let receiptUrl: string | undefined
      if (isTransfer && receiptFile) {
        const formData = new FormData()
        formData.append('file', receiptFile)
        const uploaded = await uploadTransferReceipt(formData)
        receiptUrl = uploaded.url
      }

      const result = await submitSelfPayment({ paymentMethod: selectedMethod, receiptUrl })
      setStep(result.isTransfer ? 'waiting' : 'done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  function handleFinish() {
    startTransition(() => { router.refresh() })
    onClose()
  }

  // ── Backdrop click
  function onBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-[#111113] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/[0.05]">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Pagar Cuota
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {planName} · ${planPrice.toLocaleString('es-CL')} / {BILLING_LABEL[planCycle] ?? planCycle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── STEP: method selection */}
          {step === 'method' && (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Selecciona tu método de pago
                </p>
                {visibleMethods.length === 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400 font-medium">
                    El club aún no ha configurado métodos de pago. Contacta al administrador.
                  </div>
                )}
                {visibleMethods.map((pm) => {
                  const Icon = pm.icon
                  const isSelected = selectedMethod === pm.id
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedMethod(pm.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary/20' : 'bg-white/5'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                          {pm.label}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{pm.description}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>

              {/* Transfer: bank details + receipt */}
              {selectedMethod === 'transfer' && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    Datos para trasferencia
                  </p>
                  {bankInfo ? (
                    <div className="space-y-2">
                      {bankInfo.bank_name && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Banco</span>
                          <span className="font-bold text-foreground">{bankInfo.bank_name}</span>
                        </div>
                      )}
                      {bankInfo.account_type && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tipo</span>
                          <span className="font-bold text-foreground">{bankInfo.account_type}</span>
                        </div>
                      )}
                      {bankInfo.account_number && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">N° Cuenta</span>
                          <span className="font-bold font-mono text-foreground">{bankInfo.account_number}</span>
                        </div>
                      )}
                      {bankInfo.account_holder && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Titular</span>
                          <span className="font-bold text-foreground">{bankInfo.account_holder}</span>
                        </div>
                      )}
                      {bankInfo.rut && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">RUT</span>
                          <span className="font-bold font-mono text-foreground">{bankInfo.rut}</span>
                        </div>
                      )}
                      {bankInfo.email && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-bold text-foreground">{bankInfo.email}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Los datos bancarios no están configurados. Contacta al administrador.</p>
                  )}

                  <div className="border-t border-white/[0.05] pt-4">
                    <p className="text-xs font-bold text-foreground/80 mb-3 flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" /> Adjuntar Comprobante
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {receiptPreview ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptPreview} alt="Comprobante" className="w-full max-h-40 object-contain rounded-xl border border-white/[0.06]" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <ImageIcon className="w-3 h-3 shrink-0" />
                            {receiptFile?.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-primary hover:underline font-bold shrink-0 ml-2"
                          >
                            Cambiar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-20 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-primary/40 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-xs font-medium">Haz clic para adjuntar imagen</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cash: show admin instructions if configured */}
              {selectedMethod === 'cash' && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-500">
                    Instrucciones de pago en efectivo
                  </p>
                  <p className="text-sm text-foreground/80 font-medium">
                    {cashInstructions?.trim()
                      ? cashInstructions
                      : 'Acércate al club para realizar el pago en efectivo. El administrador registrará el pago.'}
                  </p>
                </div>
              )}

              {/* Other methods: info notice */}
              {selectedMethod && selectedMethod !== 'transfer' && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-300/80 font-medium">
                    Al confirmar, se registrará una solicitud de pago pendiente. El administrador del club validará el pago y actualizará tu estado.
                  </p>
                </div>
              )}

              {/* CTA */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedMethod || loading || (selectedMethod === 'transfer' && !receiptFile) || visibleMethods.length === 0}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-primary/90 hover:scale-[1.01] transition-all shadow-[0_0_20px_rgba(var(--primary),0.25)] disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                ) : (
                  <>{selectedMethod === 'transfer' ? 'Enviar Comprobante' : 'Confirmar Pago'} <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </>
          )}

          {/* ── STEP: waiting (transfer pending) */}
          {step === 'waiting' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-amber-500/15 border border-amber-500/20">
                <Clock className="w-10 h-10 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Comprobante Enviado</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Tu comprobante fue enviado al equipo del club. El pago se registrará como <strong className="text-amber-400">Pendiente</strong> hasta ser validado por un administrador.
                </p>
              </div>
              <button
                onClick={handleFinish}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all"
              >
                Entendido
              </button>
            </div>
          )}

          {/* ── STEP: done (instant—non-transfer) */}
          {step === 'done' && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-primary/15 border border-primary/20">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground">Solicitud Registrada</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Tu solicitud de pago quedó registrada como <strong className="text-primary">Pendiente</strong>. Un administrador la confirmará pronto.
                </p>
              </div>
              <button
                onClick={handleFinish}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all"
              >
                Ver mis Pagos
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
