export const dynamic = "force-dynamic"

import { getRules } from "@/lib/actions/rules"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react"
import { ToggleRuleButton } from "@/components/rules/ToggleRuleButton"
import { NewRuleForm } from "@/components/rules/NewRuleForm"

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  financial:     { label: 'Financiero',   color: 'bg-green-100 text-green-700' },
  attendance:    { label: 'Asistencia',   color: 'bg-blue-100 text-blue-700' },
  discipline:    { label: 'Disciplina',   color: 'bg-purple-100 text-purple-700' },
  documentation: { label: 'Documentación',color: 'bg-orange-100 text-orange-700' },
}

const SEVERITY_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  high:   { label: 'Alta',  variant: 'destructive' },
  medium: { label: 'Media', variant: 'default' },
  low:    { label: 'Baja',  variant: 'secondary' },
}

const ACTION_ICONS = {
  block:  <ShieldOff  className="w-4 h-4 text-red-500" />,
  warn:   <ShieldAlert className="w-4 h-4 text-yellow-500" />,
  notify: <ShieldCheck className="w-4 h-4 text-blue-500" />,
}

export default async function RulesPage() {
  let rules: Awaited<ReturnType<typeof getRules>> = []
  let error: string | null = null

  try {
    rules = await getRules()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error al cargar reglas'
  }

  const active = rules.filter((r) => r.is_active).length
  const inactive = rules.filter((r) => !r.is_active).length

  type Rule = typeof rules[number]
  const grouped = rules.reduce((acc: Record<string, Rule[]>, r: Rule) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reglas</h1>
          <p className="text-muted-foreground">Motor de bloqueos automáticos del club</p>
        </div>
        <NewRuleForm />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{active}</p>
                <p className="text-xs text-muted-foreground">Reglas activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldOff className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{inactive}</p>
                <p className="text-xs text-muted-foreground">Reglas desactivadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{rules.length}</p>
                <p className="text-xs text-muted-foreground">Total configuradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
        </Card>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="font-medium">Sin reglas configuradas</p>
            <p className="text-sm mt-1">Las reglas por defecto se crean al registrar el club</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
            const typeRules = grouped[type] ?? []
            if (typeRules.length === 0) return null

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{typeRules.length} regla{typeRules.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {typeRules.map((rule) => {
                    const sev = SEVERITY_CONFIG[rule.severity] ?? SEVERITY_CONFIG.medium
                    const actionIcon = ACTION_ICONS[rule.action as keyof typeof ACTION_ICONS]

                    return (
                      <Card key={rule.id} className={rule.is_active ? '' : 'opacity-60'}>
                        <CardContent className="py-4">
                          <div className="flex items-center gap-4">
                            <div className="shrink-0">{actionIcon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{rule.name}</span>
                                <Badge variant={sev.variant} className="text-xs">{sev.label}</Badge>
                                {!rule.is_active && <Badge variant="outline" className="text-xs">Inactiva</Badge>}
                              </div>
                              {rule.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">{rule.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1 capitalize">
                                Acción: {rule.action === 'block' ? 'Bloquear acceso' : rule.action === 'warn' ? 'Advertencia' : 'Notificar'}
                              </p>
                            </div>
                            <ToggleRuleButton ruleId={rule.id} isActive={rule.is_active} />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
