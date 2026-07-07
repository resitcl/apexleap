export const dynamic = "force-dynamic"

import { Megaphone, History } from "lucide-react"
import { getCommunicationsAthletes, getMessageTemplates, getCommunicationLogs } from "@/lib/actions/communications"
import { getPlans } from "@/lib/actions/plans"
import { getCategories } from "@/lib/actions/categories"
import { CommunicationsClient } from "@/components/communications/CommunicationsClient"

const KIND_LABEL: Record<string, string> = {
  broadcast: "Masivo",
  individual: "Individual",
  payment_request: "Solicitud de pago",
}
const AUDIENCE_LABEL: Record<string, string> = {
  all: "Todos",
  filter: "Filtro",
  selection: "Selección",
  athlete: "Individual",
}

export default async function CommunicationsPage() {
  const [athletes, templates, plansRaw, categoriesRaw, logs] = await Promise.all([
    getCommunicationsAthletes().catch(() => []),
    getMessageTemplates().catch(() => []),
    getPlans().catch(() => [] as Array<{ id: string; name: string }>),
    getCategories().catch(() => [] as Array<{ id: string; name: string }>),
    getCommunicationLogs(30).catch(() => []),
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

      <div className="rounded-2xl border border-white/[0.06] bg-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
          <History className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold">Historial de envíos</h2>
        </div>
        {logs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aún no hay envíos registrados.</p>
        ) : (
          <div className="divide-y divide-border/30">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.subject || "(sin asunto)"}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {KIND_LABEL[l.kind] ?? l.kind}
                    {l.audience_type ? ` · ${AUDIENCE_LABEL[l.audience_type] ?? l.audience_type}` : ""}
                    {" · "}
                    {new Date(l.created_at).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[13px] font-bold text-primary">{l.sent_count} enviados</p>
                  {l.failed_count > 0 && (
                    <p className="text-[11px] text-destructive">{l.failed_count} fallidos</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
