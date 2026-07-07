'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ToggleLeft, ToggleRight, RotateCcw, Save } from 'lucide-react'
import { saveAutoTemplates } from '@/lib/actions/settings'
import {
  AUTO_TEMPLATE_KEYS,
  AUTO_TEMPLATE_META,
  AUTO_TEMPLATE_DEFAULTS,
  getAutoTemplate,
  type AutoTemplateKey,
  type AutoTemplate,
} from '@/lib/auto-templates'

type FormState = Record<AutoTemplateKey, AutoTemplate>

function toState(saved?: Record<string, unknown> | null): FormState {
  const settings = { auto_templates: saved ?? {} }
  const out = {} as FormState
  for (const key of AUTO_TEMPLATE_KEYS) out[key] = getAutoTemplate(settings, key)
  return out
}

interface Props {
  /** Valor de clubs.settings.auto_templates (crudo). */
  defaultValues?: Record<string, unknown> | null
}

export function AutoTemplatesForm({ defaultValues }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>(() => toState(defaultValues))
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  function set(key: AutoTemplateKey, patch: Partial<AutoTemplate>) {
    setForm((p) => ({ ...p, [key]: { ...p[key], ...patch } }))
  }

  function insertVar(key: AutoTemplateKey, variable: string) {
    const token = `{{${variable}}}`
    const el = bodyRefs.current[key]
    if (!el) {
      set(key, { body: form[key].body + token })
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + token + el.value.slice(end)
    set(key, { body: next })
    // Reposiciona el cursor después del token insertado.
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  function resetToDefault(key: AutoTemplateKey) {
    const def = AUTO_TEMPLATE_DEFAULTS[key]
    set(key, { subject: def.subject, body: def.body })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await saveAutoTemplates(form)
      toast.success('Plantillas automáticas guardadas')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Personaliza el <strong>asunto</strong> y el <strong>texto</strong> de los correos que ApexLeap envía
        automáticamente. El resto del diseño (logo, color de marca, datos del pago y botón) se arma solo.
        Usa las variables entre <code>{'{{ }}'}</code> — se reemplazan por los datos de cada alumno.
      </p>

      {AUTO_TEMPLATE_KEYS.map((key) => {
        const meta = AUTO_TEMPLATE_META[key]
        const t = form[key]
        return (
          <Card key={key}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                  <CardDescription>{meta.trigger}</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => set(key, { enabled: !t.enabled })}
                  className="flex items-center gap-2 text-sm font-medium shrink-0"
                  title={t.enabled ? 'Correo activado' : 'Correo desactivado'}
                >
                  {t.enabled ? (
                    <ToggleRight className="w-6 h-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className={t.enabled ? '' : 'text-muted-foreground'}>
                    {t.enabled ? 'Activado' : 'Desactivado'}
                  </span>
                </button>
              </div>
            </CardHeader>
            <CardContent className={`space-y-3 ${t.enabled ? '' : 'opacity-60'}`}>
              <div className="space-y-1.5">
                <Label htmlFor={`subject-${key}`}>Asunto</Label>
                <Input
                  id={`subject-${key}`}
                  value={t.subject}
                  disabled={!t.enabled}
                  onChange={(e) => set(key, { subject: e.target.value })}
                  placeholder={AUTO_TEMPLATE_DEFAULTS[key].subject}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`body-${key}`}>Mensaje</Label>
                <textarea
                  id={`body-${key}`}
                  ref={(el) => {
                    bodyRefs.current[key] = el
                  }}
                  value={t.body}
                  disabled={!t.enabled}
                  onChange={(e) => set(key, { body: e.target.value })}
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
                  placeholder={AUTO_TEMPLATE_DEFAULTS[key].body}
                />
                <p className="text-[11px] text-muted-foreground">
                  La primera línea se muestra como título. Deja una línea en blanco para separar párrafos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground mr-1">Variables:</span>
                {meta.variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!t.enabled}
                    onClick={() => insertVar(key, v)}
                    className="rounded-md border border-border/60 bg-white/[0.03] px-2 py-1 text-[11px] font-mono hover:bg-white/[0.06] disabled:opacity-50"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => resetToDefault(key)}
                  className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar por defecto
                </button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading} className="gap-2">
          <Save className="w-4 h-4" />
          {loading ? 'Guardando…' : 'Guardar plantillas'}
        </Button>
      </div>
    </form>
  )
}
