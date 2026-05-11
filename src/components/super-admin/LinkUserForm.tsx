'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { linkUserToClub, removeUserFromClub } from '@/lib/actions/super-admin'
import { UserPlus, Trash2, Loader2, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  user_id: string
  role: string
  is_active: boolean
}

interface Props {
  clubId: string
  clubSlug: string
  users: User[]
}

const ROLES = [
  { value: 'admin',   label: 'Administrador' },
  { value: 'admin_athlete', label: 'Admin + atleta' },
  { value: 'coach',   label: 'Entrenador' },
]

export function LinkUserForm({ clubId, clubSlug, users }: Props) {
  const router = useRouter()
  const [isPending, start] = useTransition()
  const [clerkId, setClerkId]   = useState('')
  const [role, setRole]         = useState<'admin' | 'admin_athlete' | 'coach'>('admin')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [copied, setCopied]     = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  function handleCopySlug() {
    navigator.clipboard.writeText(clubSlug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleLink(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!clerkId.trim()) { setError('Ingresa el Clerk User ID'); return }
    start(async () => {
      try {
        await linkUserToClub(clubId, clerkId.trim(), role)
        setSuccess(`✅ Usuario vinculado como ${role}`)
        setClerkId('')
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al vincular')
      }
    })
  }

  function handleRemove(userId: string) {
    if (!confirm('¿Remover acceso de este usuario?')) return
    setRemoving(userId)
    start(async () => {
      try {
        await removeUserFromClub(clubId, userId)
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error')
      } finally {
        setRemoving(null)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Acceso al Club
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Slug copy */}
        <div className="p-3 rounded-lg bg-muted/40 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Slug del club — compártelo para que el admin pueda unirse desde el onboarding
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-background border border-border rounded px-2 py-1.5">
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
          <p className="text-[10px] text-muted-foreground mt-1.5">
            El admin se registra en ApexLeap → en el onboarding elige &quot;Unirme a un club&quot; → ingresa este slug.
          </p>
        </div>

        {/* Manual link by Clerk ID */}
        <div>
          <p className="text-xs font-semibold mb-2">Vincular manualmente por Clerk User ID</p>
          <form onSubmit={handleLink} className="space-y-3">
            <div>
              <input
                type="text"
                value={clerkId}
                onChange={(e) => setClerkId(e.target.value)}
                placeholder="user_2abc123..."
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                El usuario lo ve en su perfil de Clerk (esquina superior del dashboard → &quot;Copiar User ID&quot;).
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'admin_athlete' | 'coach')}
                className="h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isPending && !removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Vincular
              </button>
            </div>
            {error   && <p className="text-xs text-destructive">{error}</p>}
            {success && <p className="text-xs text-green-600">{success}</p>}
          </form>
        </div>

        {/* Current users */}
        {users.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">Usuarios vinculados ({users.filter(u => u.is_active).length} activos)</p>
            <div className="space-y-1.5">
              {users.map((u) => (
                <div key={u.user_id} className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${u.is_active ? 'border-border bg-card' : 'border-border/40 bg-muted/30 opacity-60'}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-mono truncate text-muted-foreground">{u.user_id}</p>
                    <span className="text-[10px] font-medium capitalize text-foreground/70">{u.role}{!u.is_active && ' · inactivo'}</span>
                  </div>
                  {u.is_active && (
                    <button
                      onClick={() => handleRemove(u.user_id)}
                      disabled={isPending}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors shrink-0"
                    >
                      {removing === u.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
