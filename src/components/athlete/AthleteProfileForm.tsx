'use client'

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, Camera, Contact, Shield, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react"
import type { SportConfig, SportField } from "@/lib/sport-fields"
import { saveAthleteProfileSelf, uploadAthletePhoto } from "@/lib/actions/athlete-enrollment"

interface Props {
  athlete: {
    id: string
    name: string
    email: string | null
    phone: string | null
    birth_date: string | null
    emergency_contact: string | null
    emergency_phone: string | null
    photo_url: string | null
    technical_meta: Record<string, unknown> | null
  }
  sportConfig: SportConfig | null
}

function SportFieldInput({ field, value, onChange }: {
  field: SportField
  value: unknown
  onChange: (val: unknown) => void
}) {
  // If the field is "stripes" (Grados) and it's a number, we can give it that massive green block look.
  const isStripes = field.key === "stripes"

  if (field.type === "select") {
    return (
      <div className="space-y-1.5 flex flex-col justify-end">
        <Label htmlFor={field.key} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
        <select
          id={field.key}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full h-12 rounded-xl border border-white/[0.06] bg-muted/20 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-colors hover:bg-muted/40"
        >
          <option value="">Seleccionar...</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {field.helpText && <p className="text-[10px] text-muted-foreground mt-1">{field.helpText}</p>}
      </div>
    )
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? (value as string[]) : []
    const toggle = (v: string) => {
      if (selected.includes(v)) onChange(selected.filter((s) => s !== v))
      else onChange([...selected, v])
    }
    return (
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{field.label}</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {field.options?.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                selected.includes(o.value)
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                  : "bg-muted/20 border-white/[0.06] text-muted-foreground hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {field.helpText && <p className="text-[10px] text-muted-foreground mt-1">{field.helpText}</p>}
      </div>
    )
  }

  if (field.type === "number") {
    return (
      <div className="space-y-1.5 flex flex-col justify-end">
        <Label htmlFor={field.key} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{field.label}</Label>
        <Input
          id={field.key}
          type="number"
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          value={value != null ? String(value) : ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className={`h-12 rounded-xl border-white/[0.06] font-black focus-visible:ring-primary/50 transition-colors ${
            isStripes ? 'bg-primary text-primary-foreground placeholder:text-primary-foreground/50 text-center text-xl shadow-[0_4px_20px_rgba(var(--primary),0.2)]' : 'bg-muted/20 text-base hover:bg-muted/40'
          }`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-1.5 flex flex-col justify-end">
      <Label htmlFor={field.key} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{field.label}</Label>
      <Input
        id={field.key}
        type="text"
        placeholder={field.placeholder}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-12 rounded-xl bg-muted/20 border-white/[0.06] font-semibold focus-visible:ring-primary/50 hover:bg-muted/40 transition-colors"
      />
    </div>
  )
}

export function AthleteProfileForm({ athlete, sportConfig }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(athlete.photo_url ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(athlete.name ?? "")
  const [phone, setPhone] = useState(athlete.phone ?? "")
  const [birthDate, setBirthDate] = useState(athlete.birth_date ?? "")
  const [emergencyContact, setEmergencyContact] = useState(athlete.emergency_contact ?? "")
  const [emergencyPhone, setEmergencyPhone] = useState(athlete.emergency_phone ?? "")
  const [techMeta, setTechMeta] = useState<Record<string, unknown>>(athlete.technical_meta ?? {})

  const updateField = (key: string, val: unknown) => {
    setTechMeta((prev) => ({ ...prev, [key]: val }))
  }

  // Determine an athlete ID stub for visual purposes
  const athleteIdString = `KP-${athlete.id.slice(0, 4).toUpperCase()}-WS`

  const handleSubmit = async () => {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await saveAthleteProfileSelf({
          name,
          phone: phone || undefined,
          birth_date: birthDate || undefined,
          emergency_contact: emergencyContact || undefined,
          emergency_phone: emergencyPhone || undefined,
          technical_meta: techMeta,
        })
        setSuccess(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar")
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Solo se permiten imágenes'); return }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5 MB'); return }
    setError(null)
    setPhotoUploading(true)
    try {
      const preview = URL.createObjectURL(file)
      setPhotoPreview(preview)
      const formData = new FormData()
      formData.append('file', file)
      await uploadAthletePhoto(formData)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto')
      setPhotoPreview(athlete.photo_url ?? null)
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleDiscard = () => {
    // Reset to initial
    setName(athlete.name ?? "")
    setPhone(athlete.phone ?? "")
    setBirthDate(athlete.birth_date ?? "")
    setEmergencyContact(athlete.emergency_contact ?? "")
    setEmergencyPhone(athlete.emergency_phone ?? "")
    setTechMeta(athlete.technical_meta ?? {})
    setPhotoPreview(athlete.photo_url ?? null)
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="w-full">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-5xl lg:text-[56px] font-black tracking-tighter uppercase leading-[0.9] text-foreground">
            Mi Perfil
          </h1>
          <p className="text-base text-muted-foreground/80 mt-3 font-medium">
            Actualiza tus credenciales atléticas y métricas personales de contacto.
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full lg:w-auto mt-4 lg:mt-0">
          <button 
            type="button" 
            onClick={handleDiscard}
            disabled={isPending}
            className="flex-1 lg:flex-none px-6 py-3.5 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Descartar
          </button>
          
          <Button 
            onClick={handleSubmit}
            disabled={isPending || !name.trim()} 
            className="flex-1 lg:flex-none h-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:bg-primary/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none"
          >
            {isPending ? "Configurando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {success && (
        <div className="mb-8 text-sm font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" /> Perfil actualizado correctamente.
        </div>
      )}
      {error && (
        <div className="mb-8 text-sm font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* GRID LAYOUT */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* LEFT CARD: AVATAR / ATHLETE ID */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl border-white/[0.04] bg-[#111111] shadow-xl overflow-hidden h-full flex flex-col items-center justify-center p-8 relative">

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />

            <div className="relative group mb-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="w-40 h-40 rounded-3xl bg-muted/20 border-2 border-white/[0.05] overflow-hidden flex flex-col items-center justify-center transition-all group-hover:border-primary/50 relative disabled:opacity-70"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Foto de perfil" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
              {photoUploading && (
                <div className="absolute inset-0 rounded-3xl flex items-center justify-center bg-black/50">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
            </div>

            <div className="text-center mt-2 space-y-1">
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/50">Athlete ID</p>
              <p className="text-sm font-black text-foreground tracking-widest">{athleteIdString}</p>
              <p className="text-[10px] text-muted-foreground/40 mt-2">Haz clic en la foto para cambiarla</p>
            </div>
          </Card>
        </div>

        {/* RIGHT CARD: PERSONAL INFORMATION */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-white/[0.04] bg-[#1a1a1c] shadow-md p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-8">
              <Contact className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-black uppercase tracking-widest text-foreground">Información Personal</h2>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Nombre completo <span className="text-destructive">*</span></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-12 rounded-xl bg-background/50 border-white/[0.06] font-semibold text-foreground focus-visible:ring-primary/50 transition-colors" />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={athlete.email ?? ""}
                  readOnly
                  disabled
                  className="h-12 rounded-xl bg-background/30 border-white/[0.04] font-semibold text-muted-foreground/60 cursor-not-allowed"
                />
                <p className="text-[10px] text-muted-foreground/40">El email es gestionado por tu cuenta. Para cambiarlo, contacta al soporte.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Télefono Personal</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" className="h-12 rounded-xl bg-background/50 border-white/[0.06] font-semibold text-foreground focus-visible:ring-primary/50 transition-colors" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birth_date" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Día de Nacimiento</Label>
                <Input id="birth_date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="h-12 rounded-xl bg-background/50 border-white/[0.06] font-semibold text-muted-foreground focus-visible:ring-primary/50 transition-colors" />
              </div>
            </div>
            
            <div className="mt-10 mb-8 border-t border-white/[0.04]" />
            
            <div className="flex items-center gap-3 mb-8">
              <Shield className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-black uppercase tracking-widest text-foreground">Contacto de Emergencia</h2>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="ec_name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Nombre del contacto</Label>
                <Input id="ec_name" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Ej: María Pérez" className="h-12 rounded-xl bg-background/50 border-white/[0.06] font-semibold text-foreground focus-visible:ring-primary/50 transition-colors" />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="ec_phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Télefono de emergencia</Label>
                <Input id="ec_phone" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+56 9 8765 4321" className="h-12 rounded-xl bg-background/50 border-white/[0.06] font-semibold text-foreground focus-visible:ring-primary/50 transition-colors" />
              </div>
            </div>
          </Card>
        </div>

        {/* BOTTOM CARD: MARTIAL ARTS DETAILS */}
        {sportConfig && sportConfig.fields.length > 0 && (
          <div className="lg:col-span-3">
            <Card className="rounded-2xl border-white/[0.04] bg-[#1a1a1c] shadow-md p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-10">
                <span className="text-xl leading-none">🥋</span>
                <h2 className="text-lg font-black uppercase tracking-widest text-foreground">{sportConfig.sectionTitle}</h2>
                <Badge className="ml-2 text-[9px] uppercase tracking-widest bg-white/5 text-muted-foreground hover:bg-white/10 pointer-events-none border-white/10">Sports Data</Badge>
              </div>
              
              <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 items-end">
                {sportConfig.fields.map((field) => (
                  <div key={field.key} className={field.type === "multiselect" ? "sm:col-span-2 md:col-span-3 xl:col-span-4" : ""}>
                    <SportFieldInput
                      field={field}
                      value={techMeta[field.key] ?? null}
                      onChange={(val) => updateField(field.key, val)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
