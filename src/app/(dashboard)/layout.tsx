import React from "react"
import { UserNavClient } from "@/components/layouts/UserNavClient"
import { ChatWidget } from "@/components/layouts/ChatWidget"
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
  PenLine,
  ShieldCheck,
  ShieldAlert,
  Repeat2,
  BarChart3,
  PieChart,
  Film,
  Dumbbell,
  User,
  ClipboardList,
  Swords,
  Globe,
} from "lucide-react"
import Image from "next/image"
import { MobileSidebar } from "@/components/layouts/MobileSidebar"
import { DesktopNavItem } from "@/components/layouts/DesktopNavItem"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"
import { getSidebarAlerts } from "@/lib/actions/alerts"
import { NotificationBell } from "@/components/layouts/NotificationBell"
import type { NotificationItem } from "@/components/layouts/NotificationBell"
import { getClubSettings } from "@/lib/actions/settings"
import { getSportVocab } from "@/lib/sport-vocab"
import { isSuperAdmin } from "@/lib/actions/super-admin"
import { AgreementGateWrapper } from "@/components/agreements/AgreementGateWrapper"
import { getUserRole } from "@/lib/actions/club-context"
import type { UserRole } from "@/lib/actions/club-context"

function buildAthleteNavGroups(v: ReturnType<typeof getSportVocab>) {
  const actividadItems = [
    { href: "/dashboard/athlete/schedule",    label: "Horarios",    icon: Calendar },
    { href: "/dashboard/athlete/attendance",  label: "Asistencia",  icon: ClipboardCheck },
    { href: "/dashboard/athlete/content",     label: "Contenido",   icon: Film },
  ]

  // Team-sport-only modules for athletes
  if (v.isTeamSport) {
    actividadItems.push(
      { href: "/dashboard/athlete/rosters",  label: "Mis Citaciones", icon: ClipboardList },
      { href: "/dashboard/athlete/matches",  label: "Mis Partidos",   icon: Swords },
      { href: "/dashboard/athlete/stats",    label: "Mis Stats",      icon: BarChart3 },
    )
  }

  return [
    {
      label: null,
      items: [
        { href: "/dashboard/athlete",         label: "Mi Portal",    icon: User },
        { href: "/dashboard/athlete/profile", label: "Mi Perfil",    icon: PenLine },
      ],
    },
    {
      label: "Actividad",
      items: actividadItems,
    },
    {
      label: "Mi Cuenta",
      items: [
        { href: "/dashboard/athlete/payments",     label: "Mis Pagos",        icon: CreditCard },
        { href: "/dashboard/athlete/subscription", label: "Mi Suscripción",   icon: Repeat2 },
        { href: "/dashboard/athlete/documents",    label: "Mis Documentos",   icon: FileText },
      ],
    },
  ]
}

