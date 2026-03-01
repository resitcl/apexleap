# Arquitectura de ApexLeap

## Visión General

ApexLeap sigue una arquitectura **multi-tenant** donde cada club opera de forma aislada dentro de la misma instancia de la aplicación.

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    Next.js 14+ (App Router)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   (auth)    │  │ (dashboard) │  │    /api     │          │
│  │   routes    │  │   routes    │  │   routes    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     AUTENTICACIÓN                            │
│                         Clerk                                │
│         (Multi-tenant: user → club_id mapping)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      BASE DE DATOS                           │
│                  PostgreSQL (Supabase)                       │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  clubs   │  │ members  │  │ payments │  │ resources│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│              Row Level Security (RLS) por club_id            │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de Carpetas

```
/app
├── /(auth)                    # Rutas públicas de autenticación
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   └── layout.tsx
├── /(dashboard)               # Rutas protegidas del dashboard
│   ├── dashboard/
│   │   └── page.tsx           # Vista principal
│   ├── members/
│   │   ├── page.tsx           # Lista de socios
│   │   ├── [id]/page.tsx      # Detalle de socio
│   │   └── new/page.tsx       # Crear socio
│   ├── payments/
│   │   ├── page.tsx           # Lista de pagos
│   │   └── [id]/page.tsx      # Detalle de pago
│   ├── resources/
│   │   ├── page.tsx           # Calendario de recursos
│   │   └── [id]/page.tsx      # Detalle de recurso
│   ├── attendance/
│   │   └── page.tsx           # Control de asistencia
│   ├── settings/
│   │   └── page.tsx           # Configuración del club
│   └── layout.tsx             # Layout con sidebar
├── /api                       # API Routes (si se necesitan)
│   └── webhooks/
│       └── clerk/route.ts     # Webhook de Clerk
├── layout.tsx                 # Root layout
├── page.tsx                   # Landing page
└── globals.css

/components
├── /ui                        # Componentes shadcn/ui
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── table.tsx
│   └── ...
├── /forms                     # Formularios reutilizables
│   ├── MemberForm.tsx
│   ├── PaymentForm.tsx
│   └── ResourceForm.tsx
├── /layouts                   # Layouts compartidos
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── MobileNav.tsx
└── /shared                    # Componentes compartidos
    ├── DataTable.tsx
    ├── EmptyState.tsx
    └── LoadingSpinner.tsx

/lib
├── /supabase
│   ├── client.ts              # Cliente de Supabase (browser)
│   ├── server.ts              # Cliente de Supabase (server)
│   └── admin.ts               # Cliente admin (service role)
├── /actions                   # Server Actions
│   ├── members.ts
│   ├── payments.ts
│   └── resources.ts
├── /utils
│   ├── date-utils.ts
│   ├── format-utils.ts
│   └── validation-utils.ts
└── /hooks                     # Custom React hooks
    ├── useClub.ts
    └── usePagination.ts

/types
├── database.types.ts          # Tipos generados de Supabase
├── member.types.ts
├── payment.types.ts
└── resource.types.ts
```

---

## Modelo de Base de Datos

### Diagrama ER Simplificado

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   clubs     │       │   members   │       │  payments   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ club_id(FK) │       │ id (PK)     │
│ name        │       │ id (PK)     │◄──────│ member_id   │
│ sport_type  │       │ name        │       │ club_id(FK) │
│ settings    │       │ email       │       │ amount      │
│ created_at  │       │ phone       │       │ status      │
└─────────────┘       │ status      │       │ due_date    │
                      │ created_at  │       │ paid_at     │
                      └─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  resources  │       │ reservations│       │ attendance  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ resource_id │       │ id (PK)     │
│ club_id(FK) │       │ id (PK)     │       │ club_id(FK) │
│ name        │       │ club_id(FK) │       │ member_id   │
│ type        │       │ start_time  │       │ event_id    │
│ capacity    │       │ end_time    │       │ date        │
│ settings    │       │ member_id   │       │ present     │
└─────────────┘       └─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│   events    │       │  event_types│
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ club_id(FK) │◄──────│ club_id(FK) │
│ type_id(FK) │───────│ name        │
│ metadata    │       │ config      │
│ created_at  │       │ created_at  │
└─────────────┘       └─────────────┘
```

### Tablas Principales

#### `clubs`
```sql
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sport_type TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `members`
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document_number TEXT,
  birth_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members are viewable by club" ON members
  FOR ALL USING (club_id = get_user_club_id());
```

#### `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payments are viewable by club" ON payments
  FOR ALL USING (club_id = get_user_club_id());
```

---

## Flujo de Autenticación

```
1. Usuario accede a /sign-in
         │
         ▼
2. Clerk maneja autenticación
         │
         ▼
3. Webhook de Clerk notifica a /api/webhooks/clerk
         │
         ▼
4. Se obtiene/crea el club_id del usuario
         │
         ▼
5. Usuario redirigido a /dashboard
         │
         ▼
6. Middleware verifica auth + club_id en cada request
         │
         ▼
7. Supabase RLS filtra datos por club_id
```

---

## Patrones de Código

### Server Action con club_id
```typescript
// lib/actions/members.ts
'use server'

import { auth } from '@clerk/nextjs'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createMember(data: CreateMemberInput) {
  const { userId } = auth()
  if (!userId) throw new Error('No autorizado')
  
  const clubId = await getClubIdFromUser(userId)
  const supabase = createServerClient()
  
  const { data: member, error } = await supabase
    .from('members')
    .insert({
      ...data,
      club_id: clubId  // SIEMPRE incluir club_id
    })
    .select()
    .single()
  
  if (error) throw error
  
  revalidatePath('/members')
  return member
}
```

### Componente con Validación
```typescript
// components/forms/MemberForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { memberSchema } from '@/lib/validations/member'

export function MemberForm({ onSubmit, defaultValues }) {
  const form = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues
  })
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* campos del formulario */}
    </form>
  )
}
```

---

## Seguridad Multi-Tenant

### Capas de Protección

1. **Middleware (Next.js)**: Verifica autenticación
2. **Server Actions**: Obtienen club_id del usuario autenticado
3. **RLS (Supabase)**: Filtra datos a nivel de base de datos

### Función Helper para RLS
```sql
CREATE OR REPLACE FUNCTION get_user_club_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT club_id 
    FROM user_clubs 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Convenciones de Commits

```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: formateo, sin cambios de lógica
refactor: refactorización de código
test: añadir o modificar tests
chore: tareas de mantenimiento
```

Ejemplo: `feat(members): add bulk import from Excel`
