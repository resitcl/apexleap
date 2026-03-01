export const dynamic = "force-dynamic"

import { Card, CardContent } from "@/components/ui/card"
import { FileText, Upload, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Archivo central con firma digital</p>
        </div>
        <Button className="gap-2" disabled>
          <Upload className="w-4 h-4" />
          Subir Documento
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Fichas médicas", icon: "🏥", count: 0 },
          { label: "Contratos", icon: "📋", count: 0 },
          { label: "Licencias / Carnets", icon: "🪪", count: 0 },
        ].map((cat) => (
          <Card key={cat.label}>
            <CardContent className="pt-6 text-center">
              <span className="text-4xl">{cat.icon}</span>
              <p className="font-semibold mt-2">{cat.label}</p>
              <p className="text-2xl font-bold mt-1">{cat.count}</p>
              <p className="text-xs text-muted-foreground">documentos</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-20 text-center">
          <FolderOpen className="w-14 h-14 mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold text-lg mb-1">Módulo en desarrollo</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            El módulo de Documentos incluirá gestión de fichas médicas, contratos,
            licencias y firma digital. <strong>Próximamente.</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
