export const dynamic = "force-dynamic"

import { Card, CardContent } from "@/components/ui/card"
import { Package, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-muted-foreground">Control de activos y material deportivo</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="w-4 h-4" />
          Agregar Ítem
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Equipamiento", icon: "🥊", count: 0 },
          { label: "Uniformes", icon: "👕", count: 0 },
          { label: "Infraestructura", icon: "🏋️", count: 0 },
        ].map((cat) => (
          <Card key={cat.label}>
            <CardContent className="pt-6 text-center">
              <span className="text-4xl">{cat.icon}</span>
              <p className="font-semibold mt-2">{cat.label}</p>
              <p className="text-2xl font-bold mt-1">{cat.count}</p>
              <p className="text-xs text-muted-foreground">ítems</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-20 text-center">
          <Package className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold text-lg mb-1">Módulo en desarrollo</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            El módulo de Inventario permitirá rastrear equipamiento, uniformes,
            asignación a alumnos y control de stock. <strong>Próximamente.</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
