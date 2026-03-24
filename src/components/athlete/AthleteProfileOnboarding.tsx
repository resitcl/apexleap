'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  User, Phone, Calendar, Shield, ArrowRight, ArrowLeft,
  CheckCircle, Loader2, Sparkles,
} from 'lucide-react'
import { saveAthleteProfileSelf } from '@/lib/actions/athlete-enrollment'
import type { OnboardingData } from '@/lib/actions/athlete-enrollment'
import type { SportConfig, SportField } from '@/lib/sport-fields'

interface Props {
  data: OnboardingData
  sportConfig: SportConfig | null
  onComplete: () => void
}

type Step = 'personal' | 'sport' | 'review'

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

export function AthleteProfileOnboarding({ data, sportConfig, onComplete }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('personal')
  const [loading, setLoading] = useState(false)

  const clubName = data.club.name
  const primaryColor = data.club.primary_color || '#6366f1'

  // Form state
  const [name, setName] = useState(data.athlete?.name ?? data.user.fullName ?? '')
  const [phone, setPhone] = useState(data.athlete?.phone ?? '')
  const [birthDate, setBirthDate] = useState(data.athlete?.birth_date ?? '')
  const [emergencyContact, setEmergencyContact] = useState(data.athlete?.emergency_contact ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(data.athlete?.emergency_phone ?? '')
  const [techMeta, setTechMeta] = useState<Record<string, unknown>>(data.athlete?.technical_meta ?? {})

  const updateField = (key: string, val: unknown) => {
    setTechMeta((prev) => ({ ...prev, [key]: val }))
  }

  const isPersonalComplete = name.trim() && phone.trim() && birthDate
  const hasSportFields = sportConfig && sportConfig.fields.length > 0

  async function handleSave() {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setLoading(true)
    try {
      await saveAthleteProfileSelf({
        name,
        phone: phone || undefined,
        birth_date: birthDate || undefined,
        emergency_contact: emergencyContact || undefined,
        emergency_phone: emergencyPhone || undefined,
        technical_meta: techMeta,
      })
      toast.success('Perfil guardado correctamente')
      startTransition(() => {
        router.refresh()
        onComplete()
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  function renderProgressBar() {
    const steps = hasSportFields 
      ? ['Datos Personales', sportConfig?.sectionTitle ?? 'Disciplina', 'Confirmación']
      : ['Datos Personales', 'Confirmación']
    const stepMap: Record<Step, number> = { personal: 0, sport: 1, review: hasSportFields ? 2 : 1 }
    const currentIndex = stepMap[step]

    return (
      <div className="flex items-center justify-center gap-1 mb-8">
        {steps.map((label, i) => {
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
                <span className={`text-[10px] font-medium max-w-[80px] text-center leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mb-4 ${i < currentIndex ? 'bg-green-500' : 'bg-muted'}`} />
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

  function renderPersonalStep() {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {renderClubHeader()}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-primary/10">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">¡Bienvenido, {data.user.fullName?.split(' ')[0] || 'Atleta'}!</h2>
          <p className="text-sm text-muted-foreground">
            Completa tu perfil para comenzar tu experiencia en {clubName}
          </p>
        </div>

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

        <div className="flex justify-end">
          <Button
            size="lg"
            style={{ backgroundColor: primaryColor }}
            onClick={() => hasSportFields ? setStep('sport') : setStep('review')}
            disabled={!isPersonalComplete}
            className="min-w-[200px] text-white"
          >
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  function renderSportStep() {
    if (!sportConfig) return null

    return (
      <div className="max-w-lg mx-auto space-y-6">
        {renderClubHeader()}
        <div className="text-center space-y-2">
          <Badge variant="secondary" className="text-sm">{sportConfig.label}</Badge>
          <h2 className="text-2xl font-bold">{sportConfig.sectionTitle}</h2>
          <p className="text-sm text-muted-foreground">
            Esta información nos ayuda a personalizar tu experiencia
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            {sportConfig.fields.map((field) => (
              <div key={field.key} className={field.type === 'multiselect' ? '' : ''}>
                <SportFieldInput
                  field={field}
                  value={techMeta[field.key] ?? null}
                  onChange={(val) => updateField(field.key, val)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('personal')} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" /> Atrás
          </Button>
          <Button
            className="flex-1 text-white"
            style={{ backgroundColor: primaryColor }}
            onClick={() => setStep('review')}
          >
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  function renderReviewStep() {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        {renderClubHeader()}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-green-100">
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">¡Casi listo!</h2>
          <p className="text-sm text-muted-foreground">
            Revisa tu información antes de continuar
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumen de tu perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm py-2 border-b">
              <span className="text-muted-foreground">Nombre</span>
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b">
              <span className="text-muted-foreground">Teléfono</span>
              <span className="font-medium">{phone || '—'}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b">
              <span className="text-muted-foreground">Fecha de nacimiento</span>
              <span className="font-medium">
                {birthDate ? new Date(birthDate + 'T12:00:00').toLocaleDateString('es-CL') : '—'}
              </span>
            </div>
            {emergencyContact && (
              <div className="flex justify-between text-sm py-2 border-b">
                <span className="text-muted-foreground">Contacto de emergencia</span>
                <span className="font-medium">{emergencyContact}</span>
              </div>
            )}
            {sportConfig && Object.keys(techMeta).length > 0 && (
              <>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{sportConfig.label}</p>
                </div>
                {sportConfig.fields.map((field) => {
                  const val = techMeta[field.key]
                  if (!val) return null
                  let displayVal = String(val)
                  if (field.type === 'select' && field.options) {
                    displayVal = field.options.find(o => o.value === val)?.label ?? String(val)
                  }
                  if (field.type === 'multiselect' && Array.isArray(val)) {
                    displayVal = (val as string[]).map(v => 
                      field.options?.find(o => o.value === v)?.label ?? v
                    ).join(', ')
                  }
                  return (
                    <div key={field.key} className="flex justify-between text-sm py-2 border-b">
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="font-medium text-right max-w-[60%]">{displayVal}</span>
                    </div>
                  )
                })}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => hasSportFields ? setStep('sport') : setStep('personal')} 
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button
            className="flex-1 text-white"
            style={{ backgroundColor: primaryColor }}
            onClick={handleSave}
            disabled={loading || isPending}
          >
            {loading || isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Guardando...</>
            ) : (
              <>Confirmar y Continuar <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />
      <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto px-4 py-8">
        {renderProgressBar()}
        {step === 'personal' && renderPersonalStep()}
        {step === 'sport' && renderSportStep()}
        {step === 'review' && renderReviewStep()}
      </div>
    </div>
  )
}
