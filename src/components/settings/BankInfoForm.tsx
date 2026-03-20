'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Landmark, Eye, EyeOff, ToggleLeft, ToggleRight, Banknote, FlaskConical } from 'lucide-react'
import { updatePaymentSettings } from '@/lib/actions/settings'

const BANKS = [
  'Banco de Chile', 'Banco Estado', 'Banco Santander', 'BCI', 'Banco Itaú',
  'Scotiabank', 'Banco BICE', 'Banco Security', 'Banco Falabella',
  'Banco Ripley', 'Banco Consorcio', 'Coopeuch', 'Otro',
]
const ACCOUNT_TYPES = ['Cuenta Corriente', 'Cuenta Vista', 'Cuenta de Ahorro', 'Cuenta RUT']

/* ── Types ──────────────────────────────────────────────────────────────── */

interface BankInfo {
  bank_name: string; account_type: string; account_number: string
  account_holder: string; rut: string; email: string
}

interface GatewayConfig {
  enabled: boolean; sandbox: boolean
  api_key: string; secret_key: string; commerce_code: string
}

export interface PaymentSettings {
  enabled_methods: string[]
  bank_info: BankInfo
  flow: GatewayConfig
  webpay: GatewayConfig
  mercadopago: GatewayConfig
  khipu: GatewayConfig
  cash_instructions: string
}

/* ── Gateway definitions ────────────────────────────────────────────────── */

type GatewayId = 'flow' | 'webpay' | 'mercadopago' | 'khipu'
const GATEWAYS: {
  id: GatewayId; label: string; description: string
  fields: { key: 'api_key' | 'secret_key' | 'commerce_code'; label: string; placeholder: string; secret?: boolean }[]
}[] = [
  { id: 'flow', label: 'Flow', description: 'Pagos en línea con Flow.cl', fields: [
    { key: 'api_key', label: 'API Key', placeholder: 'Ej: 1234567890' },
    { key: 'secret_key', label: 'Secret Key', placeholder: 'Ej: abc123...', secret: true },
  ]},
  { id: 'webpay', label: 'Webpay (Transbank)', description: 'Tarjeta crédito/débito vía Transbank', fields: [
    { key: 'commerce_code', label: 'Código de Comercio', placeholder: 'Ej: 597012345678' },
    { key: 'api_key', label: 'API Key', placeholder: 'Ej: webpay_api_key_...' },
    { key: 'secret_key', label: 'Secret Key', placeholder: 'Ej: webpay_secret_...', secret: true },
  ]},
  { id: 'mercadopago', label: 'MercadoPago', description: 'Tarjetas, saldo MP, PSE', fields: [
    { key: 'api_key', label: 'Public Key', placeholder: 'Ej: APP_USR-...' },
    { key: 'secret_key', label: 'Access Token', placeholder: 'Ej: APP_USR-...-...', secret: true },
  ]},
  { id: 'khipu', label: 'Khipu', description: 'Transferencia bancaria instantánea', fields: [
    { key: 'api_key', label: 'Receiver ID', placeholder: 'Ej: 123456' },
    { key: 'secret_key', label: 'Secret', placeholder: 'Ej: khipu_secret_...', secret: true },
  ]},
]

/* ── Defaults ───────────────────────────────────────────────────────────── */

const EMPTY_BANK: BankInfo = { bank_name: '', account_type: '', account_number: '', account_holder: '', rut: '', email: '' }
const EMPTY_GW: GatewayConfig = { enabled: false, sandbox: true, api_key: '', secret_key: '', commerce_code: '' }

function toState(v?: Partial<PaymentSettings> | null): PaymentSettings {
  return {
    enabled_methods: v?.enabled_methods ?? ['transfer', 'cash'],
    bank_info: { ...EMPTY_BANK, ...v?.bank_info },
    flow: { ...EMPTY_GW, ...v?.flow },
    webpay: { ...EMPTY_GW, ...v?.webpay },
    mercadopago: { ...EMPTY_GW, ...v?.mercadopago },
    khipu: { ...EMPTY_GW, ...v?.khipu },
    cash_instructions: v?.cash_instructions ?? '',
  }
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const selectCls = 'w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function ToggleSwitch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center gap-2 text-sm font-medium">
      {on
        ? <ToggleRight className="w-6 h-6 text-green-500" />
        : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
      {label}
    </button>
  )
}

/* ── Props ──────────────────────────────────────────────────────────────── */

