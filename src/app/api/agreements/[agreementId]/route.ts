import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agreementId: string }> }
) {
  const { agreementId } = await params
  const supabase = createAdminClient()

  const { data: agreement, error } = await supabase
    .from('athlete_agreements')
    .select(`
      id,
      status,
      document_content,
      gestdoc_signing_url,
      signed_at,
      signer_name,
      signer_rut,
      valid_until,
      template:agreement_templates(
        name,
        description
      ),
      clubs(
        name,
        logo_url
      )
    `)
    .eq('id', agreementId)
    .single()

  if (error || !agreement) {
    return NextResponse.json(
      { error: 'Acuerdo no encontrado' },
      { status: 404 }
    )
  }

  // Format response
  const response = {
    id: agreement.id,
    status: agreement.status,
    document_content: agreement.document_content,
    gestdoc_signing_url: agreement.gestdoc_signing_url,
    signed_at: agreement.signed_at,
    signer_name: agreement.signer_name,
    template: agreement.template,
    club: agreement.clubs,
  }

  return NextResponse.json(response)
}
