'use client'

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  equipment: 'Equipamiento', uniform: 'Uniformes',
  infrastructure: 'Infraestructura', other: 'Otro',
}
const CONDITION_LABELS: Record<string, string> = {
  good: 'Bueno', fair: 'Regular', poor: 'Malo', broken: 'Roto',
}

interface Item {
  id: string
  name: string
  category: string
  condition: string
  quantity: number
  quantity_min: number
  serial_number: string | null
  purchase_price: number | null
  purchase_date: string | null
  notes: string | null
  athletes?: { name: string } | null
}

interface Props {
  items: Item[]
}

export function ExportInventoryButton({ items }: Props) {
  function handleExport() {
    const headers = ['Nombre', 'Categoría', 'Condición', 'Cantidad', 'Stock mín.', 'Precio unit.', 'Valor total', 'Asignado a', 'N° Serie', 'Fecha compra', 'Notas']
    const rows = items.map((item) => {
      const totalValue = item.purchase_price != null ? item.purchase_price * item.quantity : null
      return [
        item.name,
        CATEGORY_LABELS[item.category] ?? item.category,
        CONDITION_LABELS[item.condition] ?? item.condition,
        String(item.quantity),
        String(item.quantity_min),
        item.purchase_price != null ? String(item.purchase_price) : '',
        totalValue != null ? String(totalValue) : '',
        (item.athletes as { name: string } | null)?.name ?? '',
        item.serial_number ?? '',
        item.purchase_date ?? '',
        item.notes ?? '',
      ]
    })

    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
      <Download className="w-4 h-4" />
      Exportar CSV
    </Button>
  )
}
