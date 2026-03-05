'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteUserToClub, revokeInvitation, removeTeamMember } from '@/lib/actions/team'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, UserPlus, Trash2, Loader2, Copy, Check, Clock, UserCheck, X } from 'lucide-react'

interface Member {
  user_id: string
  role: string
  is_active: boolean
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  accepted_at: string | null
}

interface Props {
  members: Member[]
  invitations: Invitation[]
  clubSlug: string
}

const ROLES = [
  { value: 'admin',   label: 'Administrador' },
  { value: 'coach',   label: 'Entrenador' },
  { value: 'athlete', label: 'Atleta' },
]

const ROLE_COLORS: Record<string, string> = {
  admin:   'bg-primary/10 text-primary',
  coach:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  athlete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  revoked:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired:  'bg-muted text-muted-foreground',
}

export function TeamManager({ members, invitations, clubSlug }: Props) {
  const router = useRouter()
  const [isPending, start] = useTransition()

  const [email, setEmail] = useState('')
  const [role, setRole]   = useState<'admin' | 'coach' | 'athlete'>('admin')
  const [copied, setCopied] = useState(false)
  const [working, setWorking] = useState<string | null>(null)

  function handleCopySlug() {
    navigator.clipboard.writeText(clubSlug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      toast.error('Ingresa un email válido')
      return
    }
    start(async () => {
      try {
        await inviteUserToClub(email.trim().toLowerCase(), role)
        toast.success(`Invitación enviada a ${email}`)
        setEmail('')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al enviar invitación')
      }
    })
  }

  function handleRevoke(invId: string) {
    if (!confirm('¿Revocar esta invitación?')) return
    setWorking(invId)
    start(async () => {
      try {
        await revokeInvitation(invId)
        toast.success('Invitación revocada')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      } finally { setWorking(null) }
    })
  }

  function handleRemove(userId: string) {
    if (!confirm('¿Remover a este miembro del club?')) return
    setWorking(userId)
    start(async () => {
      try {
        await removeTeamMember(userId)
        toast.success('Miembro removido')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error')
      } finally { setWorking(null) }
    })
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending')
  const pastInvitations    = invitations.filter(i => i.status !== 'pending')

  return (
    <div className="space-y-5">

      {/* Invite form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" /> Invitar por email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
                required
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'admin' | 'coach' | 'athlete')}
                className="h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={isPending} className="w-full gap-2">
              {isPending && !working
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <UserPlus className="w-4 h-4" />}
              Enviar invitación
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            El usuario recibirá un email para registrarse. Al hacerlo quedará vinculado automáticamente.
          </p>
        </CardContent>
      </Card>

      {/* Alternatively — join by slug */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            ¿Ya tiene cuenta? Comparte el slug del club para que se una desde el onboarding
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-muted/50 border border-border rounded px-2 py-1.5">
              {clubSlug}
            </code>
            <button
              onClick={handleCopySlug}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-accent transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Active members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Miembros activos ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin miembros aún</p>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-muted-foreground truncate">{m.user_id}</p>
                    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 ${ROLE_COLORS[m.role] ?? 'bg-muted'}`}>
                      {ROLES.find(r => r.value === m.role)?.label ?? m.role}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(m.user_id)}
                    disabled={isPending}
                    title="Remover del club"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors shrink-0"
                  >
                    {working === m.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Invitaciones pendientes ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-card">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[inv.role] ?? 'bg-muted'}`}>
                        {ROLES.find(r => r.value === inv.role)?.label ?? inv.role}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[inv.status]}`}>
                        Pendiente
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    disabled={isPending}
                    title="Revocar invitación"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition-colors shrink-0"
                  >
                    {working === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past invitations */}
      {pastInvitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Historial de invitaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastInvitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20 opacity-70">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{inv.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[inv.role] ?? 'bg-muted'}`}>
                        {ROLES.find(r => r.value === inv.role)?.label ?? inv.role}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${STATUS_COLORS[inv.status]}`}>
                        {inv.status === 'accepted' ? 'Aceptada' : inv.status === 'revoked' ? 'Revocada' : 'Expirada'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
