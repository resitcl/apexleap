'use client'

import dynamic from "next/dynamic"

const UserNavInner = dynamic(
  () => import("@/components/layouts/UserNav").then((m) => m.UserNav),
  { ssr: false }
)

export function UserNavClient() {
  return <UserNavInner />
}
