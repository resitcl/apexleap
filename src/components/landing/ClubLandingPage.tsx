'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { submitTrialRequest } from '@/lib/actions/landing'
import { MapPin, Phone, Mail, Globe, Users, ChevronRight, Loader2, CheckCircle2, Dumbbell } from 'lucide-react'
import { toast } from 'sonner'

interface Coach {
  id: string
  name: string
  specialty: string | null
  bio: string | null
  photo_url: string | null
}

interface Club {
  id: string
  name: string
  slug: string
  sport_type: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  city: string | null
  country: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  description: string | null
  landing_headline: string | null
  landing_description: string | null
  landing_show_team: boolean
  landing_trial_enabled: boolean
  landing_trial_description: string | null
  landing_trial_contact: string | null
  landing_cta_label: string | null
}

interface Props {
  club: Club
  coaches: Coach[]
}

export function ClubLandingPage({ club, coaches }: Props) {
  const primary = club.primary_color ?? '#111827'
  const ctaLabel = club.landing_cta_label ?? 'Iniciar sesión'

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ─── Nav ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {club.logo_url ? (
              <Image src={club.logo_url} alt={club.name} width={36} height={36} className="rounded-lg object-cover" />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primary }}
              >
                {club.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-gray-900 text-sm sm:text-base">{club.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {club.landing_trial_enabled && (
              <a
                href="#clase-prueba"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium px-4 h-9 rounded-full border-2 transition-colors hover:opacity-80"
                style={{ borderColor: primary, color: primary }}
              >
                Clase de prueba
              </a>
            )}
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1 text-sm font-semibold px-4 h-9 rounded-full text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primary }}
            >
              {ctaLabel} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative py-24 sm:py-32 px-4 text-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${primary}05 100%)` }}
      >
        <div className="max-w-3xl mx-auto relative z-10">
          {club.sport_type && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6"
              style={{ backgroundColor: `${primary}20`, color: primary }}
            >
              <Dumbbell className="w-3 h-3" />
              {club.sport_type}
            </span>
          )}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            {club.landing_headline ?? `Bienvenido a ${club.name}`}
          </h1>
          {(club.landing_description ?? club.description) && (
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              {club.landing_description ?? club.description}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold text-base shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ backgroundColor: primary }}
            >
              {ctaLabel} <ChevronRight className="w-4 h-4" />
            </Link>
            {club.landing_trial_enabled && (
              <a
                href="#clase-prueba"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold text-base border-2 transition-all hover:scale-105"
                style={{ borderColor: primary, color: primary }}
              >
                Solicitar clase de prueba
              </a>
            )}
          </div>
        </div>
        {/* Decorative blob */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ backgroundColor: primary }}
        />
      </section>

      {/* ─── Info strip ───────────────────────────────────────── */}
      {(club.city || club.phone || club.email || club.website) && (
        <section className="border-y border-gray-100 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap justify-center gap-6">
            {club.city && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="w-4 h-4 shrink-0" style={{ color: primary }} />
                {club.city}{club.country ? `, ${club.country}` : ''}
              </div>
            )}
            {club.address && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="w-4 h-4 shrink-0 opacity-50" />
                {club.address}
              </div>
            )}
            {club.phone && (
              <a href={`tel:${club.phone}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <Phone className="w-4 h-4 shrink-0" style={{ color: primary }} />
                {club.phone}
              </a>
            )}
            {club.email && (
              <a href={`mailto:${club.email}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <Mail className="w-4 h-4 shrink-0" style={{ color: primary }} />
                {club.email}
              </a>
            )}
            {club.website && (
              <a href={club.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                <Globe className="w-4 h-4 shrink-0" style={{ color: primary }} />
                {club.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </section>
      )}

      {/* ─── Team ─────────────────────────────────────────────── */}
      {club.landing_show_team && coaches.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: primary }}>
                <Users className="w-4 h-4" /> Nuestro equipo
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Los entrenadores</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {coaches.map(coach => (
                <div key={coach.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:shadow-md transition-shadow">
                  {coach.photo_url ? (
                    <Image
                      src={coach.photo_url}
                      alt={coach.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-offset-2"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold ring-4"
                      style={{ backgroundColor: `${primary}20`, color: primary, outlineColor: `${primary}40` }}
                    >
                      {coach.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 text-lg">{coach.name}</h3>
                  {coach.specialty && (
                    <p className="text-sm font-medium mt-0.5" style={{ color: primary }}>{coach.specialty}</p>
                  )}
                  {coach.bio && (
                    <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-3">{coach.bio}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Trial class ──────────────────────────────────────── */}
      {club.landing_trial_enabled && (
        <section id="clase-prueba" className="py-20 px-4" style={{ backgroundColor: `${primary}08` }}>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Clase de prueba</h2>
              <p className="text-gray-600 text-lg">
                {club.landing_trial_description ?? '¡Ven a conocernos sin compromiso! Reserva tu primera clase gratuita.'}
              </p>
              {club.landing_trial_contact && (
                <p className="text-sm mt-2 font-medium" style={{ color: primary }}>
                  Contacto: {club.landing_trial_contact}
                </p>
              )}
            </div>
            <TrialForm clubId={club.id} primary={primary} />
          </div>
        </section>
      )}

      {/* ─── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 px-4 text-center">
        <p className="text-sm text-gray-400">
          © {new Date().getFullYear()} {club.name}
          {' · '}
          <span className="text-xs opacity-60">Powered by ApexLeap</span>
        </p>
      </footer>
    </div>
  )
}

// ─── Trial request form ────────────────────────────────────────────────────
function TrialForm({ clubId, primary }: { clubId: string; primary: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await submitTrialRequest(clubId, name, email, message)
    setLoading(false)
    if (!result.ok) {
      toast.error(result.error)
    } else {
      setSent(true)
      toast.success('¡Solicitud enviada! El club se pondrá en contacto contigo.')
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <CheckCircle2 className="w-14 h-14" style={{ color: primary }} />
        <h3 className="text-xl font-bold text-gray-900">¡Solicitud enviada!</h3>
        <p className="text-gray-500 text-center max-w-sm">El equipo se pondrá en contacto contigo a la brevedad para coordinar tu clase.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 sm:p-8 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
        <input
          required
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Juan Pérez"
          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-shadow"
          style={{ ['--tw-ring-color' as string]: primary }}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email de contacto</label>
        <input
          required
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="juan@ejemplo.com"
          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 transition-shadow"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje (opcional)</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="¿Algo que quieras que sepamos? ¿Experiencia previa?"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 resize-none transition-shadow"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-full text-white font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: primary }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Enviando…' : 'Solicitar mi clase de prueba'}
      </button>
    </form>
  )
}
