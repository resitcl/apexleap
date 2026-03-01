export const dynamic = "force-dynamic"

import Link from "next/link"
import { getPayments, getPaymentSummary } from "@/lib/actions/payments"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, DollarSign, Clock, AlertTriangle } from "lucide-react"
import { PaymentsFilter } from "@/components/payments/PaymentsFilter"
import { MarkAsPaidButton } from "@/components/payments/MarkAsPaidButton"
import { ExportPaymentsButton } from "@/components/payments/ExportPaymentsButton"
import { BulkMarkAsPaidButton } from "@/components/payments/BulkMarkAsPaidButton"
import { DeletePaymentButton } from "@/components/payments/DeletePaymentButton"
import { EditPaymentButton } from "@/components/payments/EditPaymentButton"

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string; from?: string; to?: string; athleteId?: string; search?: string }>
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid:      { label: 'Pagado',    variant: 'default' },
  pending:   { label: 'Pendiente', variant: 'secondary' },
  overdue:   { label: 'Vencido',   variant: 'destructive' },
  failed:    { label: 'Fallido',   variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)
  const from      = params.from      ?? ""
  const to        = params.to        ?? ""
  const athleteId = params.athleteId ?? ""
  const search    = params.search    ?? ""

  let payments: Awaited<ReturnType<typeof getPayments>>["payments"] = []
  let allPayments: Awaited<ReturnType<typeof getPayments>>["payments"] = []
  let total = 0
  let summary = { total_collected: 0, total_pending: 0, total_overdue: 0, count_overdue: 0 }
  let error: string | null = null

  try {
    const [result, allResult, summaryResult] = await Promise.all([
      getPayments({ status: params.status, page, limit: 25, from: from || undefined, to: to || undefined, athleteId: athleteId || undefined, search: search || undefined }),
      getPayments({ status: params.status, page: 1, limit: 1000, from: from || undefined, to: to || undefined, athleteId: athleteId || undefined, search: search || undefined }),
      getPaymentSummary(),
    ])
    payments = result.payments
    allPayments = allResult.payments
    total = result.total
    summary = summaryResult
  } catch (e) {
    error = e instanceof Error ? e.message : 'Error al cargar pagos'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pagos</h1>
          <p className="text-muted-foreground">{total} transacciones</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {payments.filter(p => p.status === 'pending' || p.status === 'overdue').length > 1 && (
            <BulkMarkAsPaidButton
              ids={payments.filter(p => p.status === 'pending' || p.status === 'overdue').map(p => p.id)}
            />
          )}
          <ExportPaymentsButton
            payments={allPayments.map((p) => ({
              ...p,
              athletes: p.athletes as { name: string } | null,
              plans: p.plans as { name: string } | null,
            }))}
            filename={`pagos${params.status ? `-${params.status}` : ''}${search ? `-${search}` : ''}`}
          />
          <Link href="/dashboard/payments/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Registrar Pago
            </Button>
          </Link>
        </div>
      </div>

      {/* Athlete filter banner */}
      {athleteId && (
        <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/20 text-sm">
          <span className="text-primary font-medium">Filtrando pagos por atleta</span>
          <Link href="/dashboard/payments" className="ml-auto text-xs text-muted-foreground hover:text-foreground underline">
            Ver todos
          </Link>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recaudado</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.total_collected.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">Total pagos confirmados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendiente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${summary.total_pending.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${summary.total_overdue.toLocaleString('es-CL')}
            </div>
            <p className="text-xs text-muted-foreground">{summary.count_overdue} cuotas morosas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <PaymentsFilter currentStatus={params.status} />
        <form method="get" action="/dashboard/payments" className="flex flex-wrap items-end gap-2">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Buscar concepto</label>
            <input type="text" name="search" defaultValue={search}
              placeholder="Ej: mensualidad..."
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-44" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Venc. desde</label>
            <input type="date" name="from" defaultValue={from}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Venc. hasta</label>
            <input type="date" name="to" defaultValue={to}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="submit"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Filtrar
          </button>
          {(from || to || search) && (
            <Link href={`/dashboard/payments${params.status ? `?status=${params.status}` : ''}`}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors flex items-center">
              ✕ Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* Payments List */}
      {error ? (
        <Card>
          <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <h3 className="font-semibold text-lg mb-1">Sin pagos registrados</h3>
            <p className="text-muted-foreground mb-4">Registra el primer cobro del club</p>
            <Link href="/dashboard/payments/new">
              <Button>Registrar Pago</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => {
            const athlete = payment.athletes as { id: string; name: string; photo_url: string | null } | null
            const cfg = STATUS_CONFIG[payment.status] ?? { label: payment.status, variant: 'outline' as const }

            return (
              <Card key={payment.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm font-semibold">
                        {athlete?.name?.slice(0, 2).toUpperCase() ?? '??'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {athlete && (
                          <Link
                            href={`/dashboard/athletes/${athlete.id}`}
                            className="font-semibold hover:underline"
                          >
                            {athlete.name}
                          </Link>
                        )}
                        <span className="text-muted-foreground text-sm">·</span>
                        <span className="text-sm text-muted-foreground truncate">{payment.concept}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Vence: {new Date(payment.due_date).toLocaleDateString('es-CL')}</span>
                        {payment.paid_at && (
                          <span>Pagado: {new Date(payment.paid_at).toLocaleDateString('es-CL')}</span>
                        )}
                        {payment.payment_method && (
                          <span className="capitalize">{payment.payment_method}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-lg">
                        ${Number(payment.amount).toLocaleString('es-CL')}
                      </span>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <EditPaymentButton payment={payment} />
                      {payment.status === 'pending' || payment.status === 'overdue' ? (
                        <MarkAsPaidButton paymentId={payment.id} />
                      ) : null}
                      <DeletePaymentButton paymentId={payment.id} />
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
