'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteSchedule } from "@/lib/actions/schedules"
import { Trash2 } from "lucide-react"

export function DeleteScheduleButton({ scheduleId }: { scheduleId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteSchedule(scheduleId)
      toast.success("Sesión eliminada")
      router.push("/dashboard/calendar")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setOpen(true)}>
        <Trash2 className="w-4 h-4" />
        Eliminar
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción desactivará la sesión. El historial de asistencia se conservará.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive hover:bg-destructive/90">
              {loading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
