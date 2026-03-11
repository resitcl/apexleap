'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { SportField } from '@/lib/sport-fields'

interface Props {
  fields: SportField[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function SportSpecificFields({ fields, values, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className={`space-y-1.5 ${field.type === 'multiselect' ? 'sm:col-span-2' : ''}`}>
          <Label htmlFor={`sport-${field.key}`}>
            {field.label}
            {field.required && ' *'}
          </Label>

          {field.type === 'select' && field.options && (
            <select
              id={`sport-${field.key}`}
              value={(values[field.key] as string) ?? ''}
              onChange={(e) => onChange(field.key, e.target.value || null)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Seleccionar...</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {field.type === 'text' && (
            <Input
              id={`sport-${field.key}`}
              value={(values[field.key] as string) ?? ''}
              onChange={(e) => onChange(field.key, e.target.value || null)}
              placeholder={field.placeholder}
            />
          )}

          {field.type === 'number' && (
            <input
              id={`sport-${field.key}`}
              type="number"
              min={field.min}
              max={field.max}
              value={(values[field.key] as number) ?? ''}
              onChange={(e) => onChange(field.key, e.target.value ? Number(e.target.value) : null)}
              placeholder={field.placeholder}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}

          {field.type === 'multiselect' && field.options && (
            <div className="flex flex-wrap gap-2">
              {field.options.map((opt) => {
                const selected = Array.isArray(values[field.key])
                  ? (values[field.key] as string[]).includes(opt.value)
                  : false
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(values[field.key])
                        ? (values[field.key] as string[])
                        : []
                      const next = selected
                        ? current.filter((v) => v !== opt.value)
                        : [...current, opt.value]
                      onChange(field.key, next.length > 0 ? next : null)
                    }}
                    className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-input bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}

          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      ))}
    </div>
  )
}
