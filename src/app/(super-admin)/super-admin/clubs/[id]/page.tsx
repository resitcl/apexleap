export const dynamic = "force-dynamic"

import Link from "next/link"
import { notFound } from "next/navigation"
import { getClubDetail, getSaasPlans } from "@/lib/actions/super-admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Users, UserCheck, DollarSign,
  CheckCircle2, XCircle, Activity, FileText,
} from "lucide-react"
import { ClubToggleButton } from "@/components/super-admin/ClubToggleButton"
import { UpdateSaasSubForm } from "@/components/super-admin/UpdateSaasSubForm"
import { ClubNotesForm } from "@/components/super-admin/ClubNotesForm"
import { LinkUserForm } from "@/components/super-admin/LinkUserForm"

const SAAS_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Activo",    variant: "default" },
  trialing:  { label: "Trial",     variant: "secondary" },
  past_due:  { label: "Vencido",   variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
  paused:    { label: "Pausado",   variant: "outline" },
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function SuperAdminClubDetailPage({ params }: Props) {
  const { id } = await params

  let detail: Awaited<ReturnType<typeof getClubDetail>>
  let saasPlans: Awaited<ReturnType<typeof getSaasPlans>>

  try {
    ;[detail, saasPlans] = await Promise.all([
      getClubDetail(id),
      getSaasPlans(),
    ])
  } catch {
    notFound()
  }

  const { club, users, athletes, saas_sub, billing, stats } = detail
  type UserRow = { user_id: string; role: string; is_active: boolean }
  const usersTyped: UserRow[] = (users ?? []) as UserRow[]

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n)

  const subPlan = (saas_sub as { saas_plans?: { id: string; name: string; price_monthly: number; features: string[] } | null } | null)?.saas_plans
  const subStatus = (saas_sub as { status?: string } | null)?.status ?? ""
  const subMeta = SAAS_STATUS[subStatus]

  return (
    <div className="space-y-4 pb-12 pt-1">
      {/* ── GREETING ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/super-admin/clubs"
            className="inline-flex items-center gap-1 text-[13px] text-muted-foreground/70 hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Todos los clubes
          </Link>
          <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tighter">
            Club: <span className="text-primary">{club.name.split(' ')[0]}.</span>
          </h1>
          <p className="text-[15px] text-muted-foreground/70 font-normal mt-2 leading-relaxed">
            {(club as { sport_type?: string }).sport_type ?? "Sin deporte"} ·{" "}
            {(club as { city?: string }).city ?? "Sin ciudad"} · Creado {new Date(club.created_at).toLocaleDateString("es-CL")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {club.is_active ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
              <CheckCircle2 className="w-4 h-4" /> Activo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-zinc-400">
              <XCircle className="w-4 h-4" /> Inactivo
            </span>
          )}
          <ClubToggleButton clubId={id} isActive={club.is_active} clubName={club.name} />
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        <div className="rounded-2xl bg-card p-5 h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <Users className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Atletas</p>
          </div>
          <p className="text-4xl font-black tracking-tight text-primary leading-none">{stats.total_athletes}</p>
          <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">{stats.active_athletes} activos</p>
        </div>

        <div className="rounded-2xl bg-card p-5 h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <UserCheck className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Usuarios</p>
          </div>
          <p className="text-4xl font-black tracking-tight text-foreground leading-none">{stats.total_users}</p>
          <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">en user_clubs</p>
        </div>

        <div className="rounded-2xl bg-card p-5 h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <DollarSign className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Ingresos</p>
          </div>
          <p className="text-4xl font-black tracking-tight text-primary leading-none">{fmt(stats.total_revenue)}</p>
          <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">pagos registrados</p>
        </div>

        <div className="rounded-2xl bg-card p-5 h-full">
          <div className="flex items-center gap-2.5 mb-5">
            <Activity className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">Plan SaaS</p>
          </div>
          <p className={`text-[22px] font-black tracking-tight leading-none uppercase ${
            subStatus === 'active' ? 'text-primary' :
            subStatus === 'past_due' || subStatus === 'cancelled' ? 'text-red-500' : 'text-amber-500'
          }`}>
            {subPlan?.name ?? 'Sin plan'}
          </p>
          <p className="text-[13px] text-muted-foreground/50 mt-2 font-normal">{subMeta?.label ?? '—'}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_340px] items-start">
        {/* Left column */}
        <div className="space-y-3">

          {/* Club info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información del Club</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Slug",    (club as { slug?: string }).slug],
                ["Email",   (club as { email?: string }).email],
                ["Teléfono",(club as { phone?: string }).phone],
                ["País",    (club as { country?: string }).country],
                ["Timezone",(club as { timezone?: string }).timezone],
              ].map(([label, value]) =>
                value ? (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right truncate">{value}</span>
                  </div>
                ) : null
              )}
              {(club as { description?: string }).description && (
                <p className="text-muted-foreground text-xs pt-1 border-t border-border">
                  {(club as { description?: string }).description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuarios del Club ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin usuarios vinculados</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                      <div>
                        <p className="text-sm font-mono font-medium truncate max-w-[200px]">{u.user_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{u.role}</Badge>
                        {u.is_active ? (
                          <span className="text-[10px] text-green-600 font-medium">Activo</span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Inactivo</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Link / Manage Users */}
          <LinkUserForm
            clubId={id}
            clubSlug={(club as { slug: string }).slug}
            users={usersTyped}
          />

          {/* Internal notes */}
          <ClubNotesForm clubId={id} currentNotes={(club as { notes?: string | null }).notes ?? ""} />
        </div>

        {/* Right column */}
        <div className="space-y-3">

          {/* SaaS Subscription */}
          <UpdateSaasSubForm
            clubId={id}
            saasPlans={saasPlans}
            currentSub={saas_sub as {
              saas_plan_id?: string
              status?: string
              billing_cycle?: string
              notes?: string
              current_period_end?: string
              trial_ends_at?: string
            } | null}
          />

          {/* Billing History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Historial de Facturación SaaS
              </CardTitle>
            </CardHeader>
            <CardContent>
              {billing.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin registros de facturación</p>
              ) : (
                <div className="space-y-2">
                  {billing.map((b) => {
                    const paid = b.status === "paid"
                    const failed = b.status === "failed"
                    return (
                      <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0 border-border">
                        <div>
                          <p className="text-sm font-medium">
                            {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(b.amount))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(b.billing_date).toLocaleDateString("es-CL")}
                            {b.paid_at && ` · Pagado ${new Date(b.paid_at).toLocaleDateString("es-CL")}`}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          paid   ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          failed ? "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400"   :
                                   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {paid ? "Pagado" : failed ? "Fallido" : "Pendiente"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Athletes quick list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Atletas ({athletes.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {athletes.slice(0, 20).map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0 border-border">
                    <span className="truncate">{a.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.category && (
                        <span className="text-[10px] text-muted-foreground">{a.category}</span>
                      )}
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        a.health_status === "injured"     ? "bg-red-500" :
                        a.health_status === "observation" ? "bg-yellow-500" : "bg-green-500"
                      }`} />
                      <span className={`text-[10px] font-medium ${
                        a.status === "active" ? "text-green-600" :
                        a.status === "inactive" ? "text-zinc-400" : "text-red-500"
                      }`}>{a.status}</span>
                    </div>
                  </div>
                ))}
                {athletes.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{athletes.length - 20} más
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
