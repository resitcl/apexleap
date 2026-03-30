export const dynamic = "force-dynamic"

import Link from "next/link"
import { getClubSettings } from "@/lib/actions/settings"
import { getCategories } from "@/lib/actions/categories"
import { ClubSettingsForm } from "@/components/settings/ClubSettingsForm"
import { DeleteClubButton } from "@/components/settings/DeleteClubButton"
import { CategoriesManager } from "@/components/settings/CategoriesManager"
import { BankInfoForm } from "@/components/settings/BankInfoForm"
import { Settings, AlertTriangle, Calendar, CreditCard, Tag, Cog, ChevronRight } from "lucide-react"
import {
  DashboardPage,
  DashboardPageHeader,
  DashboardEmptyState,
  DashboardSectionCard,
} from "@/components/ui/dashboard-kit"

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const { tab = "general" } = await searchParams

  let club = null
  let error: string | null = null
  let categories: Awaited<ReturnType<typeof getCategories>> = []

  try {
    club = await getClubSettings()
  } catch (e) {
    error = e instanceof Error ? e.message : "Error al cargar configuración"
  }

  try {
    categories = await getCategories()
  } catch { /* silent */ }

  if (error) {
    return (
      <DashboardPage className="max-w-3xl mx-auto">
        <DashboardPageHeader
          icon={<Settings className="w-10 h-10" />}
          title="Configuración"
          subtitle="Personaliza tu club en ApexLeap"
        />
        <DashboardEmptyState
          icon={<Settings className="w-8 h-8" />}
          title="Sin acceso"
          description={error}
        />
      </DashboardPage>
    )
  }

  const TABS = [
    { key: "general", label: "General", icon: <Cog className="w-4 h-4" /> },
    { key: "payments", label: "Pagos", icon: <CreditCard className="w-4 h-4" /> },
    { key: "categories", label: "Categorías", icon: <Tag className="w-4 h-4" /> },
    { key: "seasons", label: "Temporadas", icon: <Calendar className="w-4 h-4" />, href: "/dashboard/settings/seasons" },
    { key: "danger", label: "Zona de Peligro", icon: <AlertTriangle className="w-4 h-4" />, danger: true },
  ]

  return (
    <DashboardPage className="max-w-3xl mx-auto">
      {/* ── PREMIUM HEADER ── */}
      <DashboardPageHeader
        icon={<Settings className="w-10 h-10" />}
        title="Configuración"
        subtitle={`Personaliza ${club?.name ?? 'tu club'} en ApexLeap. Ajusta información general, pagos y más.`}
      />

      {/* ── TABS ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-px">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={(t as { href?: string }).href ?? `/dashboard/settings?tab=${t.key}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              tab === t.key
                ? t.danger
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-primary/10 text-primary border border-primary/20"
                : "bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      {tab === "general" && (
        <DashboardSectionCard
          icon={<Cog className="w-5 h-5" />}
          title="Información General"
          description="Nombre, logo, deporte y configuración básica del club."
        >
          <ClubSettingsForm defaultValues={club ?? undefined} />
        </DashboardSectionCard>
      )}

      {tab === "payments" && (
        <DashboardSectionCard
          icon={<CreditCard className="w-5 h-5" />}
          title="Configuración de Pagos"
          description="Datos bancarios y métodos de pago para tu club."
        >
          <BankInfoForm
            defaultValues={
              ((club?.settings as Record<string, unknown> | null)?.payment_settings as Record<string, unknown> | null) ?? null
            }
          />
        </DashboardSectionCard>
      )}

      {tab === "categories" && (
        <DashboardSectionCard
          icon={<Tag className="w-5 h-5" />}
          title="Categorías"
          description="Define las categorías o divisiones de tu club (ej: Sub-13, Adultos, Avanzados)."
        >
          <CategoriesManager initialCategories={categories} />
        </DashboardSectionCard>
      )}

      {tab === "seasons" && (
        <DashboardSectionCard
          icon={<Calendar className="w-5 h-5" />}
          title="Gestión de Temporadas"
          description="Crea y administra las temporadas Apertura / Clausura de tu club."
        >
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground/80 font-medium mb-4 max-w-sm">
              Las temporadas te permiten organizar competencias, estadísticas y calendarios por períodos.
            </p>
            <Link
              href="/dashboard/settings/seasons"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Ir a Temporadas <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </DashboardSectionCard>
      )}

      {tab === "danger" && (
        <div className="rounded-2xl bg-destructive/5 border border-destructive/20 overflow-hidden">
          <div className="px-6 py-5 border-b border-destructive/10 bg-destructive/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight uppercase text-destructive">Zona de Peligro</h3>
                <p className="text-sm text-destructive/70 font-medium">Las acciones aquí son permanentes e irreversibles.</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="font-bold text-sm">Eliminar este club</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Elimina permanentemente <strong className="text-foreground">{club?.name}</strong> y todos sus datos. Esta acción no se puede deshacer.
                </p>
              </div>
              <DeleteClubButton clubName={club?.name ?? ""} />
            </div>
          </div>
        </div>
      )}
    </DashboardPage>
  )
}
