import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  ClipboardCheck,
  Settings,
  Trophy,
  FileText,
  Package,
  MapPin,
  BookOpen,
  ShieldCheck,
  Repeat2,
  BarChart3,
} from "lucide-react"
import { MobileSidebar } from "@/components/layouts/MobileSidebar"
import { DesktopNavItem } from "@/components/layouts/DesktopNavItem"
import { getSidebarAlerts } from "@/lib/actions/alerts"

export const sidebarItems = [
  { href: "/dashboard",               label: "Dashboard",      icon: LayoutDashboard },
  { href: "/dashboard/athletes",      label: "Alumnos",        icon: Users },
  { href: "/dashboard/plans",         label: "Planes",         icon: BookOpen },
  { href: "/dashboard/subscriptions", label: "Suscripciones",  icon: Repeat2 },
  { href: "/dashboard/payments",      label: "Pagos",          icon: CreditCard },
  { href: "/dashboard/finances",      label: "Finanzas",       icon: BarChart3 },
  { href: "/dashboard/attendance",    label: "Asistencia",     icon: ClipboardCheck },
  { href: "/dashboard/calendar",      label: "Calendario",     icon: Calendar },
  { href: "/dashboard/rules",         label: "Reglas",         icon: ShieldCheck },
  { href: "/dashboard/competitions",  label: "Competencias",   icon: Trophy },
  { href: "/dashboard/documents",     label: "Documentos",     icon: FileText },
  { href: "/dashboard/inventory",     label: "Inventario",     icon: Package },
  { href: "/dashboard/venues",        label: "Sedes",          icon: MapPin },
  { href: "/dashboard/settings",      label: "Configuración",  icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let alerts = { overduePayments: 0, expiringSoonDocs: 0, clubName: null as string | null }
  try { alerts = await getSidebarAlerts() } catch { /* silent */ }

  const badgeMap: Record<string, number> = {
    "/dashboard/payments":  alerts.overduePayments,
    "/dashboard/documents": alerts.expiringSoonDocs,
  }

  const sidebarItemsWithBadges = sidebarItems.map((item) => ({
    ...item,
    badge: badgeMap[item.href] ?? 0,
  }))

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-sm">AL</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{alerts.clubName ?? "ApexLeap"}</p>
              <p className="text-xs text-muted-foreground leading-tight">ApexLeap</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {sidebarItemsWithBadges.map((item) => (
              <li key={item.href}>
                <DesktopNavItem href={item.href} label={item.label} icon={item.icon} badge={item.badge} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <p className="text-sm font-medium truncate flex-1">Mi Cuenta</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 border-b border-border flex items-center px-4 bg-card gap-3 shrink-0">
          {/* Mobile hamburger */}
          <div className="md:hidden">
            <MobileSidebar items={sidebarItemsWithBadges} />
          </div>
          {/* Logo (mobile) */}
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">AL</span>
            </div>
            <span className="font-semibold">ApexLeap</span>
          </Link>
          <div className="flex-1" />
          <div className="md:hidden">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 bg-background overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
