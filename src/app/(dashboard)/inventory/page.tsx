export const dynamic = "force-dynamic"

import Link from "next/link"
import { getInventoryItems } from "@/lib/actions/inventory"
import { getAthletes } from "@/lib/actions/athletes"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, AlertTriangle } from "lucide-react"
import { NewItemForm } from "@/components/inventory/NewItemForm"
import { DeleteItemButton } from "@/components/inventory/DeleteItemButton"
import { AssignItemButton } from "@/components/inventory/AssignItemButton"
import { EditItemButton } from "@/components/inventory/EditItemButton"
import { ExportInventoryButton } from "@/components/inventory/ExportInventoryButton"

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  equipment:      { label: "Equipamiento",   icon: "🥊" },
  uniform:        { label: "Uniformes",      icon: "👕" },
  infrastructure: { label: "Infraestructura",icon: "🏋️" },
  other:          { label: "Otro",           icon: "📦" },
}

const CONDITION_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  good: "default", fair: "secondary", poor: "destructive", broken: "destructive",
}
const CONDITION_LABEL: Record<string, string> = {
  good: "Bueno", fair: "Regular", poor: "Malo", broken: "Roto",
}

interface PageProps {
  searchParams: Promise<{ category?: string; condition?: string; lowStock?: string; search?: string; page?: string; athleteId?: string; priceMin?: string; priceMax?: string; sortBy?: string; serialSearch?: string }>
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const { category, condition, lowStock, search, page: pageStr, athleteId, priceMin: priceMinStr, priceMax: priceMaxStr, sortBy, serialSearch } = await searchParams
  const isLowStock = lowStock === '1'
  const page = Number(pageStr ?? 1)
  const limit = 50
  const priceMin = priceMinStr ? Number(priceMinStr) : undefined
  const priceMax = priceMaxStr ? Number(priceMaxStr) : undefined

  type InvItem = Awaited<ReturnType<typeof getInventoryItems>>['items'][number]
  let items: InvItem[] = []
  let allItems: InvItem[] = []
  let total = 0
  let athleteList: { id: string; name: string }[] = []

  try {
    const [inv, allInv, ath] = await Promise.all([
      getInventoryItems({ category, condition, lowStock: isLowStock || undefined, search: search || undefined, page, limit, athleteId: athleteId || undefined, priceMin, priceMax }),
      getInventoryItems({ category, condition, lowStock: isLowStock || undefined, search: search || undefined, limit: 10000, athleteId: athleteId || undefined, priceMin, priceMax }),
      getAthletes({ limit: 200 }),
    ])
    items = inv.items
    allItems = allInv.items
    total = inv.total
    athleteList = ath.athletes.map((a) => ({ id: a.id, name: a.name }))
  } catch { /* empty */ }

