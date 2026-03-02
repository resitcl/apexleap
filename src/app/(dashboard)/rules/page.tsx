export const dynamic = "force-dynamic"

import { getRules, getRuleAffectedCounts, getRuleLastTriggerDates } from "@/lib/actions/rules"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react"
import Link from "next/link"
import { ToggleRuleButton } from "@/components/rules/ToggleRuleButton"
import { NewRuleForm } from "@/components/rules/NewRuleForm"
import { ExportRulesButton } from "@/components/rules/ExportRulesButton"

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

function formatCondition(cond: Record<string, unknown>): string {
  const parts: string[] = []
  if (cond.days_overdue !== undefined)    parts.push(`${cond.days_overdue} días vencido`)
  if (cond.grace_days !== undefined)      parts.push(`${cond.grace_days} días de gracia`)
  if (cond.threshold !== undefined)       parts.push(`umbral ${cond.threshold}`)
  if (cond.min_sessions !== undefined)    parts.push(`mín. ${cond.min_sessions} sesiones`)
  if (cond.max_absences !== undefined)    parts.push(`máx. ${cond.max_absences} ausencias`)
  if (cond.absence_days !== undefined)    parts.push(`${cond.absence_days} días sin asistir`)
  if (cond.expiry_days !== undefined)     parts.push(`vence en ${cond.expiry_days} días`)
  if (cond.attendance_rate !== undefined) parts.push(`asistencia < ${cond.attendance_rate}%`)
  return parts.length > 0 ? parts.join(' · ') : ''
}

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function RulesPage({ searchParams }: PageProps) {
  const { type } = await searchParams

  let rules: Awaited<ReturnType<typeof getRules>> = []
  let affected = { financial: 0, discipline: 0, documentation: 0, attendance: 0 }
  let lastTrigger: Awaited<ReturnType<typeof getRuleLastTriggerDates>> = { financial: null, attendance: null, documentation: null, discipline: null }
  let error: string | null = null

  try {
    ;[rules, affected, lastTrigger] = await Promise.all([
      getRules({ type: type || undefined }),
      getRuleAffectedCounts(),
      getRuleLastTriggerDates(),
    ])
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error al cargar reglas'
  }

  const active = rules.filter((r) => r.is_active).length
  const inactive = rules.filter((r) => !r.is_active).length

  const SEVERITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
  type Rule = typeof rules[number]
  const sortedRules = [...rules].sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  )
  const grouped = sortedRules.reduce((acc: Record<string, Rule[]>, r: Rule) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reglas</h1>
          <p className="text-muted-foreground">
            Motor de bloqueos automáticos del club
            {active > 0 && <span className="ml-2 text-green-600 font-medium">· {active} activa{active !== 1 ? 's' : ''}</span>}
            {inactive > 0 && <span className="ml-2 text-muted-foreground/60">· {inactive} inactiva{inactive !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportRulesButton rules={rules.map((r) => ({ ...r, condition: r.condition as Record<string, unknown> }))} affected={affected} />
          <NewRuleForm />
        </div>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {([['', 'Todos', null], ['financial', '💰 Financiero', affected.financial], ['attendance', '📋 Asistencia', affected.attendance], ['discipline', '🛡️ Disciplina', affected.discipline], ['documentation', '📄 Documentación', affected.documentation]] as [string, string, number | null][]).map(([val, lbl, count]) => {
          const isActive = (val === '' && !type) || type === val
          return (
            <Link key={val} href={`/dashboard/rules${val ? `?type=${val}` : ''}`}>
              <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
              }`}>
                {lbl}
                {count !== null && count > 0 && (
                  <span className={`rounded-full text-xs font-bold px-1.5 py-0 leading-4 ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-destructive/15 text-destructive'
                  }`}>{count}</span>
                )}
              </button>
            </Link>
          )
        })}
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
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{typeRules.length} regla{typeRules.length !== 1 ? 's' : ''}</span>
                  {affected[type as keyof typeof affected] > 0 && (
                    <span className="text-xs font-medium bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                      {affected[type as keyof typeof affected]} afectados
                    </span>
                  )}
                  {lastTrigger[type as keyof typeof lastTrigger] && (
                    <span className="text-xs text-muted-foreground/70">
                      · último disparo: {new Date(lastTrigger[type as keyof typeof lastTrigger]!).toLocaleDateString('es-CL')}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {typeRules.map((rule) => {
                    const sev = SEVERITY_CONFIG[rule.severity] ?? SEVERITY_CONFIG.medium
                    const actionIcon = ACTION_ICONS[rule.action as keyof typeof ACTION_ICONS]

                    const typeCount = affected[rule.type as keyof typeof affected] ?? 0
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
                                {rule.is_active && typeCount > 0 && (
                                  <span className="text-xs font-medium bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">
                                    {typeCount} afectado{typeCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {rule.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">{rule.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                <p className="text-xs text-muted-foreground capitalize">
                                  Acción: {rule.action === 'block' ? 'Bloquear acceso' : rule.action === 'warn' ? 'Advertencia' : 'Notificar'}
                                </p>
                                {(() => {
                                  const cond = formatCondition(rule.trigger_condition as Record<string, unknown>)
                                  return cond ? (
                                    <p className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                      {cond}
                                    </p>
                                  ) : null
                                })()}
                                {(rule as { updated_at?: string | null }).updated_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Modificada: {new Date((rule as { updated_at: string }).updated_at).toLocaleDateString('es-CL')}
                                  </p>
                                )}
                              </div>
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
