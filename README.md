# ApexLeap 🏆

Plataforma SaaS de gestión integral para clubes deportivos amateur.

## 🎯 Descripción

ApexLeap es un software **multi-tenant** y **agnóstico al deporte** diseñado para resolver los principales dolores administrativos de clubes deportivos:

- Desorden en el cobro de cuotas
- Falta de registro centralizado de socios
- Conflictos en reserva de espacios
- Dificultad para controlar asistencia

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| [Next.js 14+](https://nextjs.org/) | Frontend (App Router) |
| [Supabase](https://supabase.com/) | Base de datos PostgreSQL |
| [Clerk](https://clerk.com/) | Autenticación |
| [TailwindCSS](https://tailwindcss.com/) | Estilos |
| [shadcn/ui](https://ui.shadcn.com/) | Componentes UI |
| [Lucide](https://lucide.dev/) | Iconos |

## 📁 Estructura del Proyecto

```
/app                    # App Router de Next.js
  /(auth)              # Rutas de autenticación
  /(dashboard)         # Rutas protegidas
  /api                 # API Routes
/components
  /ui                  # Componentes shadcn/ui
  /forms               # Formularios reutilizables
  /layouts             # Layouts compartidos
/lib
  /supabase            # Cliente y helpers
  /actions             # Server Actions
  /utils               # Utilidades
/types                 # TypeScript types
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- pnpm (recomendado) o npm
- Cuenta en Supabase
- Cuenta en Clerk

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/apexleap.git
cd apexleap

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
pnpm dev
```

### Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## 📖 Documentación

- [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) - Especificación del producto
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura técnica
- [.windsurfrules](./.windsurfrules) - Reglas del proyecto para Windsurf

## 🔐 Multi-Tenancy

**REGLA CRÍTICA**: Todo dato pertenece a un `club_id`.

- Cada query filtra por `club_id` del usuario autenticado
- Row Level Security (RLS) habilitado en Supabase
- Nunca exponer datos de un club a otro

## 👥 Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| Super Admin | Dueños del SaaS |
| Admin de Club | Tesorero/Presidente |
| Staff/Coach | Entrenadores, personal |
| Socio/Jugador | Miembros del club |

## ✅ Funcionalidades MVP

- [x] Gestión de Socios (CRUD + importación Excel)
- [x] Sistema de Pagos (Pendiente, Pagado, Vencido)
- [x] Calendario de Recursos (Reservas)
- [x] Control de Asistencia

## 🗺️ Roadmap

- [ ] Integración WhatsApp Business API
- [ ] Pasarelas de pago (MercadoPago, Stripe)
- [ ] Exportación de reportes (PDF, Excel)
- [ ] Dashboard con analytics avanzados

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es privado y propietario.

---

Desarrollado con ❤️ para clubes deportivos amateur.
