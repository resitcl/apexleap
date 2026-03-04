import { TacticalBoard } from "@/components/coach/TacticalBoard"

export default function BoardPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] p-3 gap-3">
      <div className="shrink-0">
        <h1 className="text-lg font-bold leading-none">Pizarra Táctica</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Diseña jugadas · Arrastra jugadores · Guarda estrategias</p>
      </div>
      <div className="flex-1 min-h-0">
        <TacticalBoard defaultSport="basketball" />
      </div>
    </div>
  )
}
