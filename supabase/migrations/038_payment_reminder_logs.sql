-- 038: Registro POR ALUMNO de los cobros enviados.
--
-- `communication_logs` (037) guarda solo el resumen de cada envío (cuántos, cuántos fallaron),
-- así que no permite responder "¿a quién le mandé cobro y cuándo?". Esta tabla registra una fila
-- por destinatario, tanto de los envíos manuales del admin como de los recordatorios del cron.
--
-- Idempotente y no destructiva.

CREATE TABLE IF NOT EXISTS payment_reminder_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     uuid NOT NULL REFERENCES clubs(id)    ON DELETE CASCADE,
  athlete_id  uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  -- Cuota concreta que motivó el cobro, si la había. SET NULL para no perder el historial
  -- de envíos si la cuota se elimina.
  payment_id  uuid REFERENCES payments(id) ON DELETE SET NULL,
  channel     text NOT NULL DEFAULT 'email',
  source      text NOT NULL DEFAULT 'manual',  -- 'manual' (admin) | 'cron' (recordatorio automático)
  status      text NOT NULL DEFAULT 'sent',    -- 'sent' | 'failed'
  amount      numeric,
  due_date    date,
  error       text,
  sent_by     text,                            -- id de usuario (Clerk) que envió, si fue manual
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Consulta principal: último cobro enviado a cada alumno del club.
CREATE INDEX IF NOT EXISTS idx_payment_reminders_club_athlete
  ON payment_reminder_logs (club_id, athlete_id, created_at DESC);

-- Historial cronológico del club.
CREATE INDEX IF NOT EXISTS idx_payment_reminders_club_created
  ON payment_reminder_logs (club_id, created_at DESC);

-- RLS: el acceso es solo vía service-role (que la bypassa) con filtro app-level de club_id;
-- habilitarla sin políticas bloquea anon/authenticated por defecto (seguro).
ALTER TABLE payment_reminder_logs ENABLE ROW LEVEL SECURITY;
