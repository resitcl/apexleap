export const dynamic = "force-dynamic"

import Link from "next/link"
import { getDocuments } from "@/lib/actions/documents"
import { getAthletes } from "@/lib/actions/athletes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderOpen, AlertTriangle, ExternalLink } from "lucide-react"
import { NewDocumentForm } from "@/components/documents/NewDocumentForm"
import { DeleteDocumentButton } from "@/components/documents/DeleteDocumentButton"
import { EditDocumentButton } from "@/components/documents/EditDocumentButton"
import { AssignDocumentAthleteButton } from "@/components/documents/AssignDocumentAthleteButton"
import { ExportDocumentsButton } from "@/components/documents/ExportDocumentsButton"
import { DismissibleAlert } from "@/components/ui/DismissibleAlert"

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  medical:       { label: "Ficha médica",    icon: "🏥" },
  authorization: { label: "Autorización",    icon: "📋" },
  institutional: { label: "Institucional",   icon: "🏛️" },
  other:         { label: "Otro",            icon: "📁" },
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  approved: "default", pending: "secondary", expired: "destructive", rejected: "destructive",
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprobado', pending: 'Pendiente', expired: 'Vencido', rejected: 'Rechazado',
}

interface PageProps {
  searchParams: Promise<{ category?: string; status?: string; search?: string; expiring?: string }>
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const { category, status, search, expiring } = await searchParams

  let docs: Awaited<ReturnType<typeof getDocuments>> = []
  let athleteList: { id: string; name: string }[] = []

  const now = new Date()
  const expiryBefore = expiring
    ? new Date(now.getTime() + Number(expiring) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : undefined

  try {
    const [d, a] = await Promise.all([
      getDocuments({ category, status, search: search || undefined }),
      getAthletes({ limit: 200 }),
    ])
      docs = d
    athleteList = a.athletes.map((x) => ({ id: x.id, name: x.name }))
  } catch { /* empty */ }

  if (expiryBefore) {
    const todayStr = new Date().toISOString().split('T')[0]
    docs = docs.filter((d) => d.expiry_date && d.expiry_date >= todayStr && d.expiry_date <= expiryBefore)
  }

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
          <p className="text-muted-foreground">
            {docs.length} documento{docs.length !== 1 ? "s" : ""} registrado{docs.length !== 1 ? "s" : ""}
            {(() => {
              const uniqueAthletes = new Set(docs.map((d) => (d.athletes as { id: string } | null)?.id).filter(Boolean)).size
              return uniqueAthletes > 0 ? (
                <span className="ml-2 font-medium text-primary">· {uniqueAthletes} atleta{uniqueAthletes !== 1 ? 's' : ''} con documentos</span>
              ) : null
            })()}
            {expired > 0 && <span className="ml-2 text-red-600 font-medium">· {expired} vencido{expired !== 1 ? 's' : ''}</span>}
            {expiringSoon > 0 && <span className="ml-2 text-yellow-600 font-medium">· {expiringSoon} vence{expiringSoon !== 1 ? 'n' : ''} en 30 días</span>}
          </p>
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
        <DismissibleAlert dismissKey={`docs-expiring-${expiringSoon}`}>
        <Card>
          <CardHeader className="pb-0 pt-4 px-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <CardTitle className="text-sm font-semibold">Alertas de documentos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pt-1 pb-2">
            <div className="py-3 flex items-center gap-3">
              <div className="w-0.5 h-10 rounded-full bg-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {expiringSoon} documento{expiringSoon > 1 ? "s" : ""} vence{expiringSoon === 1 ? "" : "n"} en los próximos 30 días
                </p>
                <p className="text-xs text-muted-foreground">Revisar y renovar antes del vencimiento</p>
              </div>
              <Link href="/dashboard/documents?expiring=30" className="text-xs text-primary hover:underline shrink-0">Ver →</Link>
            </div>
          </CardContent>
        </Card>
        </DismissibleAlert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form method="get" action="/dashboard/documents" className="flex items-center gap-2">
          {category && <input type="hidden" name="category" value={category} />}
          {status   && <input type="hidden" name="status"   value={status}   />}
          {expiring && <input type="hidden" name="expiring" value={expiring}  />}
          <input type="text" name="search" defaultValue={search ?? ''}
            placeholder="Buscar documento..."
            className="h-8 px-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring w-48" />
          <button type="submit" className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Buscar</button>
        </form>
        <div className="w-px h-5 bg-border mx-1" />
        {(['', 'approved', 'pending', 'expired', 'rejected'] as const).map((s) => (
          <Link
            key={s}
            href={`/dashboard/documents?${new URLSearchParams({ ...(category ? { category } : {}), ...(expiring ? { expiring } : {}), ...(search ? { search } : {}), ...(s ? { status: s } : {}) }).toString()}`}
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
        <div className="w-px h-5 bg-border mx-1" />
        {[['7', 'Vence en 7d'], ['30', 'Vence en 30d']].map(([val, lbl]) => (
          <Link key={val} href={`/dashboard/documents?${new URLSearchParams({
            ...(category ? { category } : {}),
            ...(status   ? { status }   : {}),
            ...(search   ? { search }   : {}),
            ...(expiring === val ? {} : { expiring: val }),
          }).toString()}`}>
            <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
              expiring === val ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-background border-input hover:bg-accent'
            }`}>{lbl}</button>
          </Link>
        ))}
        {(search || status || expiring) && (
          <Link href={`/dashboard/documents${category ? `?category=${category}` : ''}`}
            className="text-xs text-muted-foreground hover:text-foreground ml-1">✕ Limpiar</Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {Object.entries(CATEGORY_LABELS).map(([key, meta]) => (
          <Link key={key} href={`/dashboard/documents?${new URLSearchParams({ ...(category === key ? {} : { category: key }), ...(status ? { status } : {}), ...(search ? { search } : {}), ...(expiring ? { expiring } : {}) }).toString()}`}>
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
            <p className="text-muted-foreground text-sm mb-4">
              {category ? `No hay documentos en la categoría "${CATEGORY_LABELS[category]?.label ?? category}"` : "Sube el primer documento del club"}
            </p>
            <NewDocumentForm athletes={athleteList} />
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
                          {STATUS_LABELS[doc.status] ?? doc.status}
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
                        {doc.expiry_date && (() => {
                          const exp = new Date(doc.expiry_date + 'T12:00:00')
                          const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                          return (
                            <span className={isExpired ? "text-destructive font-medium" : diffDays <= 30 ? "text-yellow-600 font-medium" : ""}>
                              Vence: {exp.toLocaleDateString("es-CL")}
                              {!isExpired && diffDays <= 30 && ` (${diffDays}d)`}
                              {isExpired && ` (hace ${Math.abs(diffDays)}d)`}
                            </span>
                          )
                        })()}
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
