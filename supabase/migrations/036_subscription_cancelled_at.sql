-- 036: Registra el momento de cancelación de la suscripción para métricas correctas de
-- churn y duración (hoy dependen de updated_at, que se re-estampa en cualquier edición).
-- Idempotente y no destructivo.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Backfill: aproximar con updated_at para las suscripciones ya canceladas.
UPDATE subscriptions
SET cancelled_at = updated_at
WHERE status = 'cancelled' AND cancelled_at IS NULL;

-- Trigger: setear cancelled_at al pasar a 'cancelled' y limpiarlo al reactivar. Así no hay
-- acoplamiento con el código de la app (cancelPriorSubscriptions corre en cada pago); el
-- timestamp de cancelación queda garantizado a nivel de BD.
CREATE OR REPLACE FUNCTION set_subscription_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancelled_at := now();
  ELSIF NEW.status <> 'cancelled' THEN
    NEW.cancelled_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscription_cancelled_at ON subscriptions;
CREATE TRIGGER trg_subscription_cancelled_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_subscription_cancelled_at();
