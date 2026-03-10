import { NextRequest, NextResponse } from 'next/server'
import { handleGestdocWebhook } from '@/lib/actions/agreements'

// Webhook endpoint for GESTDOC callbacks
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // Validate required fields
    if (!payload.documentId || !payload.status) {
      return NextResponse.json(
        { error: 'Missing required fields: documentId, status' },
        { status: 400 }
      )
    }

    // Validate status
    if (!['signed', 'rejected'].includes(payload.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "signed" or "rejected"' },
        { status: 400 }
      )
    }

    // Process webhook
    const result = await handleGestdocWebhook({
      documentId: payload.documentId,
      status: payload.status,
      signerRut: payload.signerRut,
      signerName: payload.signerName,
      signedDocumentUrl: payload.signedDocumentUrl,
      transactionId: payload.transactionId,
      signedAt: payload.signedAt,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GESTDOC webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error processing webhook' },
      { status: 500 }
    )
  }
}
