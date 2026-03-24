'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  User, Phone, Calendar, Shield, ArrowRight, CheckCircle,
  Loader2, Users, Clock, Send, FileText,
} from 'lucide-react'
import { requestEnrollment } from '@/lib/actions/athlete-enrollment'
import type { OnboardingData } from '@/lib/actions/athlete-enrollment'
import type { SportConfig, SportField } from '@/lib/sport-fields'

interface Props {
  data: OnboardingData
  sportConfig: SportConfig | null
}

function SportFieldInput({ field, value, onChange }: {
  field: SportField
  value: unknown
  onChange: (val: unknown) => void
}) {
  if (field.type === 'select') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <select
          id={field.key}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Seleccionar...</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      </div>
    )
  }

  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : []
    const toggle = (v: string) => {
      if (selected.includes(v)) onChange(selected.filter((s) => s !== v))
      else onChange([...selected, v])
    }
    return (
      <div className="space-y-2">
        <Label>{field.label}</Label>
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selected.includes(o.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-input text-muted-foreground hover:border-primary hover:text-foreground'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      </div>
    )
  }

  if (field.type === 'number') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Input
          id={field.key}
          type="number"
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          value={value != null ? String(value) : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key}>{field.label}</Label>
      <Input
        id={field.key}
        type="text"
        placeholder={field.placeholder}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  )
}

export function EnrollmentRequestWizard({ data, sportConfig }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  const clubName = data.club.name
  const primaryColor = data.club.primary_color || '#6366f1'

  // Form state
  const [name, setName] = useState(data.user.fullName ?? '')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [techMeta, setTechMeta] = useState<Record<string, unknown>>({})
  const [notes, setNotes] = useState('')

  const updateField = (key: string, val: unknown) => {
    setTechMeta((prev) => ({ ...prev, [key]: val }))
  }

  const isFormValid = name.trim() && phone.trim() && birthDate

  async function handleSubmit() {
    if (!isFormValid) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }

    setLoading(true)
    try {
      await requestEnrollment({
        name,
        phone: phone || undefined,
        birth_date: birthDate || undefined,
        emergency_contact: emergencyContact || undefined,
        emergency_phone: emergencyPhone || undefined,
        technical_meta: techMeta,
        notes: notes || undefined,
      })
      toast.success('Solicitud enviada correctamente')
      startTransition(() => {
        router.refresh()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar solicitud')
    } finally {
      setLoading(false)
    }
  }

  function renderClubHeader() {
    return (
      <div className="flex items-center justify-center gap-3 mb-4">
        {data.club.logo_url ? (
          <Image src={data.club.logo_url} alt={clubName} width={48} height={48} className="rounded-xl object-contain" />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {clubName.charAt(0)}
          </div>
        )}
        <div className="text-left">
          <span className="font-semibold text-lg block">{clubName}</span>
          <span className="text-sm text-muted-foreground">{data.club.sport_type}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          {renderClubHeader()}

          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-blue-100">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold">Solicitud de Inscripción</h2>
            <p className="text-sm text-muted-foreground">
              Completa tus datos para solicitar unirte a <strong>{clubName}</strong>. 
              Tu solicitud será revisada por el equipo técnico.
            </p>
          </div>

          {/* Personal Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" /> Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre completo <span className="text-destructive">*</span></Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Tu nombre completo"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Teléfono <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="phone" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="+56 9 1234 5678" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="birth_date" className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Fecha de nacimiento <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="birth_date" 
                    type="date" 
                    value={birthDate} 
                    onChange={(e) => setBirthDate(e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" /> Contacto de Emergencia
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ec_name">Nombre del contacto</Label>
                <Input 
                  id="ec_name" 
                  value={emergencyContact} 
                  onChange={(e) => setEmergencyContact(e.target.value)} 
                  placeholder="Ej: María Pérez" 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ec_phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Teléfono
                </Label>
                <Input 
                  id="ec_phone" 
                  value={emergencyPhone} 
                  onChange={(e) => setEmergencyPhone(e.target.value)} 
                  placeholder="+56 9 8765 4321" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Sport-specific fields */}
          {sportConfig && sportConfig.fields.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" /> {sportConfig.sectionTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {sportConfig.fields.map((field) => (
                  <div key={field.key}>
                    <SportFieldInput
                      field={field}
                      value={techMeta[field.key] ?? null}
                      onChange={(val) => updateField(field.key, val)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Additional notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="notes">¿Algo que el club deba saber? (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Experiencia previa, lesiones a considerar, disponibilidad horaria..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info box */}
          <Card className="bg-muted/50 border-border">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">¿Qué sigue?</p>
                  <p className="text-muted-foreground mt-1">
                    Una vez enviada tu solicitud, el equipo técnico la revisará. 
                    Recibirás un correo electrónico cuando tu solicitud sea aprobada 
                    para completar el proceso de inscripción.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit button */}
          <Button
            size="lg"
            className="w-full text-white"
            style={{ backgroundColor: primaryColor }}
            onClick={handleSubmit}
            disabled={loading || isPending || !isFormValid}
          >
            {loading || isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Enviar Solicitud
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PendingApprovalScreen({ data }: { data: OnboardingData }) {
  const clubName = data.club.name
  const primaryColor = data.club.primary_color || '#6366f1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            {data.club.logo_url ? (
              <Image src={data.club.logo_url} alt={clubName} width={48} height={48} className="rounded-xl object-contain" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {clubName.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-lg">{clubName}</span>
          </div>

          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-amber-100">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Solicitud en Revisión</h2>
            <p className="text-muted-foreground">
              Tu solicitud de inscripción está siendo revisada por el equipo de <strong style={{ color: primaryColor }}>{clubName}</strong>.
            </p>
          </div>

          <Card className="text-left">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Esperando Aprobación</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    El equipo técnico revisará tu perfil y experiencia. Te notificaremos por correo electrónico cuando haya una respuesta.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Próximo paso</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Una vez aprobada tu solicitud, podrás seleccionar un plan y completar el pago para activar tu membresía.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Puedes cerrar esta página. Te enviaremos un correo cuando tu solicitud sea procesada.
          </p>
        </div>
      </div>
    </div>
  )
}

export function RejectedScreen({ data }: { data: OnboardingData }) {
  const clubName = data.club.name
  const primaryColor = data.club.primary_color || '#6366f1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            {data.club.logo_url ? (
              <Image src={data.club.logo_url} alt={clubName} width={48} height={48} className="rounded-xl object-contain" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {clubName.charAt(0)}
              </div>
            )}
            <span className="font-semibold text-lg">{clubName}</span>
          </div>

          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-red-100">
            <User className="w-10 h-10 text-red-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Solicitud No Aprobada</h2>
            <p className="text-muted-foreground">
              Lamentablemente, tu solicitud de inscripción en <strong style={{ color: primaryColor }}>{clubName}</strong> no fue aprobada en esta oportunidad.
            </p>
          </div>

          <Card className="text-left">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Si tienes preguntas sobre esta decisión, te recomendamos contactar directamente al club para más información.
              </p>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Gracias por tu interés en {clubName}.
          </p>
        </div>
      </div>
    </div>
  )
}
