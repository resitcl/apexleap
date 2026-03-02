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
  PieChart,
  Film,
  Dumbbell,
  User,
  ClipboardList,
} from "lucide-react"
import Image from "next/image"
import { MobileSidebar } from "@/components/layouts/MobileSidebar"
import { DesktopNavItem } from "@/components/layouts/DesktopNavItem"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"
import { getSidebarAlerts } from "@/lib/actions/alerts"

export const sidebarItems = [
  { href: "/dashboard",               label: "Dashboard",      icon: LayoutDashboard },
  { href: "/dashboard/coach",          label: "Entrenador",     icon: Dumbbell },
  { href: "/dashboard/athlete",        label: "Mi Portal",      icon: User },
  { href: "/dashboard/athletes",      label: "Alumnos",        icon: Users },
  { href: "/dashboard/plans",         label: "Planes",         icon: BookOpen },
  { href: "/dashboard/subscriptions", label: "Suscripciones",  icon: Repeat2 },
  { href: "/dashboard/payments",      label: "Pagos",          icon: CreditCard },
  { href: "/dashboard/finances",      label: "Finanzas",       icon: BarChart3 },
  { href: "/dashboard/attendance",    label: "Asistencia",     icon: ClipboardCheck },
  { href: "/dashboard/calendar",      label: "Calendario",     icon: Calendar },
  { href: "/dashboard/rules",         label: "Reglas",         icon: ShieldCheck },
  { href: "/dashboard/competitions",  label: "Competencias",   icon: Trophy },
  { href: "/dashboard/rosters",       label: "Nóminas",        icon: ClipboardList },
  { href: "/dashboard/stats",          label: "Analytics",      icon: PieChart },
  { href: "/dashboard/media",          label: "Media Hub",      icon: Film },
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
  let alerts = {
    overduePayments: 0, expiringSoonDocs: 0, expiringSubscriptions: 0,
    clubName: null as string | null,
    primaryColor: null as string | null,
    secondaryColor: null as string | null,
    logoUrl: null as string | null,
  }
  try { alerts = await getSidebarAlerts() } catch { /* silent */ }

  const brandColor = alerts.primaryColor ?? '#000000'

  const badgeMap: Record<string, number> = {
    "/dashboard/payments":      alerts.overduePayments,
    "/dashboard/documents":     alerts.expiringSoonDocs,
    "/dashboard/subscriptions": alerts.expiringSubscriptions,
  }

  const sidebarItemsWithBadges = sidebarItems.map((item) => ({
    href:  item.href,
    label: item.label,
    icon:  <item.icon className="w-4 h-4 shrink-0" />,
    badge: badgeMap[item.href] ?? 0,
  }))

  return (
    <div className="min-h-screen flex" style={{ ['--brand' as string]: brandColor, ['--brand-light' as string]: `${brandColor}20` }}>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            {alerts.logoUrl ? (
              <Image src={alerts.logoUrl} alt={alerts.clubName ?? 'Club'} width={36} height={36} className="rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm" style={{ backgroundColor: brandColor }}>
                {(alerts.clubName ?? 'AL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{alerts.clubName ?? 'ApexLeap'}</p>
              <p className="text-xs text-muted-foreground leading-tight">Performance Hub</p>
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

        <div className="p-3 border-t border-border space-y-2">
          <ThemeToggle />
          <div className="flex items-center gap-3 px-1">
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
            {alerts.logoUrl ? (
              <Image src={alerts.logoUrl} alt={alerts.clubName ?? 'Club'} width={28} height={28} className="rounded-md object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: brandColor }}>
                {(alerts.clubName ?? 'AL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-semibold">{alerts.clubName ?? 'ApexLeap'}</span>
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