  const lowStockItems = allItems.filter((i) => i.quantity <= i.quantity_min && i.quantity_min > 0)
  const counts = allItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + 1
    return acc
  }, {})
  const conditionCounts = allItems.reduce<Record<string, number>>((acc, i) => {
    acc[i.condition] = (acc[i.condition] ?? 0) + 1
    return acc
  }, {})
  const newestItem = allItems.slice().sort((a, b) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  )[0]

  if (sortBy === 'value') {
    items = items.slice().sort((a, b) => {
      const va = (a.purchase_price ?? 0) * a.quantity
      const vb = (b.purchase_price ?? 0) * b.quantity
      return vb - va
    })
  }

  if (sortBy === 'assigned') {
    items = items.slice().sort((a, b) => {
      const aA = a.assigned_to ? 1 : 0
      const bA = b.assigned_to ? 1 : 0
      return bA - aA
    })
  }

  if (sortBy === 'purchase_date') {
    items = items.slice().sort((a, b) => {
      const dA = a.purchase_date ?? ''
      const dB = b.purchase_date ?? ''
      return dB.localeCompare(dA)
    })
  }

  if (serialSearch) {
    items = items.filter((i) => i.serial_number && i.serial_number.toLowerCase().includes(serialSearch.toLowerCase()))
  }

  const CONDITION_ORDER: Record<string, number> = { broken: 0, poor: 1, fair: 2, good: 3 }
  if (sortBy === 'condition') {
    items = items.slice().sort((a, b) =>
      (CONDITION_ORDER[a.condition] ?? 2) - (CONDITION_ORDER[b.condition] ?? 2)
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">
            {total} ítem{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
            {(() => {
              const totalValue = allItems.reduce((sum, i) => sum + (i.purchase_price ?? 0) * i.quantity, 0)
              return totalValue > 0 ? <span className="ml-2 text-green-600 font-medium">· Valor total: ${totalValue.toLocaleString('es-CL')}</span> : null
            })()}
            {(() => {
              const withPrice = allItems.filter((i) => i.purchase_price && i.purchase_price > 0)
              if (withPrice.length < 2) return null
              const avg = Math.round(withPrice.reduce((s, i) => s + (i.purchase_price ?? 0), 0) / withPrice.length)
              return <span className="ml-2 text-muted-foreground/70">· prom. ${avg.toLocaleString('es-CL')}/ítem</span>
            })()}
            {(() => {
              const assigned = allItems.filter((i) => i.assigned_to).length
              const tot = allItems.length
              if (tot === 0) return null
              return (
                <span className="ml-2 text-muted-foreground/70">
                  · {assigned}/{tot} asignado{assigned !== 1 ? 's' : ''}
                  {assigned === 0 && <span className="ml-1 text-orange-500 font-medium">· ninguno asignado</span>}
                </span>
              )
            })()}
            {(() => {
              const broken = allItems.filter((i) => i.condition === 'broken').length
              return broken > 0 ? (
                <span className="ml-2 text-red-600 font-medium">· {broken} roto{broken !== 1 ? 's' : ''} ⚠</span>
              ) : null
            })()}
            {(() => {
              const priciest = allItems.filter((i) => i.purchase_price).slice().sort((a, b) => (b.purchase_price ?? 0) - (a.purchase_price ?? 0))[0]
              return priciest ? (
                <span className="ml-2 text-muted-foreground/60">· Más caro: {priciest.name} (${Number(priciest.purchase_price).toLocaleString('es-CL')})</span>
              ) : null
            })()}
            {newestItem?.created_at && (
              <span className="ml-2 text-muted-foreground/60">
                · Último: {newestItem.name} ({new Date(newestItem.created_at).toLocaleDateString('es-CL')})
              </span>
            )}
            {(() => {
              const byCategory = Object.entries(CATEGORY_META).map(([key, meta]) => {
                const val = allItems
                  .filter((i) => i.category === key && i.purchase_price)
                  .reduce((s, i) => s + (i.purchase_price ?? 0) * i.quantity, 0)
                return val > 0 ? `${meta.label}: $${val.toLocaleString('es-CL')}` : null
              }).filter(Boolean)
              return byCategory.length > 0 ? (
                <span className="ml-2 text-muted-foreground/50 text-xs">· {byCategory.join(' · ')}</span>
              ) : null
            })()}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportInventoryButton items={allItems} />
          <NewItemForm athletes={athleteList} />
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 font-medium">
              {lowStockItems.length} ítem{lowStockItems.length > 1 ? "s" : ""} bajo stock mínimo:{" "}
              {lowStockItems.map((i: { name: string }) => i.name).join(", ")}
            </p>
          </CardContent>
        </Card>
      )}

      {(() => {
        const brokenItems = allItems.filter((i) => i.condition === 'broken')
        if (brokenItems.length === 0) return null
        const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30)
        const oldBroken = brokenItems.filter((i) => i.updated_at && new Date(i.updated_at) < thirtyAgo)
        const recentBroken = brokenItems.filter((i) => !i.updated_at || new Date(i.updated_at) >= thirtyAgo)
        return (
          <>
            {oldBroken.length > 0 && (
              <Card className="border-red-300 bg-red-100">
                <CardContent className="py-3 flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-700 shrink-0" />
                  <p className="text-sm text-red-900 font-medium">
                    ⚠ {oldBroken.length} ítem{oldBroken.length > 1 ? 's' : ''} roto{oldBroken.length > 1 ? 's' : ''} sin reparar hace +30 días:{' '}
                    {oldBroken.map((i) => i.name).join(', ')}
                  </p>
                </CardContent>
              </Card>
            )}
            {recentBroken.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-3 flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-sm text-red-800 font-medium">
                    {recentBroken.length} ítem{recentBroken.length > 1 ? 's' : ''} roto{recentBroken.length > 1 ? 's' : ''}:{' '}
                    {recentBroken.map((i) => i.name).join(', ')}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )
      })()}

      {/* Monthly acquisition value comparison alert */}
      {(() => {
        const curMonth  = new Date().toISOString().slice(0, 7)
        const prevDate  = new Date(); prevDate.setMonth(prevDate.getMonth() - 1)
        const prevMonth = prevDate.toISOString().slice(0, 7)
        const value = (month: string) => allItems
          .filter((i) => (i.purchase_date ?? '').slice(0, 7) === month && i.purchase_price)
          .reduce((s, i) => s + (i.purchase_price ?? 0) * i.quantity, 0)
        const cur  = value(curMonth)
        const prev = value(prevMonth)
        if (prev === 0 || cur >= prev) return null
        const drop = Math.round(((prev - cur) / prev) * 100)
        return (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
              <p className="text-sm text-orange-800 font-medium">
                Adquisiciones este mes (${cur.toLocaleString('es-CL')}) son {drop}% menores al mes anterior (${prev.toLocaleString('es-CL')})
              </p>
            </CardContent>
          </Card>
        )
      })()}

      {/* High-value unassigned alert */}
      {(() => {
        const priced = allItems.filter((i) => !i.assigned_to && i.purchase_price && i.purchase_price > 0)
        if (priced.length === 0) return null
        const sorted = priced.slice().sort((a, b) => (b.purchase_price ?? 0) - (a.purchase_price ?? 0))
        const median = sorted[Math.floor(sorted.length / 2)]?.purchase_price ?? 0
        const threshold = Math.max(median * 2, 50000)
        const highValue = sorted.filter((i) => (i.purchase_price ?? 0) >= threshold)
        if (highValue.length === 0) return null
        return (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <span className="text-yellow-600 text-lg">⚠</span>
                <p className="text-sm text-yellow-800 font-medium">
                  {highValue.length} ítem{highValue.length !== 1 ? 's' : ''} de alto valor sin asignar
                  {highValue.length <= 2 && <span className="ml-1 font-normal">— {highValue.map((i) => `${i.name} ($${Number(i.purchase_price).toLocaleString('es-CL')})`).join(', ')}</span>}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Search */}
      <form method="get" action="/dashboard/inventory" className="flex flex-wrap items-center gap-2">
        {category  && <input type="hidden" name="category"  value={category} />}
        {condition && <input type="hidden" name="condition" value={condition} />}
        {isLowStock && <input type="hidden" name="lowStock" value="1" />}
        {sortBy && <input type="hidden" name="sortBy" value={sortBy} />}
        <input type="text" name="search" defaultValue={search ?? ''} placeholder="Buscar ítem..."
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-52" />
        {athleteList.length > 0 && (
          <select name="athleteId" defaultValue={athleteId ?? ''}
            className="h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Todos los atletas</option>
            {athleteList.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
        <input type="text" name="serialSearch" defaultValue={serialSearch ?? ''} placeholder="N° serie..."
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-32" />
        <input type="number" name="priceMin" defaultValue={priceMinStr ?? ''} min={0} placeholder="Precio mín."
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-28" />
        <input type="number" name="priceMax" defaultValue={priceMaxStr ?? ''} min={0} placeholder="Precio máx."
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-28" />
        <button type="submit" className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Buscar</button>
        {(search || athleteId || priceMinStr || priceMaxStr) && (
          <Link href={`/dashboard/inventory?${new URLSearchParams({ ...(category ? { category } : {}), ...(condition ? { condition } : {}), ...(isLowStock ? { lowStock: '1' } : {}) }).toString()}`}
            className="text-xs text-muted-foreground hover:text-foreground">✕ Limpiar</Link>
        )}
      </form>

      {/* Condition + low stock + sort filters */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/inventory?${new URLSearchParams({ ...(category ? { category } : {}), ...(condition ? { condition } : {}), ...(search ? { search } : {}), ...(isLowStock ? {} : { lowStock: '1' }), ...(sortBy ? { sortBy } : {}) }).toString()}`}>
          <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
            isLowStock ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-background border-input hover:bg-accent'
          }`}>⚠️ Stock bajo</button>
        </Link>
        <Link href={`/dashboard/inventory?${new URLSearchParams({ ...(category ? { category } : {}), ...(condition ? { condition } : {}), ...(search ? { search } : {}), ...(isLowStock ? { lowStock: '1' } : {}), ...(sortBy === 'value' ? {} : { sortBy: 'value' }) }).toString()}`}>
          <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
            sortBy === 'value' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
          }`}>💰 Mayor valor</button>
        </Link>
        <Link href={`/dashboard/inventory?${new URLSearchParams({ ...(category ? { category } : {}), ...(condition ? { condition } : {}), ...(search ? { search } : {}), ...(isLowStock ? { lowStock: '1' } : {}), ...(sortBy === 'assigned' ? {} : { sortBy: 'assigned' }) }).toString()}`}>
          <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
            sortBy === 'assigned' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
          }`}>🔄 Asignados primero</button>
        </Link>
        <Link href={`/dashboard/inventory?${new URLSearchParams({ ...(category ? { category } : {}), ...(condition ? { condition } : {}), ...(search ? { search } : {}), ...(isLowStock ? { lowStock: '1' } : {}), ...(sortBy === 'purchase_date' ? {} : { sortBy: 'purchase_date' }) }).toString()}`}>
          <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
            sortBy === 'purchase_date' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
          }`}>📅 Última compra</button>
        </Link>
        <Link href={`/dashboard/inventory?${new URLSearchParams({ ...(category ? { category } : {}), ...(condition ? { condition } : {}), ...(search ? { search } : {}), ...(isLowStock ? { lowStock: '1' } : {}), ...(sortBy === 'condition' ? {} : { sortBy: 'condition' }) }).toString()}`}>
          <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
            sortBy === 'condition' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
          }`}>⚠ Peor condición</button>
        </Link>
        {([['', 'Todos'], ['good', '✅ Bueno'], ['fair', '⚠️ Regular'], ['poor', '🔴 Malo'], ['broken', '💀 Roto']] as [string, string][]).map(([val, lbl]) => {
          const isActive = (val === '' && !condition) || condition === val
          const cnt = val ? (conditionCounts[val] ?? 0) : null
          return (
            <Link key={val} href={`/dashboard/inventory?${new URLSearchParams({ ...(category ? { category } : {}), ...(isLowStock ? { lowStock: '1' } : {}), ...(search ? { search } : {}), ...(val ? { condition: val } : {}) }).toString()}`}>
              <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent'
              }`}>
                {lbl}
                {cnt !== null && cnt > 0 && (
                  <span className={`rounded-full text-xs font-bold px-1.5 leading-4 ${isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{cnt}</span>
                )}
              </button>
            </Link>
          )
        })}
        {(condition || isLowStock || category) && (
          <Link href={`/dashboard/inventory?${search ? `search=${encodeURIComponent(search)}` : ''}`}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center ml-1">
            ✕ Limpiar filtros
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <Link key={key} href={`/dashboard/inventory?${new URLSearchParams({ ...(category === key ? {} : { category: key }), ...(condition ? { condition } : {}), ...(search ? { search } : {}), ...(isLowStock ? { lowStock: '1' } : {}) }).toString()}`}>
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

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
            <h3 className="font-semibold text-lg mb-1">Sin ítems en inventario</h3>
            <p className="text-muted-foreground text-sm">Agrega equipamiento, uniformes o infraestructura del club</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => {
            const meta = CATEGORY_META[item.category]
            const assigned = item.athletes as unknown as { id: string; name: string } | null
            const isLow = item.quantity <= item.quantity_min && item.quantity_min > 0
            return (
              <Card key={item.id} className={isLow ? "border-yellow-300" : ""}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl shrink-0">{meta?.icon ?? "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{item.name}</span>
                        <Badge variant={CONDITION_VARIANT[item.condition] ?? "secondary"} className="text-xs">
                          {CONDITION_LABEL[item.condition] ?? item.condition}
                        </Badge>
                        {isLow && <Badge variant="secondary" className="text-xs text-yellow-700 bg-yellow-100">⚠ Stock bajo</Badge>}
                        {(item as { notes?: string | null }).notes && (
                          <Badge className="text-xs bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100" title={(item as { notes?: string | null }).notes ?? ''}>📝 Nota</Badge>
                        )}
                        {assigned && item.updated_at && (() => {
                          const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
                          return new Date(item.updated_at) >= weekAgo ? (
                            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">🆕 Esta semana</Badge>
                          ) : null
                        })()}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{meta?.label ?? item.category}</span>
                        {item.serial_number && <span>S/N: {item.serial_number}</span>}
                        {assigned && (
                          <Link href={`/dashboard/athletes/${assigned.id}`} className="hover:underline text-primary">
                            → {assigned.name}
                          </Link>
                        )}
                        {assigned && item.updated_at && (
                          <span title="Último movimiento">
                            asignado {new Date(item.updated_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="text-right mr-1">
                        <div className={`text-lg font-bold ${isLow ? "text-yellow-600" : ""}`}>{item.quantity}</div>
                        <div className="text-xs text-muted-foreground">unidades</div>
                      </div>
                      <EditItemButton item={item} />
                      <AssignItemButton
                        itemId={item.id}
                        currentAssignedId={assigned?.id ?? null}
                        athletes={athleteList}
                      />
                      <DeleteItemButton itemId={item.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/dashboard/inventory?${new URLSearchParams({
                ...(category  ? { category }  : {}),
                ...(condition ? { condition } : {}),
                ...(search    ? { search }    : {}),
                ...(isLowStock ? { lowStock: '1' } : {}),
                page: String(page - 1),
              }).toString()}`}>
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">← Anterior</button>
              </Link>
            )}
            {page * limit < total && (
              <Link href={`/dashboard/inventory?${new URLSearchParams({
                ...(category  ? { category }  : {}),
                ...(condition ? { condition } : {}),
                ...(search    ? { search }    : {}),
                ...(isLowStock ? { lowStock: '1' } : {}),
                page: String(page + 1),
              }).toString()}`}>
                <button className="h-9 px-4 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors">Siguiente →</button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
