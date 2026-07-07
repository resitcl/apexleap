'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Users, Filter, ListChecks, Save, Trash2, Send, Mail, MailX, Loader2 } from 'lucide-react'
import {
  sendBulkMessage, saveMessageTemplate, deleteMessageTemplate,
  type CommunicationsAthlete, type MessageTemplate, type MessageAudience,
} from '@/lib/actions/communications'

interface Props {
  athletes: CommunicationsAthlete[]
  templates: MessageTemplate[]
  plans: { id: string; name: string }[]
  categories: { id: string; name: string }[]
}

type AudienceType = 'all' | 'filter' | 'selection'

const selectCls =
  'h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const VARS = [
  { tag: '{{nombre}}', desc: 'primer nombre' },
  { tag: '{{nombre_completo}}', desc: 'nombre completo' },
  { tag: '{{plan}}', desc: 'plan activo' },
  { tag: '{{deuda}}', desc: 'monto vencido' },
  { tag: '{{club}}', desc: 'nombre del club' },
]

export function CommunicationsClient({ athletes, templates: initialTemplates, plans, categories }: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [templates, setTemplates] = useState<MessageTemplate[]>(initialTemplates)
  const [templateName, setTemplateName] = useState('')

  const [audienceType, setAudienceType] = useState<AudienceType>('all')
  const [fStatus, setFStatus] = useState('')
  const [fSub, setFSub] = useState('')
  const [fPlan, setFPlan] = useState('')
  const [fCat, setFCat] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [sending, setSending] = useState(false)
  const [savingTpl, setSavingTpl] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const recipients = useMemo(() => {
    if (audienceType === 'all') return athletes
    if (audienceType === 'selection') return athletes.filter((a) => selected.has(a.id))
    return athletes.filter((a) => {
      if (fStatus && a.status !== fStatus) return false
      if (fPlan && a.planId !== fPlan) return false
      if (fCat && a.categoryId !== fCat) return false
      if (fSub === 'overdue' && a.debt <= 0) return false
      if (fSub === 'active' && !a.planId) return false
      if (fSub === 'none' && a.planId) return false
      return true
    })
  }, [athletes, audienceType, selected, fStatus, fPlan, fCat, fSub])

  const withEmail = recipients.filter((a) => a.email?.trim())
  const noEmail = recipients.length - withEmail.length

  const selectionList = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return athletes
    return athletes.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q),
    )
  }, [athletes, search])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function buildAudience(): MessageAudience {
    if (audienceType === 'all') return { type: 'all' }
    if (audienceType === 'selection') return { type: 'selection', athleteIds: [...selected] }
    return {
      type: 'filter',
      status: fStatus || null,
      subscriptionStatus: fSub || null,
      planId: fPlan || null,
      categoryId: fCat || null,
    }
  }

  async function handleSend() {
    setConfirmOpen(false)
    setSending(true)
    try {
      const res = await sendBulkMessage({ subject, body, audience: buildAudience() })
      if (res.sent > 0) {
        toast.success(
          `Enviado a ${res.sent} alumno${res.sent > 1 ? 's' : ''}` +
            (res.failed > 0 ? ` · ${res.failed} fallaron` : '') +
            (res.skippedNoEmail > 0 ? ` · ${res.skippedNoEmail} sin email` : ''),
        )
      } else {
        toast.error(res.failed > 0 ? `No se pudo enviar (${res.failed} fallaron)` : 'No hay destinatarios con email')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  function loadTemplate(id: string) {
    const t = templates.find((x) => x.id === id)
    if (!t) return
    setSubject(t.subject)
    setBody(t.body)
    toast.success(`Plantilla "${t.name}" cargada`)
  }

  async function handleSaveTemplate() {
    const name = templateName.trim()
    if (!name) return toast.error('Ponle un nombre a la plantilla')
    if (!subject.trim() && !body.trim()) return toast.error('El mensaje está vacío')
    setSavingTpl(true)
    try {
      const saved = await saveMessageTemplate({ name, subject, body })
      setTemplates((prev) => [...prev.filter((t) => t.id !== saved.id), saved])
      setTemplateName('')
      toast.success('Plantilla guardada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingTpl(false)
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      await deleteMessageTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success('Plantilla eliminada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const canSend = subject.trim().length > 0 && body.trim().length > 0 && withEmail.length > 0 && !sending

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* ── Columna izquierda: mensaje ── */}
      <div className="space-y-6">
        {/* Plantillas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plantillas</CardTitle>
            <CardDescription>Carga una plantilla o guarda el mensaje actual para reutilizarlo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-1 rounded-full border border-input bg-muted/30 pl-3 pr-1 py-1">
                    <button type="button" onClick={() => loadTemplate(t.id)} className="text-xs font-medium hover:text-primary">
                      {t.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive"
                      aria-label={`Eliminar plantilla ${t.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aún no tienes plantillas guardadas.</p>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Nombre para guardar como plantilla…"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="h-9"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleSaveTemplate} disabled={savingTpl} className="gap-1 shrink-0">
                <Save className="w-4 h-4" /> Guardar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mensaje */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mensaje</CardTitle>
            <CardDescription>Puedes usar variables que se reemplazan por cada alumno.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Asunto</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ej: Recordatorio de clase" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Mensaje</Label>
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder={'Hola {{nombre}},\n\nTe escribimos para…'} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {VARS.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => setBody((b) => b + v.tag)}
                  title={v.desc}
                  className="text-[11px] font-mono rounded border border-input bg-muted/40 px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:border-primary/40"
                >
                  {v.tag}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Columna derecha: audiencia + envío ── */}
      <div className="space-y-6 lg:sticky lg:top-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audiencia</CardTitle>
            <CardDescription>¿A quién le llega el mensaje?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'all', label: 'Todos', icon: Users },
                { id: 'filter', label: 'Filtro', icon: Filter },
                { id: 'selection', label: 'Selección', icon: ListChecks },
              ] as const).map((opt) => {
                const active = audienceType === opt.id
                const Icon = opt.icon
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAudienceType(opt.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-colors ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {audienceType === 'filter' && (
              <div className="space-y-2">
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={`${selectCls} w-full`}>
                  <option value="">Cualquier estado</option>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                </select>
                <select value={fSub} onChange={(e) => setFSub(e.target.value)} className={`${selectCls} w-full`}>
                  <option value="">Cualquier suscripción</option>
                  <option value="active">Con plan activo</option>
                  <option value="overdue">Con deuda vencida</option>
                  <option value="none">Sin plan activo</option>
                </select>
                <select value={fPlan} onChange={(e) => setFPlan(e.target.value)} className={`${selectCls} w-full`}>
                  <option value="">Cualquier plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {categories.length > 0 && (
                  <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={`${selectCls} w-full`}>
                    <option value="">Cualquier categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {audienceType === 'selection' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input placeholder="Buscar alumno…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set(athletes.map((a) => a.id)))}>Todos</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())}>Ninguno</Button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-input divide-y divide-border/40">
                  {selectionList.map((a) => (
                    <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30">
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="h-4 w-4 rounded border-input" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{a.name}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{a.email?.trim() || 'sin email'}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">{withEmail.length}</span>
                <span className="text-muted-foreground">recibirán el mensaje</span>
              </div>
              {noEmail > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                  <MailX className="w-3.5 h-3.5" />
                  {noEmail} sin email (no recibirán)
                </div>
              )}
            </div>

            <Button type="button" className="w-full gap-2" disabled={!canSend} onClick={() => setConfirmOpen(true)}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Enviando…' : 'Enviar mensaje'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar el mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Se enviará por correo a <strong>{withEmail.length}</strong> alumno{withEmail.length !== 1 ? 's' : ''}.
              {noEmail > 0 && ` ${noEmail} sin email no lo recibirán.`} Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>Enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
