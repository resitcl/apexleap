export const dynamic = "force-dynamic"

import Link from "next/link"
import { getDocuments } from "@/lib/actions/documents"
import { getAthletes } from "@/lib/actions/athletes"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderOpen, AlertTriangle, ExternalLink } from "lucide-react"
import { NewDocumentForm } from "@/components/documents/NewDocumentForm"
import { DeleteDocumentButton } from "@/components/documents/DeleteDocumentButton"
import { EditDocumentButton } from "@/components/documents/EditDocumentButton"
import { AssignDocumentAthleteButton } from "@/components/documents/AssignDocumentAthleteButton"
import { ExportDocumentsButton } from "@/components/documents/ExportDocumentsButton"

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  medical:       { label: "Ficha médica",    icon: "🏥" },
  authorization: { label: "Autorización",    icon: "📋" },
  institutional: { label: "Institucional",   icon: "🏛️" },
  other:         { label: "Otro",            icon: "📁" },
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default", pending: "secondary", expired: "destructive",
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', pending: 'Pendiente', expired: 'Vencido',
}

interface PageProps {
  searchParams: Promise<{ category?: string; status?: string; search?: string }>
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const { category, status, search } = await searchParams

  let docs: Awaited<ReturnType<typeof getDocuments>> = []
  let athleteList: { id: string; name: string }[] = []

  try {
    const [d, a] = await Promise.all([
      getDocuments({ category, status, search: search || undefined }),
      getAthletes({ limit: 200 }),
    ])
    docs = d
    athleteList = a.athletes.map((x) => ({ id: x.id, name: x.name }))
  } catch { /* empty */ }

  const today = new Date().toISOString().split('T')[0]
  const expiringSoon = docs.filter((d) => d.expiry_date && d.expiry_date > today &&
    new Date(d.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length
  const expired = docs.filter((d) => d.status === 'expired' || (d.expiry_date && d.expiry_date < today)).length

  const counts = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">{docs.length} documento{docs.length !== 1 ? "s" : ""} registrado{docs.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <ExportDocumentsButton
          docs={docs.map((d) => ({ ...d, athletes: d.athletes as { name: string } | null }))}
          filename={`documentos${category ? `-${category}` : ''}${status ? `-${status}` : ''}`}
        />
        <NewDocumentForm athletes={athleteList} />
      </div>
      </div>

      {expiringSoon > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 font-medium">
              {expiringSoon} documento{expiringSoon > 1 ? "s" : ""} vence{expiringSoon === 1 ? "" : "n"} en los próximos 30 días
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search + Status filter */}
      <form method="get" action="/dashboard/documents" className="flex items-center gap-2 flex-wrap">
        {category && <input type="hidden" name="category" value={category} />}
        {status   && <input type="hidden" name="status"   value={status}   />}
        <input type="text" name="search" defaultValue={search ?? ''}
          placeholder="Buscar documento..."
          className="h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-48" />
        <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Buscar</button>
        {search && (
          <Link href={`/dashboard/documents?${new URLSearchParams({ ...(category ? { category } : {}), ...(status ? { status } : {}) }).toString()}`}
            className="text-xs text-muted-foreground hover:text-foreground">✕ Limpiar</Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        {(['', 'active', 'pending', 'expired'] as const).map((s) => (
          <Link
            key={s}
            href={`/dashboard/documents?${new URLSearchParams({ ...(category ? { category } : {}), ...(s ? { status: s } : {}) }).toString()}`}
          >
            <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
              (s === '' && !status) || status === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            }`}>
              {s === '' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {Object.entries(CATEGORY_LABELS).map(([key, meta]) => (
          <Link key={key} href={`/dashboard/documents?category=${category === key ? '' : key}`}>
            <Card className={`cursor-pointer transition-colors hover:bg-accent/50 ${category === key ? "border-primary bg-primary/5" : ""}`}>
              <CardContent className="py-4 text-center">
                <span className="text-3xl">{meta.icon}</span>
                <p className="font-semibold text-sm mt-1">{meta.label}</p>
                <p className="text-2xl font-bold">{counts[key] ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin documentos registrados</h3>
            <p className="text-muted-foreground text-sm">
              {category ? `No hay documentos en la categoría "${CATEGORY_LABELS[category]?.label ?? category}"` : "Sube el primer documento del club"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const isExpired = doc.expiry_date && doc.expiry_date < today
            const cat = CATEGORY_LABELS[doc.category]
            const athlete = doc.athletes as { id: string; name: string } | null
            return (
              <Card key={doc.id} className={isExpired ? "border-destructive/30" : ""}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl shrink-0">{cat?.icon ?? "📁"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{doc.name}</span>
                        <Badge variant={STATUS_VARIANT[doc.status] ?? "secondary"} className="text-xs">
                          {doc.status === 'active' ? 'Activo' : doc.status === 'pending' ? 'Pendiente' : 'Vencido'}
                        </Badge>
                        {isExpired && <Badge variant="destructive" className="text-xs">⚠ Vencido</Badge>}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{cat?.label ?? doc.category}</span>
                        {athlete && (
                          <Link href={`/dashboard/athletes/${athlete.id}`} className="hover:underline text-primary">
                            {athlete.name}
                          </Link>
                        )}
                        {doc.expiry_date && (
                          <span className={isExpired ? "text-destructive font-medium" : ""}>
                            Vence: {new Date(doc.expiry_date + 'T12:00:00').toLocaleDateString("es-CL")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <AssignDocumentAthleteButton
                        documentId={doc.id}
                        documentName={doc.name}
                        currentAthleteId={athlete?.id ?? null}
                        currentAthleteName={athlete?.name ?? null}
                      />
                      <EditDocumentButton doc={doc} />
                      <DeleteDocumentButton documentId={doc.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
