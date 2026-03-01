import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Trophy, Users, CreditCard, Calendar, ClipboardCheck,
  ArrowRight, ShieldCheck, Repeat2, BarChart3, BookOpen,
  CheckCircle2, Zap, Globe, Lock
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AL</span>
            </div>
            <span className="font-bold text-lg">ApexLeap</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Módulos</a>
            <a href="#how" className="hover:text-foreground transition-colors">Cómo funciona</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Precio</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Iniciar Sesión</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Comenzar Gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-24 md:py-36 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 text-center relative">
            <Badge variant="outline" className="mb-6 gap-2 px-4 py-1.5 text-sm">
              <Zap className="w-3.5 h-3.5 text-primary" />
              La plataforma que tu club necesita
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
              El sistema operativo
              <br />
              <span className="text-primary">de tu club deportivo</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Administración, cobros, asistencia, rendimiento y nóminas en una sola plataforma.
              Diseñada para academias de artes marciales y clubes deportivos en Latinoamérica.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2 h-12 px-8 text-base">
                  Crear club gratis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  Ver demo
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Sin tarjeta de crédito · Setup en 2 minutos · Cancela cuando quieras</p>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-muted/40 border-y">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "10", label: "Módulos completos" },
                { value: "100%", label: "Multi-tenant y seguro" },
                { value: "QR", label: "Check-in con GPS" },
                { value: "MRR", label: "Ingreso recurrente visible" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-3xl font-black text-primary">{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Todo en un solo lugar</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Desde la ficha del atleta hasta la nómina de profesores. Sin apps extra, sin Excel.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {MODULES.map((m) => (
                <div key={m.title} className="bg-card border rounded-xl p-6 hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <m.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-24 bg-muted/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Listo en 3 pasos</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: "01", title: "Crea tu club", desc: "Regístrate y configura tu institución en menos de 2 minutos." },
                { step: "02", title: "Agrega tus atletas", desc: "Importa o registra manualmente. Asigna planes y suscripciones." },
                { step: "03", title: "Opera con datos", desc: "Semáforo de elegibilidad, QR check-in y finanzas en tiempo real." },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-primary-foreground font-black text-lg">{s.step}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Killer features highlight */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <h2 className="text-4xl font-bold leading-tight">Killer features que no encontrarás en ningún otro sistema</h2>
                <div className="space-y-5">
                  {KILLER_FEATURES.map((f) => (
                    <div key={f.title} className="flex gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <f.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{f.title}</p>
                        <p className="text-sm text-muted-foreground">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card border rounded-2xl p-8 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">SEMIÁFORO DE ELEGIBILIDAD</p>
                {SEMAFORO_DEMO.map((a) => (
                  <div key={a.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${a.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.plan}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.badge}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-muted/40">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">Precio simple y justo</h2>
            <p className="text-muted-foreground mb-12">Un plan. Todo incluido. Sin sorpresas.</p>
            <div className="max-w-sm mx-auto bg-card border-2 border-primary rounded-2xl p-8 shadow-lg">
              <Badge className="mb-4">Más popular</Badge>
              <p className="text-5xl font-black mb-1">$29<span className="text-xl font-normal text-muted-foreground">/mes</span></p>
              <p className="text-muted-foreground text-sm mb-6">USD por club · hasta 200 atletas</p>
              <div className="space-y-3 text-sm text-left mb-8">
                {[
                  "Todos los módulos incluidos",
                  "Atletas ilimitados",
                  "QR Check-in + Geofencing",
                  "Motor de Reglas automático",
                  "Soporte prioritario",
                  "Actualizaciones incluidas",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/sign-up" className="block">
                <Button className="w-full h-11 text-base">Comenzar gratis 14 días</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">¿Listo para profesionalizar tu club?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Únete a los clubes que ya usan ApexLeap para gestionar con datos, cobrar a tiempo y competir con ventaja.
            </p>
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-10 text-base gap-2">
                Crear club ahora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-10 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">AL</span>
              </div>
              <span className="font-bold">ApexLeap</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">Términos</a>
              <a href="#" className="hover:text-foreground">Privacidad</a>
              <a href="mailto:hola@apexleap.app" className="hover:text-foreground">Contacto</a>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 ApexLeap. Hecho en Chile 🇨🇱</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const MODULES = [
  { icon: Users,         title: "Ficha Atleta 360°",    desc: "Historial financiero, técnico, de salud y documentos en una sola vista." },
  { icon: BookOpen,      title: "Planes y Suscripciones", desc: "Crea planes por ciclo. Vincula atletas. Calcula MRR automáticamente." },
  { icon: CreditCard,    title: "Pagos y Cobros",         desc: "Registra pagos, controla morosos y genera reportes financieros." },
  { icon: ClipboardCheck,title: "Asistencia QR",          desc: "Check-in por QR dinámico con geofencing. Sin app adicional." },
  { icon: Calendar,      title: "Calendario",             desc: "Sesiones recurrentes, horarios por sede y control de capacidad." },
  { icon: ShieldCheck,   title: "Motor de Reglas",        desc: "Bloqueos automáticos por mora, lesión o asistencia baja." },
  { icon: BarChart3,     title: "Finanzas",               desc: "Egresos, nómina de entrenadores y balance mensual." },
  { icon: Repeat2,       title: "Suscripciones",          desc: "Gestión completa con auto-renovación y control de estado." },
  { icon: Trophy,        title: "Competencias",           desc: "Ligas, torneos y nóminas matchday. Próximamente." },
]

const KILLER_FEATURES = [
  { icon: Zap,       title: "Semáforo de Disponibilidad", desc: "Validación en tiempo real: 🟢 Apto / 🟡 Observación / 🔴 Bloqueado" },
  { icon: Lock,      title: "Motor de Reglas Automático", desc: "Bloqueos por mora, lesión, documentos o asistencia baja. Configurable." },
  { icon: Globe,     title: "Check-in QR + Geofencing",   desc: "QR dinámico que expira cada 60s. Valida presencia dentro del radio GPS." },
  { icon: BarChart3, title: "MRR en Tiempo Real",          desc: "Ingreso mensual recurrente calculado desde suscripciones activas." },
]

const SEMAFORO_DEMO = [
  { name: "Carlos Muñoz",   plan: "Plan Intermedio", color: "bg-green-500",  status: "Apto",          badge: "bg-green-100 text-green-700" },
  { name: "Ana Torres",     plan: "Plan Básico",     color: "bg-green-500",  status: "Apto",          badge: "bg-green-100 text-green-700" },
  { name: "Luis Herrera",   plan: "Plan Elite",      color: "bg-yellow-500", status: "Observación",   badge: "bg-yellow-100 text-yellow-700" },
  { name: "Pablo Riquelme", plan: "Plan Intermedio", color: "bg-red-500",    status: "Bloqueado",     badge: "bg-red-100 text-red-700" },
  { name: "María González", plan: "Plan Básico",     color: "bg-red-500",    status: "Deuda vencida", badge: "bg-red-100 text-red-700" },
]
