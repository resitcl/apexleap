import { redirect } from "next/navigation"

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FinancesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const entry of value) qs.append(key, entry)
    } else if (value != null) {
      qs.set(key, value)
    }
  }
  redirect(`/dashboard/finances${qs.toString() ? `?${qs.toString()}` : ''}`)
}
