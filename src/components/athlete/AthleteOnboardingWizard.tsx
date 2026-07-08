'use client'

import { useState, useRef, useTransition, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle, Loader2, Zap, ArrowRight, ArrowLeft, CreditCard,
  PartyPopper, ChevronRight, Upload, Clock, ImageIcon, MessageCircle,
} from 'lucide-react'
import { enrollWithPayment, uploadTransferReceipt } from '@/lib/actions/athlete-enrollment'
import type { OnboardingData } from '@/lib/athlete-enrollment-shared'
import type { SportConfig } from '@/lib/sport-fields'
import { getEnabledPaymentMethodIdsFromClubSettings } from '@/lib/payment-methods'
import { buildWhatsAppTransferLink } from '@/lib/whatsapp-transfer'
import { TRANSFER_RECEIPT_MAX_BYTES } from '@/lib/constants'

// ─── Payment methods ────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { id: 'mercadopago', label: 'MercadoPago', icon: '💳', description: 'Tarjeta de crédito/débito o saldo MP' },
  { id: 'flow', label: 'Flow', icon: '🔵', description: 'Pago en línea con Flow.cl' },
  { id: 'webpay', label: 'Webpay', icon: '🏦', description: 'Transbank - Tarjeta de crédito/débito' },
  { id: 'khipu', label: 'Khipu', icon: '🟢', description: 'Transferencia bancaria instantánea' },
  { id: 'transfer', label: 'Transferencia Bancaria', icon: '🏧', description: 'Transferencia manual + adjuntar comprobante' },
  { id: 'cash', label: 'Efectivo', icon: '💵', description: 'Pago presencial en el club' },
]

const BILLING_LABEL: Record<string, string> = {
  monthly: 'mes', quarterly: 'trimestre', semiannual: 'semestre', annual: 'año', single: 'pago único',
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  data: OnboardingData
  sportConfig: SportConfig | null
}

type Step = 'plan' | 'checkout' | 'done' | 'waiting'

// ─── Main Component ─────────────────────────────────────────────────────────

