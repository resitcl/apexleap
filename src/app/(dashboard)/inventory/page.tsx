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
  searchParams: Promise<{ category?: string; condition?: string }>
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const { category, condition } = await searchParams

  let items: Awaited<ReturnType<typeof getInventoryItems>> = []
  let athleteList: { id: string; name: string }[] = []

  try {
    const [inv, ath] = await Promise.all([
      getInventoryItems({ category, condition }),
      getAthletes({ limit: 200 }),
    ])
    items = inv
    athleteList = ath.athletes.map((a) => ({ id: a.id, name: a.name }))
  } catch { /* empty */ }

  const lowStock = items.filter((i) => i.quantity <= i.quantity_min && i.quantity_min > 0)
  const counts = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">{items.length} ítem{items.length !== 1 ? "s" : ""} registrado{items.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <ExportInventoryButton items={items} />
          <NewItemForm athletes={athleteList} />
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800 font-medium">
              {lowStock.length} ítem{lowStock.length > 1 ? "s" : ""} bajo stock mínimo:{" "}
              {lowStock.map((i) => i.name).join(", ")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Condition filter */}
      <div className="flex flex-wrap gap-2">
        {([['', 'Todos'], ['good', '✅ Bueno'], ['fair', '⚠️ Regular'], ['poor', '🔴 Malo'], ['broken', '💀 Roto']] as const).map(([val, lbl]) => (
          <Link
            key={val}
            href={`/dashboard/inventory?${new URLSearchParams({ ...(category ? { category } : {}), ...(val ? { condition: val } : {}) }).toString()}`}
          >
            <button className={`h-8 px-3 rounded-md border text-xs font-medium transition-colors ${
              (val === '' && !condition) || condition === val
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            }`}>
              {lbl}
            </button>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <Link key={key} href={`/dashboard/inventory?category=${category === key ? "" : key}`}>
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
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{meta?.label ?? item.category}</span>
                        {item.serial_number && <span>S/N: {item.serial_number}</span>}
                        {assigned && (
                          <Link href={`/dashboard/athletes/${assigned.id}`} className="hover:underline text-primary">
                            → {assigned.name}
                          </Link>
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
    </div>
  )
}
