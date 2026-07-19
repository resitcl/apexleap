import React from "react"
import type { Metadata } from "next"
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
  Library,
  Dumbbell,
  User,
  ClipboardList,
  Swords,
  Globe,
  Megaphone,
} from "lucide-react"
import Image from "next/image"
import { MobileSidebar } from "@/components/layouts/MobileSidebar"
import { DesktopNavItem } from "@/components/layouts/DesktopNavItem"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"
import { getSidebarAlerts } from "@/lib/actions/alerts"
import { NotificationBell } from "@/components/layouts/NotificationBell"
import { ChileDateTimeHeader } from "@/components/layouts/ChileDateTimeHeader"
import type { NotificationItem } from "@/components/layouts/NotificationBell"
import { getClubSettings } from "@/lib/actions/settings"
import { clubThemeBrandingVars, normalizeClubPrimary } from "@/lib/club-branding"
import { isMartialArtsAcademySport } from "@/lib/sport-fields"
import { getSportVocab } from "@/lib/sport-vocab"
import { isSuperAdmin } from "@/lib/actions/super-admin"
import { AgreementGateWrapper } from "@/components/agreements/AgreementGateWrapper"
import { ClubBrandingRoot } from "@/components/layouts/ClubBrandingRoot"
import { canAccessClubAiChat, getClubInfo, getClubMembershipRole, getCoachPermissions } from "@/lib/actions/club-context"

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { slug, name, logo_url: logoUrl } = await getClubInfo()
    const logo = logoUrl ?? undefined
    return {
      manifest: `/${slug}/manifest`,
      appleWebApp: {
        capable: true,
        title: name,
        statusBarStyle: "default",
      },
      ...(logo
        ? {
            icons: {
              icon: [{ url: logo }],
              apple: [{ url: logo }],
            },
          }
        : {}),
    }
  } catch {
    return {}
  }
}

/** Items del portal atleta (una sola fuente para menú atleta y sección «Como jugador» del admin+atleta). */
function collectAthletePortalNavParts(v: ReturnType<typeof getSportVocab>, sportType: string | null) {
  const actividadItems = [
    { href: "/dashboard/athlete/schedule",    label: "Horarios",    icon: Calendar },
    ...(isMartialArtsAcademySport(sportType)
      ? [{ href: "/dashboard/athlete/logros" as const, label: "Torneos y logros", icon: Trophy }]
      : []),
    { href: "/dashboard/athlete/attendance",  label: "Asistencia",  icon: ClipboardCheck },
    { href: "/dashboard/athlete/content",     label: "Contenido",   icon: Library },
  ]

  if (v.isTeamSport) {
    actividadItems.push(
      { href: "/dashboard/athlete/rosters",  label: "Mis Citaciones", icon: ClipboardList },
      { href: "/dashboard/athlete/matches",  label: "Mis Partidos",   icon: Swords },
      { href: "/dashboard/athlete/stats",    label: "Mis Stats",      icon: BarChart3 },
    )
  }

  const entryItems = [
    { href: "/dashboard/athlete",         label: "Mi Portal",    icon: User },
    { href: "/dashboard/athlete/profile", label: "Mi Perfil",    icon: PenLine },
  ]

  const cuentaItems = [
    { href: "/dashboard/athlete/payments",     label: "Mis Pagos",        icon: CreditCard },
    { href: "/dashboard/athlete/subscription", label: "Mi Suscripción",   icon: Repeat2 },
    { href: "/dashboard/athlete/documents",    label: "Mis Documentos",   icon: FileText },
  ]

  return { entryItems, actividadItems, cuentaItems }
}

function buildAthleteNavGroups(v: ReturnType<typeof getSportVocab>, sportType: string | null) {
  const { entryItems, actividadItems, cuentaItems } = collectAthletePortalNavParts(v, sportType)
  return [
    { label: null, items: entryItems },
    { label: "Actividad", items: actividadItems },
    { label: "Mi Cuenta", items: cuentaItems },
  ]
}

/**
 * Staff + jugador: mismo panel de gestión, pero con bloque explícito «Como jugador»
 * (evita esconder el portal atleta bajo «Cuenta»).
 */
