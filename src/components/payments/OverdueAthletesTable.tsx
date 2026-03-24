'use client'

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  AlertTriangle, User, Mail, Phone, Calendar, DollarSign, 
  CheckCircle, XCircle, RefreshCw, Trash2, ExternalLink
} from "lucide-react"
import { generateCatchUpPayments, bulkWaivePayments } from "@/lib/actions/billing"

interface OverdueAthlete {
  athlete: {
    id: string
    name: string
    email: string | null
    phone: string | null
    photo_url: string | null
  }
  payments: Array<{
    id: string
    amount: number
    due_date: string
    period_start: string | null
    period_end: string | null
  }>
  totalOverdue: number
  oldestDueDate: string
}

interface Props {
  athletes: OverdueAthlete[]
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-CL')}`
}

function daysSince(date: string): number {
  const dueDate = new Date(date)
  const today = new Date()
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

export function OverdueAthletesTable({ athletes: initialAthletes }: Props) {
  const [athletes, setAthletes] = useState(initialAthletes)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false)
  const [waiveReason, setWaiveReason] = useState("")
  const [athleteToWaive, setAthleteToWaive] = useState<OverdueAthlete | null>(null)

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    if (selectedIds.size === athletes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(athletes.map(a => a.athlete.id)))
    }
  }

  async function handleGenerateCatchUp(athleteId: string) {
    setLoading(athleteId)
    try {
      const result = await generateCatchUpPayments(athleteId)
      toast.success(`Se generaron ${result.created} pagos de regularización`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar pagos')
    } finally {
      setLoading(null)
    }
  }

  function openWaiveDialog(athlete: OverdueAthlete) {
    setAthleteToWaive(athlete)
    setWaiveReason("")
    setWaiveDialogOpen(true)
  }

  async function handleWaivePayments() {
    if (!athleteToWaive) return
    
    setLoading(athleteToWaive.athlete.id)
    try {
      const paymentIds = athleteToWaive.payments.map(p => p.id)
      const result = await bulkWaivePayments(paymentIds, waiveReason || undefined)
      toast.success(`Se condonaron ${result.waived} pagos`)
      
      // Remove athlete from list
      setAthletes(prev => prev.filter(a => a.athlete.id !== athleteToWaive.athlete.id))
      setWaiveDialogOpen(false)
      setAthleteToWaive(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al condonar pagos')
    } finally {
      setLoading(null)
    }
  }

  if (athletes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">¡Excelente!</p>
          <p className="text-sm text-muted-foreground mt-1">No hay atletas con pagos vencidos</p>
        </CardContent>
      </Card>
    )
  }

  const totalOverdueAmount = athletes.reduce((sum, a) => sum + a.totalOverdue, 0)
  const totalOverduePayments = athletes.reduce((sum, a) => sum + a.payments.length, 0)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Atletas con Pagos Vencidos
              </CardTitle>
              <CardDescription className="mt-1">
                {athletes.length} atletas · {totalOverduePayments} pagos vencidos · {formatCurrency(totalOverdueAmount)} total
              </CardDescription>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.size} seleccionados</span>
                <Button size="sm" variant="outline" className="gap-1" disabled>
                  <Mail className="w-4 h-4" />
                  Enviar recordatorio
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header row */}
            <div className="flex items-center gap-3 py-2 border-b text-xs text-muted-foreground uppercase">
              <input 
                type="checkbox"
                checked={selectedIds.size === athletes.length}
                onChange={selectAll}
                className="shrink-0 h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1 grid grid-cols-5 gap-3">
                <span>Atleta</span>
                <span>Contacto</span>
                <span className="text-center">Pagos Vencidos</span>
                <span className="text-right">Monto Total</span>
                <span className="text-right">Acciones</span>
              </div>
            </div>

            {/* Athletes */}
            {athletes.map((item) => {
              const daysOverdue = daysSince(item.oldestDueDate)
              const severityColor = daysOverdue > 60 ? "text-red-700 bg-red-100" 
                : daysOverdue > 30 ? "text-orange-700 bg-orange-100"
                : "text-yellow-700 bg-yellow-100"

              return (
                <div 
                  key={item.athlete.id} 
                  className={`flex items-center gap-3 py-3 border-b last:border-0 ${
                    selectedIds.has(item.athlete.id) ? 'bg-muted/30' : ''
                  }`}
                >
                  <input 
                    type="checkbox"
                    checked={selectedIds.has(item.athlete.id)}
                    onChange={() => toggleSelect(item.athlete.id)}
                    className="shrink-0 h-4 w-4 rounded border-gray-300"
                  />
                  <div className="flex-1 grid grid-cols-5 gap-3 items-center">
                    {/* Athlete info */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {item.athlete.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.athlete.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link 
                          href={`/dashboard/athletes/${item.athlete.id}`}
                          className="text-sm font-medium hover:underline truncate block"
                        >
                          {item.athlete.name}
                        </Link>
                        <Badge variant="outline" className={`text-xs ${severityColor}`}>
                          {daysOverdue} días
                        </Badge>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      {item.athlete.email && (
                        <p className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.athlete.email}</span>
                        </p>
                      )}
                      {item.athlete.phone && (
                        <p className="flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" />
                          {item.athlete.phone}
                        </p>
                      )}
                    </div>

                    {/* Payment count */}
                    <div className="text-center">
                      <span className="text-lg font-bold text-destructive">{item.payments.length}</span>
                      <p className="text-xs text-muted-foreground">
                        desde {new Date(item.oldestDueDate).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <span className="text-lg font-bold">{formatCurrency(item.totalOverdue)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="gap-1 h-8 px-2"
                        onClick={() => handleGenerateCatchUp(item.athlete.id)}
                        disabled={loading === item.athlete.id}
                      >
                        <RefreshCw className={`w-3 h-3 ${loading === item.athlete.id ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Regularizar</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="gap-1 h-8 px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => openWaiveDialog(item)}
                        disabled={loading === item.athlete.id}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Condonar</span>
                      </Button>
                      <Link href={`/dashboard/athletes/${item.athlete.id}`}>
                        <Button size="sm" variant="ghost" className="h-8 px-2">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Waive Dialog */}
      <Dialog open={waiveDialogOpen} onOpenChange={setWaiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              Condonar Deuda
            </DialogTitle>
            <DialogDescription>
              Vas a condonar {athleteToWaive?.payments.length} pagos por un total de {formatCurrency(athleteToWaive?.totalOverdue ?? 0)} de <strong>{athleteToWaive?.athlete.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Esta acción es irreversible. Los pagos serán marcados como cancelados y no se cobrarán.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="waiveReason">Motivo (opcional)</Label>
              <Textarea
                id="waiveReason"
                placeholder="Ej: Acuerdo con el atleta, situación económica especial..."
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiveDialogOpen(false)} disabled={!!loading}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleWaivePayments} 
              disabled={!!loading}
              className="gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Condonar Deuda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
