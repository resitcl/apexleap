import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { isSuperAdmin } from "@/lib/actions/super-admin"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"
import { UserNavClient } from "@/components/layouts/UserNavClient"
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  ShieldAlert,
  ChevronRight,
} from "lucide-react"

const NAV = [
  { href: "/super-admin",         label: "Dashboard",  icon: LayoutDashboard },
  { href: "/super-admin/clubs",   label: "Clubes",     icon: Building2 },
  { href: "/super-admin/billing", label: "Facturación SaaS", icon: CreditCard },
]

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isSuperAdmin()
  if (!ok) redirect("/dashboard")

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-950 text-zinc-100 hidden md:flex flex-col shrink-0 h-full border-r border-zinc-800">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-zinc-800 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Super Admin</p>
            <p className="text-[10px] text-zinc-400 leading-tight">ApexLeap HQ</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 pt-4 border-t border-zinc-800">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
              Volver al Dashboard
            </Link>
          </div>
        </nav>

        <div className="shrink-0 border-t border-zinc-800 p-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        <header className="h-14 border-b border-border flex items-center px-4 bg-card gap-3 shrink-0">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">Super Admin</span>
          </div>
          <div className="flex gap-3 overflow-x-auto md:hidden flex-1">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex-1 hidden md:block" />
          <UserNavClient />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
