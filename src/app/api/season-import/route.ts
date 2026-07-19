import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClubId, getClubMembershipRole, isClubAdminRole } from '@/lib/actions/club-context'
import { importSeasonWorkbook, SeasonImportError } from '@/lib/season-import'

/**
 * POST /api/season-import — importa una temporada completa desde un .xlsx
 * (una hoja resumen "YYYY-N" + una hoja por partido).
 *
 * multipart/form-data con key "file". El club se deriva SIEMPRE del usuario
 * autenticado (Clerk → user_clubs); nunca se acepta un club_id del cliente.
 * Solo administradores del club (admin | admin_athlete).
 *
 * Con el campo opcional dry_run=1 devuelve la VISTA PREVIA del plan (matching
 * de jugadores, partidos a crear/actualizar, eventos) sin escribir nada.
 */
export async function POST(req: NextRequest) {
  // Auth guard: sesión + rol admin en el club activo
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let clubId: string
  try {
    clubId = await getClubId()
    const role = await getClubMembershipRole()
    if (!isClubAdminRole(role)) {
      return NextResponse.json(
        { error: 'Solo administradores del club pueden importar temporadas' },
        { status: 403 }
      )
    }
  } catch {
    return NextResponse.json({ error: 'No perteneces a ningún club activo' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    // Límites de subida: evita DoS por memoria y abuso del parser xlsx.
    const MAX_IMPORT_BYTES = 5 * 1024 * 1024 // 5 MB
    if (file.size === 0) return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 })
    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: 'El archivo supera el límite de 5 MB' }, { status: 413 })
    }
    // Solo .xlsx, consistente con el diálogo (SeasonImportDialog) y el mensaje.
    if (!/\.xlsx$/.test((file.name || '').toLowerCase())) {
      return NextResponse.json({ error: 'Formato no soportado. Usa un archivo .xlsx' }, { status: 415 })
    }

    const dryRun = String(formData.get('dry_run') ?? '') === '1'
    const buffer = Buffer.from(await file.arrayBuffer())
    const supabase = createAdminClient()
    const result = await importSeasonWorkbook(buffer, clubId, supabase, { dryRun })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof SeasonImportError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error inesperado' },
      { status: 500 }
    )
  }
}
