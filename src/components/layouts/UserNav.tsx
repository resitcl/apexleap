'use client'

import { UserButton, useUser } from "@clerk/nextjs"

export function UserNav() {
  const { user } = useUser()
  const name = user?.firstName ?? user?.username ?? null

  return (
    <>
      <div className="hidden md:flex items-center gap-2.5">
        {name && (
          <span className="text-sm font-medium text-foreground">{name}</span>
        )}
        <UserButton afterSignOutUrl="/" />
      </div>
      <div className="md:hidden">
        <UserButton afterSignOutUrl="/" />
      </div>
    </>
  )
}
