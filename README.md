# ApexLeap 🏆

**Performance Hub para Academias de Artes Marciales y Clubes Deportivos**

Plataforma SaaS multi-tenant que fusiona la administración de negocio con el alto rendimiento deportivo. No es solo un sistema de cobros — es el sistema operativo de tu club.

---

## Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **Next.js 14+** (App Router) | Frontend + Server Actions |
| **Supabase** (PostgreSQL) | Base de datos + Row Level Security |
| **Clerk** | Autenticación multi-rol |
| **TailwindCSS** | Estilos |
| **shadcn/ui** | Componentes UI |
| **Zod** | Validación de esquemas |
| **qrcode.react** | Generación de QR para check-in |
| **svix** | Verificación de webhooks Clerk |

---

## Setup Local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/jisantander/apexleap.git
cd apexleap
pnpm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales reales:

| Variable | Dónde obtenerla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | [supabase.com](https://supabase.com) → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [clerk.com](https://clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Clerk → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → Signing Secret |

### 3. Base de datos

Ejecuta las migraciones SQL en Supabase SQL Editor:

```bash
# 1. Schema principal
supabase/migrations/001_initial_schema.sql

# 2. Datos semilla (reglas por defecto)
supabase/migrations/002_seed_data.sql
```

### 4. Configurar Clerk Webhook

En [clerk.com](https://clerk.com) → Webhooks, crear un endpoint hacia:
```
https://tu-dominio.com/api/webhooks/clerk
```
Eventos a suscribir: `user.created`, `user.updated`, `user.deleted`

### 5. Ejecutar en desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Arquitectura Multi-Tenant

- Cada institución tiene su propio `club_id`
- **Row Level Security (RLS)** en todas las tablas de Supabase
- Ningún dato de un club es visible desde otro
- El primer usuario de un club es automáticamente `admin`

---

## Módulos Implementados

| Módulo | Estado | Descripción |
|---|---|---|
| **Onboarding** | ✅ | Creación de club + reglas por defecto |
| **Dashboard** | ✅ | KPIs reales, Semáforo de Disponibilidad |
| **Alumnos** | ✅ | Ficha 360°, CRUD, semáforo inline |
| **Planes** | ✅ | Ciclos de cobro, sesiones, multisede |
| **Suscripciones** | ✅ | Vinculación alumno↔plan, MRR estimado |
| **Pagos** | ✅ | Registro, KPIs, marcar como pagado |
| **Asistencia** | ✅ | QR dinámico + geolocalización + manual |
| **Calendario** | ✅ | Sesiones recurrentes, vista semanal |
| **Reglas** | ✅ | Motor de bloqueos automáticos |
| **Configuración** | ✅ | Identidad y datos del club |
| **Documentos** | 🚧 | Próximamente |
| **Inventario** | 🚧 | Próximamente |
| **Competencias** | 🚧 | Próximamente |
| **Sedes** | 🚧 | Próximamente |

---

## Killer Features

- 🚦 **Semáforo de Disponibilidad** — Estado en tiempo real: 🟢 Apto / 🟡 Observación / 🔴 Bloqueado
- 📱 **Check-in QR + Geofencing** — QR dinámico (expira cada 60s) con validación GPS (radio 50m)
- ⚡ **Motor de Reglas** — Bloqueos automáticos por mora, lesión, asistencia o documentos
- 📊 **MRR en tiempo real** — Ingreso mensual recurrente calculado desde suscripciones activas

---

## Flujo de Nuevo Usuario

```
Sign up (Clerk) → /onboarding (crear club) → /dashboard
                                ↓
              Crea club + user_clubs + 4 reglas por defecto
```
