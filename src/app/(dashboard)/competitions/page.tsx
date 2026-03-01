export const dynamic = "force-dynamic"

import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CompetitionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competencias</h1>
          <p className="text-muted-foreground">Ligas, torneos y nóminas matchday</p>
        </div>
        <Button className="gap-2" disabled>
          <Plus className="w-4 h-4" />
          Nueva Competencia
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Torneos activos",  icon: "🏆", count: 0 },
          { label: "Nóminas creadas",  icon: "📋", count: 0 },
          { label: "Atletas citados",  icon: "👥", count: 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6 text-center">
              <span className="text-4xl">{stat.icon}</span>
              <p className="font-semibold mt-2">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-20 text-center">
          <Trophy className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold text-lg mb-1">Módulo en desarrollo</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            El módulo de Competencias incluirá gestión de torneos, nóminas Matchday Ready
            (PDF + imagen para RRSS), citaciones inteligentes con validación automática del
            Semáforo de Disponibilidad y live score. <strong>Próximamente.</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
