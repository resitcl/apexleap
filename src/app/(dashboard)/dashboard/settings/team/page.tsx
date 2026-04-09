export const dynamic = "force-dynamic"

import { getTeamData } from "@/lib/actions/team"
import { TeamManager } from "@/components/settings/TeamManager"
import { Users } from "lucide-react"

export default async function TeamPage() {
  let data = {
    members: [] as {
      user_id: string
      role: string
      is_active: boolean
      created_at: string
      name: string | null
      email: string | null
    }[],
    invitations: [] as { id: string; email: string; role: string; status: string; created_at: string; accepted_at: string | null }[],
    clubSlug: '',
  }

  try {
    data = await getTeamData()
  } catch { /* silent */ }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7" /> Equipo
        </h1>
        <p className="text-muted-foreground">Invita administradores y entrenadores a tu club</p>
      </div>
      <TeamManager
        members={data.members}
        invitations={data.invitations}
        clubSlug={data.clubSlug}
      />
    </div>
  )
}
