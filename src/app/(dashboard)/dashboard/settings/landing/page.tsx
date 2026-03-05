import { getLandingSettings } from '@/lib/actions/landing'
import { LandingSettingsForm } from '@/components/settings/LandingSettingsForm'
import { Globe } from 'lucide-react'

export default async function LandingSettingsPage() {
  let settings
  try {
    settings = await getLandingSettings()
  } catch {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">No se pudo cargar la configuración del landing.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6" /> Landing page pública
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura la página pública de tu club para que nuevos interesados puedan encontrarte y tus miembros accedan fácilmente.
        </p>
      </div>

      <LandingSettingsForm
        slug={(settings as unknown as Record<string, unknown>).slug as string}
        initial={{
          landing_enabled:           (settings as unknown as Record<string, unknown>).landing_enabled as boolean ?? false,
          landing_headline:          (settings as unknown as Record<string, unknown>).landing_headline as string ?? null,
          landing_description:       (settings as unknown as Record<string, unknown>).landing_description as string ?? null,
          landing_cta_label:         (settings as unknown as Record<string, unknown>).landing_cta_label as string ?? 'Iniciar sesión',
          landing_show_team:         (settings as unknown as Record<string, unknown>).landing_show_team as boolean ?? true,
          landing_show_media:        (settings as unknown as Record<string, unknown>).landing_show_media as boolean ?? false,
          landing_show_results:      (settings as unknown as Record<string, unknown>).landing_show_results as boolean ?? false,
          landing_show_schedule:     (settings as unknown as Record<string, unknown>).landing_show_schedule as boolean ?? false,
          landing_show_stats:        (settings as unknown as Record<string, unknown>).landing_show_stats as boolean ?? false,
          landing_trial_enabled:     (settings as unknown as Record<string, unknown>).landing_trial_enabled as boolean ?? false,
          landing_trial_description: (settings as unknown as Record<string, unknown>).landing_trial_description as string ?? null,
          landing_trial_contact:     (settings as unknown as Record<string, unknown>).landing_trial_contact as string ?? null,
          analytics_ga4_id:          (settings as unknown as Record<string, unknown>).analytics_ga4_id as string ?? null,
        }}
      />
    </div>
  )
}
