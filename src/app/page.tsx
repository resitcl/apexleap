import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Trophy, 
  Users, 
  CreditCard, 
  Calendar, 
  CheckCircle,
  ArrowRight
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">AL</span>
            </div>
            <span className="font-bold text-xl">ApexLeap</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Comenzar Gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              El Performance Hub para
              <br />
              <span className="text-primary">Clubes Deportivos</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Plataforma SaaS de gestión integral para academias de artes marciales 
              y clubes deportivos. Administración + Alto Rendimiento en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Comenzar Ahora
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  Ver Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Todo lo que necesitas para gestionar tu club
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={Users}
                title="Ficha Atleta 360°"
                description="Historial financiero, técnico y de salud centralizado en un solo lugar"
              />
              <FeatureCard
                icon={CreditCard}
                title="Cobros Automáticos"
                description="Motor de suscripciones con pagos recurrentes y recordatorios"
              />
              <FeatureCard
                icon={Calendar}
                title="Check-in QR + GPS"
                description="Validación de presencia física con geolocalización"
              />
              <FeatureCard
                icon={Trophy}
                title="Semáforo de Elegibilidad"
                description="Validación en tiempo real para entrenar o competir"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              ¿Listo para profesionalizar tu club?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Únete a las academias y clubes que ya usan ApexLeap para 
              potenciar la disciplina de sus atletas y su rentabilidad.
            </p>
            <Link href="/sign-up">
              <Button size="lg">Crear Cuenta Gratis</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 ApexLeap. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType
  title: string
  description: string 
}) {
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
