'use client'

import { useRouter } from 'next/navigation'
import { AthleteProfileOnboarding } from './AthleteProfileOnboarding'
import type { OnboardingData } from '@/lib/actions/athlete-enrollment'
import type { SportConfig } from '@/lib/sport-fields'

interface Props {
  data: OnboardingData
  sportConfig: SportConfig | null
}

export function AthleteProfileOnboardingWrapper({ data, sportConfig }: Props) {
  const router = useRouter()

  function handleComplete() {
    // Router refresh will re-fetch onboarding data and show tour or dashboard
    router.refresh()
  }

  return (
    <AthleteProfileOnboarding
      data={data}
      sportConfig={sportConfig}
      onComplete={handleComplete}
    />
  )
}
