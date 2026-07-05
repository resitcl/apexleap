-- 035: Consolida fichas de atleta duplicadas por (club_id, lower(email)) y crea el índice
-- único que impide crear nuevas fichas duplicadas.
--
-- Los duplicados NO se borran: se ARCHIVAN (conservan su historial de pagos) y sus
-- suscripciones activas/pendientes se cancelan para que el cron no las siga facturando.
-- El "keeper" por grupo es: la ficha con suscripción activa; si no, la que tiene user_id
-- de Clerk; si no, la más antigua.
--
-- SEGURIDAD: hacer backup antes de aplicar y correr primero el diagnóstico (ver el
-- instructivo). Es idempotente: re-ejecutarla no hace nada si ya no hay duplicados.

BEGIN;

-- Normalizar los emails almacenados a minúsculas + sin espacios, para que los lookups del
-- código (que ahora normalizan el email de Clerk a minúsculas) coincidan de forma consistente.
UPDATE athletes
SET email = lower(btrim(email))
WHERE email IS NOT NULL AND email <> lower(btrim(email));

CREATE TEMP TABLE _athlete_dupes ON COMMIT DROP AS
WITH ranked AS (
  SELECT a.id,
         ROW_NUMBER() OVER (
           PARTITION BY a.club_id, lower(a.email)
           ORDER BY
             (EXISTS (SELECT 1 FROM subscriptions s
                       WHERE s.athlete_id = a.id AND s.status = 'active')) DESC,
             (a.user_id IS NOT NULL) DESC,
             a.created_at ASC
         ) AS rn
  FROM athletes a
  WHERE a.email IS NOT NULL
    AND btrim(a.email) <> ''
    AND a.archived_at IS NULL
)
SELECT id AS loser_id FROM ranked WHERE rn > 1;

-- Cancelar suscripciones vivas de los duplicados (evita facturación fantasma tras archivar).
UPDATE subscriptions s
SET status = 'cancelled'
FROM _athlete_dupes d
WHERE s.athlete_id = d.loser_id
  AND s.status IN ('active', 'pending_payment');

-- Archivar los duplicados y liberar su email (se preserva en notas para poder restaurar).
-- Anular el email evita que los lookups `.eq('email', ...).maybeSingle()` del código
-- devuelvan 2+ filas por el mismo email (solo la ficha buena conserva el email).
UPDATE athletes a
SET archived_at = now(),
    status = 'inactive',
    notes = COALESCE(a.notes, '') ||
      CASE WHEN a.notes IS NOT NULL AND a.notes <> '' THEN E'\n' ELSE '' END ||
      'Ficha duplicada consolidada por migración 035. Email original: ' ||
      COALESCE(a.email, '(sin email)'),
    email = NULL
FROM _athlete_dupes d
WHERE a.id = d.loser_id;

-- Índice único parcial: impide nuevas fichas con el mismo email (case-insensitive) por club.
CREATE UNIQUE INDEX IF NOT EXISTS idx_athletes_unique_email
  ON athletes (club_id, lower(email))
  WHERE email IS NOT NULL AND archived_at IS NULL;

COMMIT;
