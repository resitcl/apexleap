import React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { isSuperAdmin } from "@/lib/actions/super-admin"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"
import { UserNavClient } from "@/components/layouts/UserNavClient"
import { SuperAdminChatWidget } from "@/components/super-admin/SuperAdminChatWidget"
import { SuperAdminNav } from "@/components/super-admin/SuperAdminNav"
import { MobileSidebar } from "@/components/layouts/MobileSidebar"
import { ShieldAlert, LayoutDashboard, Building2, CreditCard, ChevronLeft } from "lucide-react"

const MOBILE_NAV_GROUPS = [
  {
    label: null as string | null,
    items: [
      { href: "/super-admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/super-admin/clubs", label: "Clubes", icon: Building2 },
      { href: "/super-admin/billing", label: "Facturación SaaS", icon: CreditCard },
    ],
  },
]

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const ok = await isSuperAdmin()
  if (!ok) redirect("/dashboard")

  const mobileGroups = MOBILE_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      href: item.href,
      label: item.label,
      icon: <item.icon className="w-4 h-4 shrink-0" />,
    })),
  }))

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
        <header className="h-16 border-b border-border flex items-center px-3 sm:px-4 bg-zinc-950 gap-2 shrink-0">
          <div className="md:hidden flex items-center gap-2 min-w-0 flex-1">
            <MobileSidebar
              variant="dark"
              groups={mobileGroups}
              clubName="Super Admin"
              subtitle="ApexLeap HQ"
              brandColor="#dc2626"
              showSuperAdminLink={false}
              footerExtra={
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-[7px] rounded-xl text-[12px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors w-full"
                >
                  <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                  Volver al Dashboard
                </Link>
              }
            />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-red-600/90 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-zinc-100 truncate">Super Admin</span>
            </div>
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
