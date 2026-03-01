'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props { month: string; tab: string }

export function MonthPicker({ month, tab }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', e.target.value)
    params.set('tab', tab)
    router.push(`/dashboard/finances?${params.toString()}`)
  }

  return (
    <input
      type="month"
      defaultValue={month}
      onChange={handleChange}
      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
    />
  )
}
