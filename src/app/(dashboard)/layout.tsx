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
  MapPin
} from "lucide-react"

const sidebarItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/athletes", label: "Alumnos", icon: Users },
  { href: "/dashboard/payments", label: "Pagos", icon: CreditCard },
  { href: "/dashboard/calendar", label: "Calendario", icon: Calendar },
  { href: "/dashboard/attendance", label: "Asistencia", icon: ClipboardCheck },
  { href: "/dashboard/competitions", label: "Competencias", icon: Trophy },
  { href: "/dashboard/documents", label: "Documentos", icon: FileText },
  { href: "/dashboard/inventory", label: "Inventario", icon: Package },
  { href: "/dashboard/venues", label: "Sedes", icon: MapPin },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AL</span>
            </div>
            <span className="font-semibold text-lg">ApexLeap</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {sidebarItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Mi Cuenta</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
          <div className="md:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">AL</span>
              </div>
            </Link>
          </div>
          <div className="flex-1" />
          <div className="md:hidden">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 bg-background overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