function buildNavGroups(v: ReturnType<typeof getSportVocab>) {
  const deportivoItems = [
    { href: "/dashboard/athletes",    label: v.athletes,       icon: Users },
    { href: "/dashboard/attendance",  label: "Asistencia",     icon: ClipboardCheck },
    { href: "/dashboard/calendar",    label: "Calendario",     icon: Calendar },
    { href: "/dashboard/coach",       label: v.coach,          icon: Dumbbell },
  ]

  // Team-sport-only modules: rosters, competitions, matches, tactical board
  if (v.isTeamSport) {
    deportivoItems.push(
      { href: "/dashboard/rosters",      label: v.rosters,        icon: ClipboardList },
      { href: "/dashboard/competitions", label: v.competitions,   icon: Trophy },
      { href: "/dashboard/matches",      label: "Partidos",       icon: Swords },
      { href: "/dashboard/coach/board",  label: "Pizarra",        icon: PenLine },
    )
  }

  return [
    {
      label: null,
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Deportivo",
      items: deportivoItems,
    },
    {
      label: "Finanzas",
      items: [
        { href: "/dashboard/payments",      label: "Pagos",           icon: CreditCard },
        { href: "/dashboard/subscriptions", label: "Suscripciones",   icon: Repeat2 },
        { href: "/dashboard/plans",         label: "Planes",          icon: BookOpen },
        { href: "/dashboard/finances",      label: "Adm. Financiera", icon: BarChart3 },
      ],
    },
    {
      label: "Análisis",
      items: [
        { href: "/dashboard/stats", label: "Analytics", icon: PieChart },
      ],
    },
    {
      label: "Club",
      items: [
        { href: "/dashboard/documents",  label: "Documentos", icon: FileText },
        { href: "/dashboard/inventory",  label: "Inventario", icon: Package },
        { href: "/dashboard/media",      label: "Media Hub",  icon: Film },
        { href: "/dashboard/venues",     label: "Sedes",      icon: MapPin },
        { href: "/dashboard/rules",      label: "Reglas",     icon: ShieldCheck },
      ],
    },
    {
      label: "Cuenta",
      items: [
        { href: "/dashboard/athlete",           label: "Mi Portal",      icon: User },
        { href: "/dashboard/settings/team",   label: "Equipo",         icon: Users },
        { href: "/dashboard/settings/landing",label: "Landing page",   icon: Globe },
        { href: "/dashboard/settings",        label: "Configuración",  icon: Settings },
      ],
    },
  ]
}

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

  let sportType: string | null = null
  let superAdmin = false
  try {
    const settings = await getClubSettings()
    sportType = (settings as { sport_type?: string | null })?.sport_type ?? null
  } catch { /* silent */ }
  try { superAdmin = await isSuperAdmin() } catch { /* silent */ }

  let role: UserRole = 'admin'
  try { role = await getUserRole() } catch { /* silent */ }
  const isAthlete = role === 'athlete'

  const vocab = getSportVocab(sportType)
  const NAV_GROUPS = isAthlete ? buildAthleteNavGroups(vocab) : buildNavGroups(vocab)

  const brandColor = alerts.primaryColor ?? '#000000'

  const badgeMap: Record<string, number> = {
    "/dashboard/payments":      alerts.overduePayments,
    "/dashboard/documents":     alerts.expiringSoonDocs,
    "/dashboard/subscriptions": alerts.expiringSubscriptions,
  }

  const notificationIdMap: Record<string, string> = {
    "/dashboard/payments":      'overdue-payments',
    "/dashboard/documents":     'expiring-docs',
    "/dashboard/subscriptions": 'expiring-subs',
  }

  const totalAlerts = alerts.overduePayments + alerts.expiringSoonDocs + alerts.expiringSubscriptions

  const notificationItems: NotificationItem[] = [
    ...(alerts.overduePayments > 0 ? [{
      id: 'overdue-payments',
      type: 'payment' as const,
      title: `${alerts.overduePayments} ${alerts.overduePayments === 1 ? 'pago vencido' : 'pagos vencidos'}`,
      description: 'Alumnos con cuotas en mora. Se requiere acción.',
      href: '/dashboard/payments?status=overdue',
      count: alerts.overduePayments,
    }] : []),
    ...(alerts.expiringSoonDocs > 0 ? [{
      id: 'expiring-docs',
      type: 'document' as const,
      title: `${alerts.expiringSoonDocs} ${alerts.expiringSoonDocs === 1 ? 'documento por vencer' : 'documentos por vencer'}`,
      description: 'Vencen en los próximos 30 días.',
      href: '/dashboard/documents',
      count: alerts.expiringSoonDocs,
    }] : []),
    ...(alerts.expiringSubscriptions > 0 ? [{
      id: 'expiring-subs',
      type: 'subscription' as const,
      title: `${alerts.expiringSubscriptions} ${alerts.expiringSubscriptions === 1 ? 'suscripción por vencer' : 'suscripciones por vencer'}`,
      description: 'Suscripciones que vencen en los próximos 7 días.',
      href: '/dashboard/subscriptions',
      count: alerts.expiringSubscriptions,
    }] : []),
  ]

  const sidebarGroupsWithBadges = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      href:           item.href,
      label:          item.label,
      icon:           <item.icon className="w-4 h-4 shrink-0" />,
      badge:          badgeMap[item.href] ?? 0,
      notificationId: notificationIdMap[item.href],
    })),
  }))

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ '--brand': brandColor, '--brand-light': `${brandColor}20` } as React.CSSProperties}
      suppressHydrationWarning
    >
      {/* ── Desktop Sidebar ── */}
      <aside className="w-60 bg-card border-r border-border hidden md:flex flex-col shrink-0 h-full">
        {/* Club logo / name */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            {alerts.logoUrl ? (
              <Image src={alerts.logoUrl} alt={alerts.clubName ?? 'Club'} width={32} height={32} className="rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs" style={{ backgroundColor: brandColor }}>
                {(alerts.clubName ?? 'AL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{alerts.clubName ?? 'ApexLeap'}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Performance Hub</p>
            </div>
          </Link>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <DesktopNavItem
                      href={item.href}
                      label={item.label}
                      icon={<item.icon className="w-4 h-4 shrink-0" />}
                      badge={badgeMap[item.href] ?? 0}
                      notificationId={notificationIdMap[item.href]}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Super Admin link */}
        {superAdmin && (
          <div className="shrink-0 border-t border-border px-2 pt-2">
            <Link
              href="/super-admin"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Super Admin
            </Link>
          </div>
        )}

        {/* Bottom: theme toggle only */}
        <div className="shrink-0 border-t border-border p-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* ── Right side ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top Header */}
        <header className="h-14 border-b border-border flex items-center px-4 bg-card gap-3 shrink-0">
          {/* Mobile hamburger */}
          <div className="md:hidden">
            <MobileSidebar
            groups={sidebarGroupsWithBadges}
            clubName={alerts.clubName}
            logoUrl={alerts.logoUrl}
            brandColor={brandColor}
          />
          </div>

          {/* Mobile logo */}
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            {alerts.logoUrl ? (
              <Image src={alerts.logoUrl} alt={alerts.clubName ?? 'Club'} width={26} height={26} className="rounded-md object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: brandColor }}>
                {(alerts.clubName ?? 'AL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-sm">{alerts.clubName ?? 'ApexLeap'}</span>
          </Link>

          <div className="flex-1" />

          {/* Notifications bell */}
          <NotificationBell notifications={notificationItems} />

          {/* Divider */}
          <div className="w-px h-6 bg-border hidden md:block" />

          {/* User name + avatar (client-only to avoid hydration mismatch) */}
          <UserNavClient />
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          <AgreementGateWrapper>
            {children}
          </AgreementGateWrapper>
        </main>

        {/* AI Chat Assistant */}
        <ChatWidget />
      </div>
    </div>
  )
}
