export const dynamic = "force-dynamic"

import Link from "next/link"
import { getAllClubs } from "@/lib/actions/super-admin"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, XCircle, Users, Building2, ChevronRight } from "lucide-react"
import { ClubToggleButton } from "@/components/super-admin/ClubToggleButton"
import { ClubImportExport } from "@/components/super-admin/ClubImportExport"

const SAAS_STATUS: Record<string, { label: string; color: string }> = {
  active:   { label: "Activo",    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  trialing: { label: "Trial",     color: "bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400" },
  past_due: { label: "Vencido",   color: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400" },
  cancelled:{ label: "Cancelado", color: "bg-zinc-100  text-zinc-600  dark:bg-zinc-800     dark:text-zinc-400" },
  paused:   { label: "Pausado",   color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
}

export default async function SuperAdminClubsPage() {
  const clubs = await getAllClubs()

  const active   = clubs.filter((c) => c.is_active)
  const inactive = clubs.filter((c) => !c.is_active)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Clubes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {clubs.length} club{clubs.length !== 1 ? "s" : ""} registrados ·{" "}
            {active.length} activos · {inactive.length} inactivos
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> {active.length} activos
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm font-medium">
            <XCircle className="w-3.5 h-3.5" /> {inactive.length} inactivos
          </span>
        </div>
      </div>

      {/* Import / Export */}
      <ClubImportExport />

      {/* Clubs grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {clubs.map((club) => {
          const sub = club.saas_sub as {
            status: string
            billing_cycle: string
            current_period_end: string | null
            trial_ends_at: string | null
            saas_plans: { name: string; price_monthly: number } | null
          } | null
          const subMeta = sub ? (SAAS_STATUS[sub.status] ?? null) : null

          return (
            <Card
              key={club.id}
              className={`transition-all ${!club.is_active ? "opacity-60" : ""}`}
            >
              <CardContent className="p-4 space-y-3">
                {/* Club header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: club.primary_color ?? "#6366f1" }}
                    >
                      {club.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight truncate">{club.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {club.sport_type ?? "Sin deporte"} · {club.city ?? "Sin ciudad"}
                      </p>
                    </div>
                  </div>
                  {club.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 shrink-0">
                      <XCircle className="w-3.5 h-3.5" /> Inactivo
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <strong className="text-foreground">{club.athlete_count}</strong> atletas
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <strong className="text-foreground">{club.user_count}</strong> usuarios
                  </span>
                </div>

                {/* SaaS plan */}
                <div className="flex items-center justify-between">
                  {sub?.saas_plans ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{sub.saas_plans.name}</span>
                      {subMeta && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${subMeta.color}`}>
                          {subMeta.label}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin plan SaaS</span>
                  )}
                  {sub?.current_period_end && (
                    <span className="text-[10px] text-muted-foreground">
                      Vence {new Date(sub.current_period_end).toLocaleDateString("es-CL")}
                    </span>
                  )}
                  {sub?.trial_ends_at && sub.status === "trialing" && (
                    <span className="text-[10px] text-blue-500 font-medium">
                      Trial hasta {new Date(sub.trial_ends_at).toLocaleDateString("es-CL")}
                    </span>
                  )}
                </div>

                {/* Contact */}
                {club.email && (
                  <p className="text-xs text-muted-foreground truncate">{club.email}</p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Link
                    href={`/super-admin/clubs/${club.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1 h-8 rounded-lg border border-border text-xs font-medium hover:bg-accent transition-colors"
                  >
                    Ver detalle <ChevronRight className="w-3 h-3" />
                  </Link>
                  <ClubToggleButton
                    clubId={club.id}
                    isActive={club.is_active}
                    clubName={club.name}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {clubs.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <h3 className="font-semibold text-lg mb-1">Sin clubes registrados</h3>
            <p className="text-muted-foreground text-sm">
              Ejecuta la migración 016 en Supabase para crear los clubes de prueba.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