function buildAdminAthleteNavGroups(v: ReturnType<typeof getSportVocab>, sportType: string | null) {
  const { entryItems, actividadItems, cuentaItems } = collectAthletePortalNavParts(v, sportType)
  const comoJugadorItems = [...entryItems, ...actividadItems, ...cuentaItems]
  const staffFromDeportivo = buildNavGroups(v, { accountHideMiPortal: true }).slice(1)
  return [
    {
      label: null,
      items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    { label: "Como jugador", items: comoJugadorItems },
    ...staffFromDeportivo,
  ]
}

function buildNavGroups(v: ReturnType<typeof getSportVocab>, options?: { accountHideMiPortal?: boolean }) {
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
        { href: "/dashboard/communications", label: "Comunicaciones", icon: Megaphone },
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
        ...(options?.accountHideMiPortal
          ? []
          : [{ href: "/dashboard/athlete", label: "Mi Portal", icon: User }]),
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
    pendingEnrollments: 0, paidToday: 0,
    clubName: null as string | null,
    primaryColor: null as string | null,
    secondaryColor: null as string | null,
    logoUrl: null as string | null,
    useBrandPrimaryForUi: true,
  }
  try { alerts = await getSidebarAlerts() } catch { /* silent */ }

  let sportType: string | null = null
  let superAdmin = false
  try {
    const settings = await getClubSettings()
    sportType = (settings as { sport_type?: string | null })?.sport_type ?? null
  } catch { /* silent */ }
  try { superAdmin = await isSuperAdmin() } catch { /* silent */ }

  let membershipRole = 'admin'
  try {
    membershipRole = await getClubMembershipRole()
  } catch { /* silent */ }
  const isAthleteOnly = membershipRole === 'athlete'
  const isAdminAthlete = membershipRole === 'admin_athlete'
  const isCoach = membershipRole === 'coach'

  let coachPerms: Awaited<ReturnType<typeof getCoachPermissions>> | null = null
  if (isCoach) {
    try { coachPerms = await getCoachPermissions() } catch { /* silent */ }
  }

  let showClubAiChat = false
  try {
    showClubAiChat = await canAccessClubAiChat()
  } catch {
    showClubAiChat = false
  }

  const vocab = getSportVocab(sportType)
  let NAV_GROUPS = isAthleteOnly
    ? buildAthleteNavGroups(vocab, sportType)
    : isAdminAthlete
      ? buildAdminAthleteNavGroups(vocab, sportType)
      : buildNavGroups(vocab)

  // El coach ve el menú de staff, pero ocultamos las secciones que el admin no le haya delegado.
  if (isCoach && coachPerms) {
    const perms = coachPerms
    NAV_GROUPS = NAV_GROUPS
      .filter((g) => g.label !== 'Finanzas' || perms.finances)
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => {
          if (it.href === '/dashboard/rules') return perms.rules
          if (it.href === '/dashboard/settings/team') return perms.team
          if (it.href === '/dashboard/settings/landing') return perms.club_config
          return true
        }),
      }))
  }

  const brandColor = normalizeClubPrimary(alerts.primaryColor)
  const brandCss = clubThemeBrandingVars(alerts.primaryColor, alerts.useBrandPrimaryForUi)

  const badgeMap: Record<string, number> = {
    "/dashboard/payments":      alerts.overduePayments,
    "/dashboard/documents":     alerts.expiringSoonDocs,
    "/dashboard/subscriptions": alerts.expiringSubscriptions,
    "/dashboard/athletes":      alerts.pendingEnrollments,
  }

  const notificationIdMap: Record<string, string> = {
    "/dashboard/payments":      'overdue-payments',
    "/dashboard/documents":     'expiring-docs',
    "/dashboard/subscriptions": 'expiring-subs',
    "/dashboard/athletes":      'pending-enrollments',
  }

  /** Enlaces solo para staff; los atletas no deben ver rutas de administración en la campana. */
  const notificationItems: NotificationItem[] = isAthleteOnly
    ? []
    : [
        ...(alerts.pendingEnrollments > 0 ? [{
          id: 'pending-enrollments',
          type: 'enrollment' as const,
          title: `${alerts.pendingEnrollments} ${alerts.pendingEnrollments === 1 ? 'inscripción pendiente' : 'inscripciones pendientes'}`,
          description: 'Nuevos atletas esperando aprobación del club.',
          href: '/dashboard/athletes/pending',
          count: alerts.pendingEnrollments,
        }] : []),
        ...(alerts.pendingEnrollmentPaid > 0 ? [{
          id: 'pending-enrollment-paid',
          type: 'enrollment' as const,
          title: `${alerts.pendingEnrollmentPaid} ${alerts.pendingEnrollmentPaid === 1 ? 'inscripción pagada por revisar' : 'inscripciones pagadas por revisar'}`,
          description: 'Atletas con pago de inscripción confirmado, pendientes de aprobación.',
          href: '/dashboard/athletes/pending',
          count: alerts.pendingEnrollmentPaid,
        }] : []),
        ...(alerts.paidToday > 0 ? [{
          id: 'paid-today',
          type: 'payment_success' as const,
          title: `${alerts.paidToday} ${alerts.paidToday === 1 ? 'pago registrado hoy' : 'pagos registrados hoy'}`,
          description: 'Pagos confirmados durante el día.',
          href: '/dashboard/payments?status=paid',
          count: alerts.paidToday,
        }] : []),
        ...(alerts.overduePayments > 0 ? [{
          id: 'overdue-payments',
          type: 'payment' as const,
          title: `${alerts.overduePayments} ${alerts.overduePayments === 1 ? 'pago vencido' : 'pagos vencidos'}`,
          description: `${vocab.athletes} con cuotas en mora. Se requiere acción.`,
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

  const brandingStyle = {
    '--brand': brandColor,
    '--brand-light': `${brandColor}33`,
    ...brandCss,
  } as React.CSSProperties

  return (
    <div className="h-screen flex overflow-hidden" style={brandingStyle} suppressHydrationWarning>
      <ClubBrandingRoot varsJson={JSON.stringify(brandCss)} />
      {/* ── Desktop Sidebar ── */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col shrink-0 h-full">
        {/* Club logo / name */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0 flex-1 group">
            {alerts.logoUrl ? (
              <Image src={alerts.logoUrl} alt={alerts.clubName ?? 'Club'} width={34} height={34} className="rounded-xl object-cover shrink-0 shadow-sm" />
            ) : (
              <div
                className="w-[34px] h-[34px] rounded-xl flex items-center justify-center shrink-0 text-white font-black text-sm shadow-sm"
                style={{ backgroundColor: brandColor }}
              >
                {(alerts.clubName ?? 'AL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-[13px] leading-tight truncate">{alerts.clubName ?? 'ApexLeap'}</p>
              <p className="text-[10px] text-muted-foreground/50 leading-tight font-medium uppercase tracking-wider">
                {isAdminAthlete ? 'Admin + jugador' : 'Performance Hub'}
              </p>
            </div>
          </Link>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-5" : ""}>
              {group.label && (
                <div className="flex items-center gap-2 px-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/35 shrink-0">{group.label}</span>
                  <div className="h-px bg-border/40 flex-1" />
                </div>
              )}
              <ul className="space-y-px">
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
          <div className="shrink-0 border-t border-border px-2 py-2">
            <Link
              href="/super-admin"
              className="flex items-center gap-2 px-3 py-[7px] rounded-xl text-[11px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/10 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Super Admin
            </Link>
          </div>
        )}

        {/* Bottom: theme toggle */}
        <div className="shrink-0 border-t border-border p-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* ── Right side ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top Header */}
        <header className="h-16 border-b border-border flex items-center px-4 bg-sidebar gap-3 shrink-0">
          {/* Mobile hamburger */}
          <div className="md:hidden shrink-0">
            <MobileSidebar
              groups={sidebarGroupsWithBadges}
              clubName={alerts.clubName}
              logoUrl={alerts.logoUrl}
              brandColor={brandColor}
              showSuperAdminLink={superAdmin}
            />
          </div>

          {/* Mobile logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 md:hidden">
            {alerts.logoUrl ? (
              <Image src={alerts.logoUrl} alt={alerts.clubName ?? 'Club'} width={28} height={28} className="rounded-xl object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: brandColor }}>
                {(alerts.clubName ?? 'AL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-bold text-sm">{alerts.clubName ?? 'ApexLeap'}</span>
          </Link>

          <div className="flex-1" />

          {/* Hora Chile (staff) — junto a notificaciones */}
          {!isAthleteOnly && (
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <ChileDateTimeHeader />
              <NotificationBell notifications={notificationItems} />
            </div>
          )}
          {isAthleteOnly && <NotificationBell notifications={notificationItems} />}

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

        {showClubAiChat && <ChatWidget />}
      </div>
    </div>
  )
}
