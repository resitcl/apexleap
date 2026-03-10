import { NextResponse } from 'next/server'
import { getCurrentUserPendingAgreements } from '@/lib/actions/agreements'

export async function GET() {
  try {
    const result = await getCurrentUserPendingAgreements()

    return NextResponse.json({
      hasPending: result.hasPending,
      count: result.agreements.length,
    })
  } catch (error) {
    // On error, return no pending to avoid blocking users
    console.error('Check pending agreements error:', error)
    return NextResponse.json({ hasPending: false, count: 0 })
  }
}
