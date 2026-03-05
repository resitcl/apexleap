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
        slug={settings.slug}
        initial={{
          landing_enabled:           settings.landing_enabled ?? false,
          landing_headline:          settings.landing_headline ?? null,
          landing_description:       settings.landing_description ?? null,
          landing_show_team:         settings.landing_show_team ?? true,
          landing_trial_enabled:     settings.landing_trial_enabled ?? false,
          landing_trial_description: settings.landing_trial_description ?? null,
          landing_trial_contact:     settings.landing_trial_contact ?? null,
          landing_cta_label:         settings.landing_cta_label ?? 'Iniciar sesión',
        }}
      />
    </div>
  )
}
