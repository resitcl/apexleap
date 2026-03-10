import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { checkGestdocProcessStatus } from '@/lib/actions/agreements'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agreementId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { agreementId } = await params

    const status = await checkGestdocProcessStatus(agreementId)

    return NextResponse.json({
      success: true,
      status: status.status,
      signedDocumentUrl: status.signed_document_url,
    })
  } catch (error) {
    console.error('Check agreement status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al verificar' },
      { status: 500 }
    )
  }
}
