import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import { clubThemeBrandingVars, normalizeClubPrimary } from '@/lib/club-branding'

export type TenantClubBranding = {
  name: string
  logo_url?: string | null
  primary_color?: string | null
  use_brand_primary_for_ui?: boolean | null
}

type TenantClubBrandingInput = Pick<TenantClubBranding, 'name' | 'logo_url' | 'primary_color' | 'use_brand_primary_for_ui'>

export function tenantAuthStyleVars(club: TenantClubBrandingInput): CSSProperties {
  return {
    ...clubThemeBrandingVars(club.primary_color, club.use_brand_primary_for_ui),
  } as CSSProperties
}

/** Wrapper: aplica variables CSS de marca para que `text-primary`, botones y Clerk hereden el color del club. */
export function TenantAuthShell({ club, children }: { club: TenantClubBrandingInput; children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      style={tenantAuthStyleVars(club)}
    >
      {children}
    </div>
  )
}

/** Bloque centrado: logo o iniciales + título. */
export function TenantAuthLogoBlock({
  club,
  title,
  subtitle,
}: {
  club: TenantClubBrandingInput
  title: string
  subtitle?: string
}) {
  const brand = normalizeClubPrimary(club.primary_color)
  const logo = club.logo_url?.trim()

  return (
    <div className="text-center space-y-3">
      {logo ? (
        <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden border border-border bg-card flex items-center justify-center">
          <Image src={logo} alt={club.name} width={64} height={64} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-primary/25"
          style={{ backgroundColor: `${brand}22` }}
        >
          <span className="font-black text-2xl" style={{ color: brand }}>
            {club.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="text-muted-foreground text-sm mt-1">{subtitle}</p> : null}
      </div>
    </div>
  )
}