export function AthleteOnboardingWizard({ data, sportConfig: _sportConfig }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>(data.hasPendingPayment ? 'waiting' : 'plan')
  const [loading, setLoading] = useState(false)

  const enabledPaymentIds = useMemo(
    () => getEnabledPaymentMethodIdsFromClubSettings((data.club.settings ?? {}) as Record<string, unknown>),
    [data.club.settings]
  )
  const visiblePaymentMethods = useMemo(() => {
    if (enabledPaymentIds === null) return PAYMENT_METHODS
    return PAYMENT_METHODS.filter((pm) => enabledPaymentIds.includes(pm.id))
  }, [enabledPaymentIds])

  // Plan state
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const selectedPlan = data.plans.find((p) => p.id === selectedPlanId) ?? null

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)

  useEffect(() => {
    if (step !== 'checkout' || !paymentMethod) return
    if (!visiblePaymentMethods.some((m) => m.id === paymentMethod)) {
      setPaymentMethod(null)
    }
  }, [step, paymentMethod, visiblePaymentMethods])

  useEffect(() => {
    if (paymentMethod !== 'transfer') {
      setTransferDelivery('upload')
      setReceiptFile(null)
      setReceiptPreview(null)
    }
  }, [paymentMethod])

  // Transfer receipt: subir imagen o enviar por WhatsApp (si el club configuró número)
  const [transferDelivery, setTransferDelivery] = useState<'upload' | 'whatsapp'>('upload')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clubName = data.club.name
  const primaryColor = data.club.primary_color || '#6366f1'

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG, PNG, etc.)')
      return
    }
    if (file.size > TRANSFER_RECEIPT_MAX_BYTES) {
      toast.error(
        `La imagen no puede superar ${TRANSFER_RECEIPT_MAX_BYTES / (1024 * 1024)} MB (límite de la plataforma al subir comprobantes)`
      )
      return
    }
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  async function handleEnroll() {
    if (!selectedPlanId || !paymentMethod) return
    const isTransfer = paymentMethod === 'transfer'
    const viaWhatsapp = isTransfer && transferDelivery === 'whatsapp'
    if (isTransfer && !viaWhatsapp && !receiptFile) {
      toast.error('Adjunta el comprobante de transferencia o usa WhatsApp')
      return
    }

    setLoading(true)
    try {
      let receiptUrl: string | undefined
      let transferSource: 'upload' | 'whatsapp' | undefined

      if (isTransfer && viaWhatsapp) {
        transferSource = 'whatsapp'
      } else if (isTransfer && receiptFile) {
        const formData = new FormData()
        formData.append('file', receiptFile)
        const uploadResult = await uploadTransferReceipt(formData)
        receiptUrl = uploadResult.path
        transferSource = 'upload'
      }

      const result = await enrollWithPayment(
        selectedPlanId,
        paymentMethod,
        receiptUrl,
        transferSource
      )
      // Pasarela online (MercadoPago): redirige al checkout. La página navega fuera; no cambiamos de paso.
      const initPoint = (result as { initPoint?: string }).initPoint
      if (initPoint) {
        window.location.href = initPoint
        return
      }
      setStep(result.isTransfer ? 'waiting' : 'done')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar inscripción')
    } finally {
      setLoading(false)
    }
  }

  function handleFinish() {
    startTransition(() => {
      router.refresh()
    })
  }

  // ─── Render helpers ─────────────────────────────────────────────────────

  function renderProgressBar() {
    const labels = ['Selecciona Plan', 'Pago', 'Confirmación']
    const stepMap: Record<Step, number> = { plan: 0, checkout: 1, done: 2, waiting: 2 }
    const currentIndex = stepMap[step]
    return (
      <div className="flex items-center justify-center gap-1 mb-8">
        {labels.map((label, i) => {
          const isActive = i === currentIndex
          const isCompleted = i < currentIndex
          return (
            <div key={label} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'text-white shadow-lg'
                        : 'bg-muted text-muted-foreground'
                  }`}
                  style={isActive ? { backgroundColor: primaryColor } : undefined}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div className={`w-10 h-0.5 mb-4 ${i < currentIndex ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function renderClubHeader() {
    return (
      <div className="flex items-center justify-center gap-3 mb-2">
        {data.club.logo_url ? (
          <Image src={data.club.logo_url} alt={clubName} width={40} height={40} className="rounded-lg object-contain" />
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {clubName.charAt(0)}
          </div>
        )}
        <span className="font-semibold text-lg">{clubName}</span>
      </div>
    )
  }

  // ─── STEP: Plan Selection ───────────────────────────────────────────────

  function renderPlanSelection() {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {renderClubHeader()}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">Elige tu Plan</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona un plan para activar tu cuenta y acceder a todas las funcionalidades
          </p>
        </div>

        {data.plans.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No hay planes disponibles en este momento. Contacta al administrador del club.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.plans.map((plan, i) => {
              const isPopular = i === Math.floor(data.plans.length / 2) && data.plans.length > 1
              const isSelected = selectedPlanId === plan.id

              return (
                <Card
                  key={plan.id}
                  className={`relative cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'ring-2 shadow-md'
                      : isPopular
                        ? 'border-primary/30'
                        : ''
                  }`}
                  style={isSelected ? { borderColor: primaryColor } : undefined}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  {isPopular && !isSelected && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground gap-1">
                        <Zap className="w-3 h-3" /> Popular
                      </Badge>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="gap-1 text-white" style={{ backgroundColor: primaryColor }}>
                        <CheckCircle className="w-3 h-3" /> Seleccionado
                      </Badge>
                    </div>
                  )}

                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
                    </div>

                    <div>
                      <span className="text-3xl font-bold">${plan.price.toLocaleString('es-CL')}</span>
                      <span className="text-muted-foreground text-sm ml-1">
                        / {BILLING_LABEL[plan.billing_cycle] ?? plan.billing_cycle}
                      </span>
                    </div>

                    {plan.enrollment_fee != null && plan.enrollment_fee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        + ${plan.enrollment_fee.toLocaleString('es-CL')} matrícula
                      </p>
                    )}

                    <ul className="space-y-1.5 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        Acceso a entrenamientos
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        Check-in QR
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {plan.session_limit ? `${plan.session_limit} sesiones/ciclo` : 'Sesiones ilimitadas'}
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {data.plans.length > 0 && (
          <div className="flex justify-center">
            <Button
              size="lg"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setStep('checkout')}
              disabled={!selectedPlanId}
              className="min-w-[240px] text-white"
            >
              Continuar al Pago <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ─── STEP: Checkout ─────────────────────────────────────────────────────

  function renderCheckout() {
    if (!selectedPlan) return null
    const total = (selectedPlan.price ?? 0) + (selectedPlan.enrollment_fee ?? 0)
    const isTransfer = paymentMethod === 'transfer'
    const waPhone = data.bankInfo?.whatsapp_phone?.trim()
    const waLink =
      waPhone && isTransfer
        ? buildWhatsAppTransferLink(
            waPhone,
            `Hola, envío comprobante de transferencia.\n\nClub: ${clubName}\nPlan: ${selectedPlan.name}\nTotal: $${total.toLocaleString('es-CL')}\nAtleta: ${data.user.fullName || '—'}`
          )
        : null

    return (
      <div className="max-w-lg mx-auto space-y-6">
        {renderClubHeader()}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">Confirma tu Pago</h2>
          <p className="text-sm text-muted-foreground">Revisa el resumen y elige tu medio de pago</p>
        </div>

        {/* Order summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{selectedPlan.name}</span>
              <span className="font-medium">${selectedPlan.price.toLocaleString('es-CL')}</span>
            </div>
            {selectedPlan.enrollment_fee != null && selectedPlan.enrollment_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Matrícula</span>
                <span className="font-medium">${selectedPlan.enrollment_fee.toLocaleString('es-CL')}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span style={{ color: primaryColor }}>${total.toLocaleString('es-CL')}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Ciclo: {BILLING_LABEL[selectedPlan.billing_cycle] ?? selectedPlan.billing_cycle}
            </p>
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Medio de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visiblePaymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                El club no tiene medios de pago habilitados. Contacta al administrador.
              </p>
            ) : (
              visiblePaymentMethods.map((pm) => {
                const selected = paymentMethod === pm.id
                return (
                  <div
                    key={pm.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selected ? 'ring-2 bg-accent' : 'hover:bg-accent/50'
                    }`}
                    style={selected ? { borderColor: primaryColor } : undefined}
                    onClick={() => setPaymentMethod(pm.id)}
                  >
                    <span className="text-xl">{pm.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pm.label}</p>
                      <p className="text-xs text-muted-foreground">{pm.description}</p>
                    </div>
                    {selected && <CheckCircle className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Transfer: bank account info + upload receipt */}
        {isTransfer && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-500/10 dark:border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <CreditCard className="w-4 h-4" /> Datos para Transferencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.bankInfo ? (
                <div className="bg-background rounded-lg p-4 border space-y-2">
                  {data.bankInfo.bank_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Banco</span>
                      <span className="font-medium">{data.bankInfo.bank_name}</span>
                    </div>
                  )}
                  {data.bankInfo.account_type && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo de cuenta</span>
                      <span className="font-medium">{data.bankInfo.account_type}</span>
                    </div>
                  )}
                  {data.bankInfo.account_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">N° de cuenta</span>
                      <span className="font-medium font-mono">{data.bankInfo.account_number}</span>
                    </div>
                  )}
                  {data.bankInfo.account_holder && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Titular</span>
                      <span className="font-medium">{data.bankInfo.account_holder}</span>
                    </div>
                  )}
                  {data.bankInfo.rut && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">RUT</span>
                      <span className="font-medium font-mono">{data.bankInfo.rut}</span>
                    </div>
                  )}
                  {data.bankInfo.email && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{data.bankInfo.email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-background rounded-lg p-4 border text-center">
                  <p className="text-sm text-muted-foreground">
                    Los datos bancarios no están configurados. Contacta al administrador del club.
                  </p>
                </div>
              )}

              {waLink && (
                <div className="flex rounded-xl border bg-background/80 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTransferDelivery('upload')
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                      transferDelivery === 'upload'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    Subir imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTransferDelivery('whatsapp')
                      setReceiptFile(null)
                      setReceiptPreview(null)
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                      transferDelivery === 'whatsapp'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    WhatsApp
                  </button>
                </div>
              )}

              {transferDelivery === 'upload' && (
                <>
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Upload className="w-4 h-4" /> Adjuntar comprobante
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Una vez realizada la transferencia, adjunta una imagen del comprobante (máx.{' '}
                      {TRANSFER_RECEIPT_MAX_BYTES / (1024 * 1024)} MB). El administrador la revisará y activará tu cuenta.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {receiptPreview ? (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptPreview} alt="Comprobante" className="w-full max-h-48 object-contain" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <ImageIcon className="w-3 h-3 shrink-0" />
                          {receiptFile?.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 shrink-0"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Cambiar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-24 border-dashed flex flex-col gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Haz clic para adjuntar comprobante</span>
                    </Button>
                  )}
                </>
              )}

              {transferDelivery === 'whatsapp' && waLink && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Se abrirá WhatsApp con un mensaje con los datos del pago. Envía el comprobante por ahí y luego pulsa <strong className="text-foreground">Confirmar</strong> abajo para registrar la solicitud en ApexLeap.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 border-green-600/40 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                    asChild
                  >
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-5 h-5" />
                      Abrir WhatsApp
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('plan')} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
          </Button>
          <Button
            className="flex-1 text-white"
            style={{ backgroundColor: primaryColor }}
            onClick={handleEnroll}
            disabled={
              loading ||
              visiblePaymentMethods.length === 0 ||
              !paymentMethod ||
              (isTransfer &&
                transferDelivery === 'upload' &&
                !receiptFile) ||
              (isTransfer && transferDelivery === 'whatsapp' && !waLink)
            }
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Procesando...</>
            ) : (
              <>{isTransfer ? 'Enviar Comprobante' : 'Confirmar Pago'} <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ─── STEP: Waiting (transfer pending admin confirmation) ────────────────

  function renderWaiting() {
    return (
      <div className="text-center space-y-6 max-w-lg mx-auto">
        {renderClubHeader()}

        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-amber-100 dark:bg-amber-500/20">
          <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Comprobante Enviado</h2>
          <p className="text-muted-foreground">
            Tu comprobante fue enviado al equipo de <strong style={{ color: primaryColor }}>{clubName}</strong>.
          </p>
        </div>

        <Card className="text-left">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Pendiente de Confirmación</p>
                <p className="text-xs text-muted-foreground mt-1">
                  El administrador verificará tu pago. Una vez confirmado, tu cuenta se activará automáticamente y podrás acceder a todas las funcionalidades.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Plan: {selectedPlan?.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu suscripción quedó registrada. Solo falta la validación del pago.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Puedes cerrar esta página. Recibirás acceso automáticamente cuando el pago sea confirmado.
        </p>
      </div>
    )
  }

  // ─── STEP: Done (instant payment confirmed) ────────────────────────────

  function renderDone() {
    return (
      <div className="text-center space-y-6 max-w-lg mx-auto">
        {renderClubHeader()}

        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-green-100 dark:bg-green-500/20">
          <PartyPopper className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold">¡Todo listo!</h2>
          <p className="text-muted-foreground">
            Tu cuenta en <strong style={{ color: primaryColor }}>{clubName}</strong> ha sido activada.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-6 text-left space-y-2">
          <p className="text-sm font-medium mb-3">Ahora puedes:</p>
          {[
            'Ver los horarios y calendario de clases',
            'Marcar asistencia con QR en las sesiones',
            'Seguir tu progreso y rendimiento',
            'Gestionar tus pagos y suscripción',
          ].map((text) => (
            <div key={text} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              {text}
            </div>
          ))}
        </div>

        <Button
          size="lg"
          className="w-full text-white"
          style={{ backgroundColor: primaryColor }}
          onClick={handleFinish}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Acceder a mi Portal <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    )
  }

  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

      {/* Wizard content */}
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto px-4 py-8">
        {renderProgressBar()}
        {step === 'plan' && renderPlanSelection()}
        {step === 'checkout' && renderCheckout()}
        {step === 'done' && renderDone()}
        {step === 'waiting' && renderWaiting()}
      </div>
    </div>
  )
}
