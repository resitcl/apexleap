'use client'

import { useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import Image from 'next/image'
import { submitTrialRequest } from '@/lib/actions/landing'
import {
  MapPin, Phone, Mail, Globe, Users, ChevronRight, Loader2, CheckCircle2,
  Dumbbell, Trophy, CalendarDays, Film, PlayCircle, Home,
  TrendingUp, Swords, Clock,
} from 'lucide-react'
import { toast } from 'sonner'

interface Coach {
  id: string
  name: string
  specialty: string | null
  bio: string | null
  photo_url: string | null
}

interface MediaItem {
  id: string
  title: string
  type: string
  category: string
  url: string
  thumbnail_url: string | null
  description: string | null
}

interface Match {
  id: string
  opponent: string | null
  match_date: string
  is_home: boolean
  home_score: number | null
  away_score: number | null
  location: string | null
}

interface ScheduleMatch {
  id: string
  opponent: string | null
  match_date: string
  is_home: boolean
  location: string | null
}

interface Stats {
  athletes: number
  played: number
  wins: number
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
  landing_show_media: boolean
  landing_show_results: boolean
  landing_show_schedule: boolean
  landing_show_stats: boolean
  landing_trial_enabled: boolean
  landing_trial_description: string | null
  landing_trial_contact: string | null
  landing_cta_label: string | null
  analytics_ga4_id: string | null
}

interface Props {
  club: Club
  coaches: Coach[]
  media: MediaItem[]
  results: Match[]
  schedule: ScheduleMatch[]
  stats: Stats | null
}

function getYoutubeThumbnail(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function ClubLandingPage({ club, coaches, media, results, schedule, stats }: Props) {
  const primary = club.primary_color ?? '#111827'
  const ctaLabel = club.landing_cta_label ?? 'Iniciar sesión'
  const ga4 = club.analytics_ga4_id?.trim()

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ─── GA4 Analytics ──────────────────────────────────── */}
      {ga4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga4}');
          `}</Script>
        </>
      )}
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

      {/* ─── Stats ────────────────────────────────────────────── */}
      {club.landing_show_stats && stats && (
        <section className="py-16 px-4" style={{ backgroundColor: `${primary}06` }}>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: primary }}>
                <TrendingUp className="w-4 h-4" /> Nuestros números
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              {[
                { value: stats.athletes, label: 'Atletas activos' },
                { value: stats.played,   label: 'Partidos jugados' },
                { value: stats.wins,     label: 'Victorias' },
              ].map(({ value, label }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm py-8 px-4">
                  <p className="text-4xl font-extrabold" style={{ color: primary }}>{value}</p>
                  <p className="text-sm text-gray-500 mt-1 font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Results ──────────────────────────────────────────── */}
      {club.landing_show_results && results.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: primary }}>
                <Trophy className="w-4 h-4" /> Últimos resultados
              </div>
            </div>
            <div className="space-y-3">
              {results.map(m => {
                const clubScore = m.is_home ? m.home_score : m.away_score
                const oppScore  = m.is_home ? m.away_score : m.home_score
                const win = (clubScore ?? 0) > (oppScore ?? 0)
                const draw = clubScore === oppScore
                return (
                  <div key={m.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${win ? 'bg-green-500' : draw ? 'bg-yellow-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {m.is_home ? `${club.name}` : (m.opponent ?? 'Rival')} vs {m.is_home ? (m.opponent ?? 'Rival') : club.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDate(m.match_date)}{m.location ? ` · ${m.location}` : ''}</p>
                    </div>
                    <div className="text-lg font-extrabold tabular-nums shrink-0" style={{ color: primary }}>
                      {m.home_score ?? '—'} – {m.away_score ?? '—'}
                    </div>
                    <div className="flex items-center gap-1">
                      {m.is_home ? <Home className="w-3 h-3 text-gray-400" /> : <Swords className="w-3 h-3 text-gray-400" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Schedule ─────────────────────────────────────────── */}
      {club.landing_show_schedule && schedule.length > 0 && (
        <section className="py-16 px-4" style={{ backgroundColor: `${primary}06` }}>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: primary }}>
                <CalendarDays className="w-4 h-4" /> Próximos partidos
              </div>
            </div>
            <div className="space-y-3">
              {schedule.map(m => (
                <div key={m.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
                  <Clock className="w-4 h-4 shrink-0" style={{ color: primary }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      vs {m.opponent ?? 'Por confirmar'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmtDate(m.match_date)}{m.location ? ` · ${m.location}` : ''}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: `${primary}15`, color: primary }}>
                    {m.is_home ? 'Local' : 'Visitante'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Media Gallery ────────────────────────────────────── */}
      {club.landing_show_media && media.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: primary }}>
                <Film className="w-4 h-4" /> Galería
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {media.map(item => {
                const thumb = item.thumbnail_url ?? (item.type === 'video' ? getYoutubeThumbnail(item.url) : null)
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-md transition-shadow block"
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    {item.type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="w-10 h-10 text-white drop-shadow" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-xs font-medium truncate">{item.title}</p>
                    </div>
                  </a>
                )
              })}
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
