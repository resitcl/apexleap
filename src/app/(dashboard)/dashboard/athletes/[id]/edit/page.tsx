import Link from "next/link"
import { notFound } from "next/navigation"
import { getAthleteById } from "@/lib/actions/athletes"
import { getCategories } from "@/lib/actions/categories"
import { AthleteForm } from "@/components/athletes/AthleteForm"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditAthletePage({ params }: PageProps) {
  const { id } = await params

  let athlete
  try {
    athlete = await getAthleteById(id)
  } catch {
    notFound()
  }

  let categories: Awaited<ReturnType<typeof getCategories>> = []
  try { categories = await getCategories(true) } catch { /* silent */ }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/athletes/${id}`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Alumno</h1>
          <p className="text-muted-foreground text-sm">{athlete.name}</p>
        </div>
      </div>

      <AthleteForm
        athleteId={id}
        categories={categories}
        defaultValues={{
          name: athlete.name,
          email: athlete.email ?? '',
          phone: athlete.phone ?? '',
          document_number: athlete.document_number ?? '',
          birth_date: athlete.birth_date ?? '',
          emergency_contact: athlete.emergency_contact ?? '',
          emergency_phone: athlete.emergency_phone ?? '',
          notes: athlete.notes ?? '',
          health_status: athlete.health_status as 'healthy' | 'injured' | 'observation',
          status: athlete.status as 'active' | 'inactive' | 'suspended',
          jersey_number: (athlete as { jersey_number?: number | null }).jersey_number ?? null,
          category: (athlete as { category?: string }).category ?? 'General',
          category_id: (athlete as { category_id?: string | null }).category_id ?? null,
        }}
      />
    </div>
  )
}
