import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAthleteAgreement, sendAgreementToGestdoc } from '@/lib/actions/agreements'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, agreementId } = body

    if (!templateId) {
      return NextResponse.json({ error: 'templateId requerido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get athlete for current user
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, club_id')
      .eq('user_id', userId)
      .single()

    if (!athlete) {
      return NextResponse.json({ error: 'Atleta no encontrado' }, { status: 404 })
    }

    let finalAgreementId = agreementId

    // If no agreement exists, create one
    if (!finalAgreementId) {
      const newAgreement = await createAthleteAgreement({
        athleteId: athlete.id,
        templateId,
      })
      finalAgreementId = newAgreement.id
    }

    // Send to GESTDOC for signing
    const updated = await sendAgreementToGestdoc(finalAgreementId)

    return NextResponse.json({
      success: true,
      agreementId: updated.id,
      signingUrl: updated.gestdoc_signing_url,
      status: updated.status,
    })
  } catch (error) {
    console.error('Create and send agreement error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar' },
      { status: 500 }
    )
  }
}
