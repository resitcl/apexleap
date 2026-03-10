'use client'

import { useEffect, useState } from 'react'
import { getSportLabels, type SportType } from '@/lib/constants/sport-labels'

type SportLabels = ReturnType<typeof getSportLabels>

export function useSportLabels(initialSportType?: string | null) {
  const [sportType, setSportType] = useState<string | null>(initialSportType ?? null)
  const [labels, setLabels] = useState<SportLabels>(getSportLabels(initialSportType))

  useEffect(() => {
    if (initialSportType !== undefined) {
      setSportType(initialSportType)
      setLabels(getSportLabels(initialSportType))
    }
  }, [initialSportType])

  return { sportType, labels }
}
