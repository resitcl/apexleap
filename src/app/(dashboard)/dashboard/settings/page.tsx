export const dynamic = "force-dynamic"

import Link from "next/link"
import { getClubSettings } from "@/lib/actions/settings"
import { getCategories } from "@/lib/actions/categories"
import { ClubSettingsForm } from "@/components/settings/ClubSettingsForm"
import { DeleteClubButton } from "@/components/settings/DeleteClubButton"
import { CategoriesManager } from "@/components/settings/CategoriesManager"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Settings, AlertTriangle, Calendar } from "lucide-react"
import { Separator } from "@/components/ui/separator"

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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-muted-foreground">Personaliza tu club en ApexLeap</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Conecta tu cuenta a un club para ver la configuración
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Personaliza tu club en ApexLeap</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "general",     label: "General" },
          { key: "categories",  label: "Categorías" },
          { key: "danger",      label: "Zona de Peligro" },
          { key: "seasons",     label: "Temporadas", href: "/dashboard/settings/seasons" },
        ].map((t) => (
          <Link
            key={t.key}
            href={(t as { href?: string }).href ?? `/dashboard/settings?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? t.key === "danger"
                  ? "border-destructive text-destructive"
                  : "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "general" && (
        <ClubSettingsForm defaultValues={club ?? undefined} />
      )}

      {tab === "categories" && (
        <CategoriesManager initialCategories={categories} />
      )}

      {tab === "seasons" && (
        <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium">Gestión de Temporadas</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Crea y administra las temporadas Apertura / Clausura de tu club.
            </p>
            <Link href="/dashboard/settings/seasons" className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Ir a Temporadas
            </Link>
          </CardContent>
        </Card>
      )}

      {tab === "danger" && (
        <div className="space-y-4">
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Zona de Peligro
              </CardTitle>
              <CardDescription>
                Las acciones en esta sección son permanentes e irreversibles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">Eliminar este club</p>
                  <p className="text-sm text-muted-foreground">
                    Elimina permanentemente <strong>{club?.name}</strong> y todos sus datos.
                    Esta acción no se puede deshacer.
                  </p>
                </div>
                <DeleteClubButton clubName={club?.name ?? ""} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
