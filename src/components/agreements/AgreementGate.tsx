import { redirect } from 'next/navigation'
import { getCurrentUserPendingAgreements } from '@/lib/actions/agreements'

interface Props {
  children: React.ReactNode
  bypassPaths?: string[]
}

export async function AgreementGate({ children }: Props) {
  try {
    const result = await getCurrentUserPendingAgreements()

    // If user has pending agreements, redirect to agreements page
    if (result.hasPending && result.athleteId) {
      redirect('/dashboard/agreements')
    }
  } catch {
    // If there's an error checking agreements, allow access
    // This prevents blocking users if the agreements system fails
  }

  return <>{children}</>
}
