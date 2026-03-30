import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { isSuperAdmin } from "@/lib/actions/super-admin"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"
import { UserNavClient } from "@/components/layouts/UserNavClient"
import { SuperAdminChatWidget } from "@/components/super-admin/SuperAdminChatWidget"
import { SuperAdminNav } from "@/components/super-admin/SuperAdminNav"
import { ShieldAlert, LayoutDashboard, Building2, CreditCard } from "lucide-react"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isSuperAdmin()
  if (!ok) redirect("/dashboard")

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-zinc-950 text-zinc-100 hidden md:flex flex-col shrink-0 h-full border-r border-zinc-800/80">

        {/* Header */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-zinc-800/80 shrink-0">
          <div className="w-[34px] h-[34px] rounded-xl bg-red-600/90 flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight text-zinc-100">Super Admin</p>
            <p className="text-[10px] text-zinc-500 leading-tight font-medium uppercase tracking-wider">ApexLeap HQ</p>
          </div>
        </div>

        {/* Nav with active state */}
        <SuperAdminNav />

        {/* Bottom */}
        <div className="shrink-0 border-t border-zinc-800/80 p-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        <header className="h-16 border-b border-border flex items-center px-4 bg-zinc-950 gap-3 shrink-0">
          {/* Mobile: icon + horizontal tabs */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-xl bg-red-600/90 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Super Admin</span>
          </div>
          <div className="flex gap-1 overflow-x-auto md:hidden flex-1 ml-2">
            {[
              { href: "/super-admin",         label: "Dashboard",   icon: LayoutDashboard },
              { href: "/super-admin/clubs",   label: "Clubes",      icon: Building2 },
              { href: "/super-admin/billing", label: "Facturación", icon: CreditCard },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 whitespace-nowrap transition-colors"
              >
                <item.icon className="w-3.5 h-3.5" />
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
      <SuperAdminChatWidget />
    </div>
  )
}
