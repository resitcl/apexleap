export const dynamic = "force-dynamic"

import { Megaphone } from "lucide-react"
import { getCommunicationsAthletes, getMessageTemplates } from "@/lib/actions/communications"
import { getPlans } from "@/lib/actions/plans"
import { getCategories } from "@/lib/actions/categories"
import { CommunicationsClient } from "@/components/communications/CommunicationsClient"

export default async function CommunicationsPage() {
  const [athletes, templates, plansRaw, categoriesRaw] = await Promise.all([
    getCommunicationsAthletes().catch(() => []),
    getMessageTemplates().catch(() => []),
    getPlans().catch(() => [] as Array<{ id: string; name: string }>),
    getCategories().catch(() => [] as Array<{ id: string; name: string }>),
  ])

  const plans = (plansRaw as Array<{ id: string; name: string }>).map((p) => ({ id: p.id, name: p.name }))
  const categories = (categoriesRaw as Array<{ id: string; name: string }>).map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="space-y-6 pb-12 pt-1">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Megaphone className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Comunicaciones</h1>
          <p className="text-sm text-muted-foreground">
            Envía mensajes por correo a tus alumnos: a todos, por filtro o por selección.
          </p>
        </div>
      </div>

      <CommunicationsClient athletes={athletes} templates={templates} plans={plans} categories={categories} />
    </div>
  )
}
