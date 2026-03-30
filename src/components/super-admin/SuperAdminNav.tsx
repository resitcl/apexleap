'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Building2, CreditCard, ChevronLeft } from "lucide-react"

const NAV = [
  { href: "/super-admin",         label: "Dashboard",        icon: LayoutDashboard },
  { href: "/super-admin/clubs",   label: "Clubes",           icon: Building2 },
  { href: "/super-admin/billing", label: "Facturación SaaS", icon: CreditCard },
]

export function SuperAdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-2">
      <ul className="space-y-px">
        {NAV.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/super-admin" && pathname.startsWith(item.href))
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-[7px] rounded-xl text-[13px] transition-all duration-150 ${
                  isActive
                    ? "bg-red-500/15 text-red-400 font-semibold"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80"
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-red-400" : "text-zinc-500"}`} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 pt-4 border-t border-zinc-800/80">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-[7px] rounded-xl text-[12px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
          Volver al Dashboard
        </Link>
      </div>
    </nav>
  )
}