interface Props {
  defaultValues?: Partial<PaymentSettings> | null
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function BankInfoForm({ defaultValues }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<PaymentSettings>(() => toState(defaultValues))
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  function toggleMethod(m: string) {
    setForm(p => ({
      ...p,
      enabled_methods: p.enabled_methods.includes(m)
        ? p.enabled_methods.filter(x => x !== m)
        : [...p.enabled_methods, m],
    }))
  }

  function setBank(key: keyof BankInfo, value: string) {
    setForm(p => ({ ...p, bank_info: { ...p.bank_info, [key]: value } }))
  }

  function setGw(gw: GatewayId, key: keyof GatewayConfig, value: string | boolean) {
    setForm(p => ({ ...p, [gw]: { ...p[gw], [key]: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await updatePaymentSettings(form)
      toast.success('Configuración de pagos guardada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setLoading(false) }
  }

  const transferOn = form.enabled_methods.includes('transfer')
  const cashOn = form.enabled_methods.includes('cash')

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Enabled Methods Overview ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medios de Pago Habilitados</CardTitle>
          <CardDescription>Activa o desactiva los medios de pago disponibles para tus atletas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { key: 'transfer', label: 'Transferencia Bancaria' },
              { key: 'cash', label: 'Efectivo' },
              ...GATEWAYS.map(g => ({ key: g.id, label: g.label })),
            ].map(({ key, label }) => {
              const on = key === 'transfer' ? transferOn
                : key === 'cash' ? cashOn
                : form[key as GatewayId].enabled
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'transfer' || key === 'cash') toggleMethod(key)
                    else setGw(key as GatewayId, 'enabled', !form[key as GatewayId].enabled)
                  }}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    on ? 'border-green-300 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10'
                       : 'border-border bg-muted/30 opacity-60'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${on ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  <span className="text-xs text-muted-foreground">{on ? 'Activo' : 'Inactivo'}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Transfer / Bank Info ─────────────────────────────────────── */}
      {transferOn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="w-4 h-4" /> Datos Bancarios para Transferencias
            </CardTitle>
            <CardDescription>Se muestra a los atletas al seleccionar pago por transferencia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bank_name">Banco</Label>
                <select id="bank_name" value={form.bank_info.bank_name} onChange={e => setBank('bank_name', e.target.value)} className={selectCls}>
                  <option value="">Seleccionar banco...</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account_type">Tipo de Cuenta</Label>
                <select id="account_type" value={form.bank_info.account_type} onChange={e => setBank('account_type', e.target.value)} className={selectCls}>
                  <option value="">Seleccionar tipo...</option>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account_number">Número de Cuenta</Label>
              <Input id="account_number" value={form.bank_info.account_number} onChange={e => setBank('account_number', e.target.value)} placeholder="Ej: 00-123-45678-90" className="font-mono" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="account_holder">Titular de la Cuenta</Label>
                <Input id="account_holder" value={form.bank_info.account_holder} onChange={e => setBank('account_holder', e.target.value)} placeholder="Nombre completo o razón social" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rut">RUT</Label>
                <Input id="rut" value={form.bank_info.rut} onChange={e => setBank('rut', e.target.value)} placeholder="12.345.678-9" className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank_email">Email notificación transferencia</Label>
              <Input id="bank_email" type="email" value={form.bank_info.email} onChange={e => setBank('email', e.target.value)} placeholder="pagos@miclub.cl" />
              <p className="text-xs text-muted-foreground">Donde los atletas envían el comprobante (opcional)</p>
            </div>

            {/* preview */}
            {(form.bank_info.bank_name || form.bank_info.account_number) && (
              <div className="mt-2 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Vista previa (lo que verá el atleta)</p>
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4 border border-amber-200 dark:border-amber-500/30 space-y-2">
                  {form.bank_info.bank_name && <Row label="Banco" value={form.bank_info.bank_name} />}
                  {form.bank_info.account_type && <Row label="Tipo de cuenta" value={form.bank_info.account_type} />}
                  {form.bank_info.account_number && <Row label="N° de cuenta" value={form.bank_info.account_number} mono />}
                  {form.bank_info.account_holder && <Row label="Titular" value={form.bank_info.account_holder} />}
                  {form.bank_info.rut && <Row label="RUT" value={form.bank_info.rut} mono />}
                  {form.bank_info.email && <Row label="Email" value={form.bank_info.email} />}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Online Gateways ──────────────────────────────────────────── */}
      {GATEWAYS.map(gw => {
        const cfg = form[gw.id]
        if (!cfg.enabled) return null
        return (
          <Card key={gw.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{gw.label}</CardTitle>
                  <CardDescription>{gw.description}</CardDescription>
                </div>
                <ToggleSwitch
                  on={!cfg.sandbox}
                  onToggle={() => setGw(gw.id, 'sandbox', !cfg.sandbox)}
                  label={cfg.sandbox ? 'Sandbox' : 'Producción'}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cfg.sandbox && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-md px-3 py-2">
                  <FlaskConical className="w-3.5 h-3.5 shrink-0" />
                  Modo sandbox activo — los pagos no se procesarán realmente.
                </div>
              )}
              <div className="grid gap-4">
                {gw.fields.map(f => {
                  const secretId = `${gw.id}-${f.key}`
                  const isSecret = f.secret
                  const show = showSecrets[secretId]
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <Label htmlFor={secretId}>{f.label}</Label>
                      <div className="relative">
                        <Input
                          id={secretId}
                          type={isSecret && !show ? 'password' : 'text'}
                          value={cfg[f.key] as string}
                          onChange={e => setGw(gw.id, f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className={`font-mono text-sm ${isSecret ? 'pr-10' : ''}`}
                        />
                        {isSecret && (
                          <button
                            type="button"
                            onClick={() => setShowSecrets(p => ({ ...p, [secretId]: !p[secretId] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* ── Cash ─────────────────────────────────────────────────────── */}
      {cashOn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Pago en Efectivo
            </CardTitle>
            <CardDescription>Instrucciones que verá el atleta al pagar en efectivo.</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              value={form.cash_instructions}
              onChange={e => setForm(p => ({ ...p, cash_instructions: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Ej: Pagar en recepción antes de la clase. Horario: Lun-Vie 9:00 a 20:00."
            />
          </CardContent>
        </Card>
      )}

      {/* ── Submit ───────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Configuración de Pagos'}
        </Button>
      </div>
    </form>
  )
}

/* ── Small presentational helper ─────────────────────────────────────── */
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
