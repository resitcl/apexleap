-- 037: Historial de comunicaciones enviadas (módulo Comunicaciones, fase 2).
-- Registra un resumen por envío: masivo, individual o solicitud de pago, con conteos.
-- Idempotente y no destructiva.

CREATE TABLE IF NOT EXISTS communication_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  kind          text NOT NULL,                 -- 'broadcast' | 'individual' | 'payment_request'
  channel       text NOT NULL DEFAULT 'email',
  subject       text,
  audience_type text,                          -- 'all' | 'filter' | 'selection' | 'athlete'
  recipient_count int NOT NULL DEFAULT 0,
  sent_count      int NOT NULL DEFAULT 0,
  failed_count    int NOT NULL DEFAULT 0,
  sent_by       text,                          -- id de usuario (Clerk) que envió, si aplica
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_logs_club_created
  ON communication_logs (club_id, created_at DESC);

-- RLS: el acceso es solo vía service-role (que la bypassa) con filtro app-level de club_id;
-- habilitarla sin políticas bloquea anon/authenticated por defecto (seguro).
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
