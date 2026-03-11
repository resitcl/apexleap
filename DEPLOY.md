# ApexLeap - Despliegue con Docker

## Arquitectura

```
Puerto 80 (nginx proxy)
├── /rest/v1/*  → PostgREST (API compatible con supabase-js)
└── /*          → Next.js app (producción)
```

| Contenedor | Imagen | Función |
|------------|--------|---------|
| `apexleap-db` | `supabase/postgres:15.1.1.78` | PostgreSQL con roles Supabase |
| `apexleap-rest` | `postgrest:v12.2.3` | API REST automática |
| `apexleap-app` | Build local (`Dockerfile`) | Next.js en modo producción |
| `apexleap-proxy` | `nginx:1.27-alpine` | Proxy: app + API en un solo puerto |

**No incluye** GoTrue, Storage, Realtime, Edge Functions ni Studio.
El proyecto usa **Clerk** para autenticación y **supabase-js** solo para acceso a datos via PostgREST.

## Inicio rápido

### 1. Crear archivo `.env`

```bash
cp .env.docker.example .env
# Edita .env con tus valores reales
```

### 2. Generar JWT keys

```bash
# Genera JWT_SECRET
openssl rand -base64 32

# Con ese secret, genera ANON_KEY y SERVICE_ROLE_KEY en:
# https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
```

### 3. Levantar todo

```bash
docker compose up -d --build
```

La app estará disponible en `http://localhost` (puerto 80).

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `POSTGRES_PASSWORD` | **Sí** | Password de PostgreSQL (mín 32 chars) |
| `JWT_SECRET` | **Sí** | Secret para firmar JWT de PostgREST (mín 32 chars) |
| `ANON_KEY` | **Sí** | JWT con role=anon, firmado con JWT_SECRET |
| `SERVICE_ROLE_KEY` | **Sí** | JWT con role=service_role, firmado con JWT_SECRET |
| `NEXT_PUBLIC_SUPABASE_URL` | **Sí** | URL pública del proxy (ej: `https://tudominio.com`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Sí** | Clerk publishable key |
| `CLERK_SECRET_KEY` | **Sí** | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | No | Clerk webhook secret |
| `NEXT_PUBLIC_APP_URL` | No | URL de la app (default: `http://localhost`) |
| `PORT` | No | Puerto del proxy (default: `80`) |
| `POSTGRES_PORT` | No | Puerto de PostgreSQL (default: `5432`) |
| `POSTGRES_DB` | No | Nombre de la BD (default: `postgres`) |

## Volumen persistente

Los datos de PostgreSQL se guardan en el volumen Docker `apexleap_postgres_data`.

```bash
# Backup
docker compose exec db pg_dump -U postgres postgres > backup.sql

# Restaurar
docker compose exec -T db psql -U postgres postgres < backup.sql

# Reinicio limpio (BORRA DATOS)
docker compose down -v
```

## Migraciones

Las migraciones se ejecutan **automáticamente solo la primera vez** que se crea el volumen (via `docker/init-db.sh`).

Para aplicar migraciones nuevas después de la primera vez:

```bash
docker compose exec db psql -U supabase_admin postgres \
  -f /app/migrations/023_athlete_agreements.sql
```

## Notas técnicas importantes

### Rol authenticator y PostgREST

La imagen `supabase/postgres` crea automáticamente los roles de Supabase (`anon`, `authenticated`, `authenticator`, `service_role`, etc.) pero **NO asigna contraseña al rol `authenticator`**.

PostgREST se conecta a PostgreSQL usando el rol `authenticator` con contraseña. Sin contraseña, la conexión falla con:

```
FATAL: password authentication failed for user "authenticator"
```

**Solución implementada**: El script `docker/init-db.sh` se monta como `zz-apexleap-init.sh` (prefijo `zz-` para ejecutarse último) y configura la contraseña del `authenticator` usando `$POSTGRES_PASSWORD`.

**Detalle crítico**: El script usa `supabase_admin` (no `postgres`) porque la migración interna `10000000000000_demote-postgres.sql` de Supabase remueve los privilegios de superusuario del rol `postgres`. Solo un superuser puede modificar el rol reservado `authenticator`.

Si por algún motivo el script no se ejecutó (ej: volumen ya existente), puedes aplicarlo manualmente:

```bash
docker compose exec db psql -U supabase_admin -c \
  "ALTER ROLE authenticator WITH PASSWORD 'TU_POSTGRES_PASSWORD';"
docker compose restart rest
```

### Orden de inicialización de la BD

Los scripts en `/docker-entrypoint-initdb.d/` se ejecutan en orden alfabético:

1. `migrate.sh` (interno de supabase/postgres) → ejecuta `init-scripts/*.sql` que crean roles y schemas
2. `zz-apexleap-init.sh` → configura contraseña de authenticator + ejecuta migraciones de la app

**IMPORTANTE**: Las migraciones de la app se montan en `/app/migrations` (NO en `/docker-entrypoint-initdb.d/migrations`). Esto es intencional porque `migrate.sh` de Supabase procesa automáticamente cualquier subdirectorio `migrations/` dentro de `initdb.d`, y si alguna migración falla, aborta todo el proceso de inicialización impidiendo que `zz-apexleap-init.sh` se ejecute. Nuestro script las ejecuta con `ON_ERROR_STOP=0` para tolerar errores no críticos.

Esto solo ocurre cuando el volumen está vacío (primera vez o después de `docker compose down -v`).

### Variables NEXT_PUBLIC en Docker

Las variables `NEXT_PUBLIC_*` se embeben en el bundle de JavaScript del cliente **en tiempo de build**. Por eso se pasan como `build args` en el Dockerfile. Si cambias la URL de Supabase o las keys de Clerk, debes **reconstruir** la imagen:

```bash
docker compose up -d --build app
```

## Desarrollo local (sin Docker)

El proyecto sigue funcionando normalmente sin Docker:

```bash
# Usa Supabase Cloud o el Docker local
pnpm dev
```

Con las variables en `.env.local` apuntando a Supabase Cloud:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

O al Supabase local (si tienes el Docker corriendo):
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:80
```

## Producción con dominio y SSL

Para producción con HTTPS, usa un reverse proxy en el host:

### Con Caddy (recomendado, SSL automático)

```caddyfile
tudominio.com {
    reverse_proxy localhost:80
}
```

### Con Nginx + Certbot

```nginx
server {
    listen 443 ssl;
    server_name tudominio.com;

    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Comandos útiles

```bash
# Ver estado
docker compose ps

# Ver logs de un servicio
docker compose logs -f app
docker compose logs -f rest
docker compose logs -f db

# Reiniciar un servicio
docker compose restart app

# Reconstruir solo la app
docker compose up -d --build --no-deps app

# Detener todo
docker compose down

# Monitoreo de recursos
docker stats
```
