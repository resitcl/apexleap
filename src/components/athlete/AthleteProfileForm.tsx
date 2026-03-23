'use client'

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Save, User, Phone, Calendar, AlertTriangle, Shield, ChevronDown, ChevronUp } from "lucide-react"
import type { SportConfig, SportField } from "@/lib/sport-fields"
import { saveAthleteProfileSelf } from "@/lib/actions/athlete-enrollment"

interface Props {
  athlete: {
    id: string
    name: string
    phone: string | null
    birth_date: string | null
    emergency_contact: string | null
    emergency_phone: string | null
    technical_meta: Record<string, unknown> | null
  }
  sportConfig: SportConfig | null
}

function SportFieldInput({ field, value, onChange }: {
  field: SportField
  value: unknown
  onChange: (val: unknown) => void
}) {
  if (field.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
        <select
          id={field.key}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? (value as string[]) : []
    const toggle = (v: string) => {
      if (selected.includes(v)) onChange(selected.filter((s) => s !== v))
      else onChange([...selected, v])
    }
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selected.includes(o.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-input text-muted-foreground hover:border-primary hover:text-foreground"
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

  if (field.type === "number") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Input
          id={field.key}
          type="number"
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          value={value != null ? String(value) : ""}
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
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  )
}

export function AthleteProfileForm({ athlete, sportConfig }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sportOpen, setSportOpen] = useState(true)

  const [name, setName] = useState(athlete.name ?? "")
  const [phone, setPhone] = useState(athlete.phone ?? "")
  const [birthDate, setBirthDate] = useState(athlete.birth_date ?? "")
  const [emergencyContact, setEmergencyContact] = useState(athlete.emergency_contact ?? "")
  const [emergencyPhone, setEmergencyPhone] = useState(athlete.emergency_phone ?? "")
  const [techMeta, setTechMeta] = useState<Record<string, unknown>>(athlete.technical_meta ?? {})

  const updateField = (key: string, val: unknown) => {
    setTechMeta((prev) => ({ ...prev, [key]: val }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" /> Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Nombre completo <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Teléfono
            </Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 1234 5678" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birth_date" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Fecha de nacimiento
            </Label>
            <Input id="birth_date" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Emergency contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Contacto de Emergencia
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ec_name">Nombre del contacto</Label>
            <Input id="ec_name" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Ej: María Pérez" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec_phone" className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Teléfono
            </Label>
            <Input id="ec_phone" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+56 9 8765 4321" />
          </div>
        </CardContent>
      </Card>

      {/* Sport-specific fields */}
      {sportConfig && sportConfig.fields.length > 0 && (
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer select-none"
            onClick={() => setSportOpen((p) => !p)}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                {sportConfig.sectionTitle}
                <Badge variant="secondary" className="text-xs">Disciplina</Badge>
              </span>
              {sportOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
          {sportOpen && (
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {sportConfig.fields.map((field) => (
                <div key={field.key} className={field.type === "multiselect" ? "sm:col-span-2" : ""}>
                  <SportFieldInput
                    field={field}
                    value={techMeta[field.key] ?? null}
                    onChange={(val) => updateField(field.key, val)}
                  />
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md px-4 py-3">
          ✓ Perfil actualizado correctamente.
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isPending || !name.trim()} className="w-full sm:w-auto gap-2">
        <Save className="w-4 h-4" />
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  )
}
