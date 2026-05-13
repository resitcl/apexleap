-- Titular (true) vs suplente/reserva (false) en nómina matchday
ALTER TABLE roster_athletes
  ADD COLUMN IF NOT EXISTS is_starter BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN roster_athletes.is_starter IS 'true = titular, false = suplente/reserva';
