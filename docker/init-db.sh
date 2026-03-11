#!/bin/bash
set -e

# ============================================================
# ApexLeap - Inicialización de Base de Datos
# ============================================================
# Este script se ejecuta DESPUÉS de los init scripts internos
# de supabase/postgres (gracias al prefijo zz-).
#
# IMPORTANTE: La imagen supabase/postgres ya crea los roles:
#   anon, authenticated, authenticator, service_role, etc.
# Pero NO les asigna contraseña al rol authenticator.
# PostgREST necesita conectarse como authenticator con contraseña,
# por eso este script la configura usando $POSTGRES_PASSWORD.
# ============================================================

echo "=== ApexLeap: Configurando rol authenticator ==="
# Usamos supabase_admin (superuser) porque postgres fue degradado
# por la migración 10000000000000_demote-postgres.sql de supabase
psql -v ON_ERROR_STOP=1 --username "supabase_admin" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Asignar contraseña al rol authenticator (requerido por PostgREST)
    ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';

    -- Permisos en schema public para roles de Supabase
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
EOSQL

echo "=== ApexLeap: Ejecutando migraciones ==="
for f in /app/migrations/*.sql; do
    if [ -f "$f" ]; then
        echo "  -> $(basename $f)"
        psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
    fi
done

echo "=== ApexLeap: Otorgando permisos en tablas existentes ==="
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
EOSQL

echo "=== ApexLeap: Base de datos inicializada correctamente ==="
