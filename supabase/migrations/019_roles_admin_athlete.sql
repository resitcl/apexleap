-- ============================================================
-- ApexLeap - Migration 019: Add 'admin_athlete' role
-- Un administrador puede también ser atleta/jugador.
-- Un entrenador es sólo entrenador.
-- ============================================================

-- user_role is a ENUM type — add the new value directly
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin_athlete';

-- club_invitations.role is TEXT with a CHECK constraint — update it
ALTER TABLE club_invitations
  DROP CONSTRAINT IF EXISTS club_invitations_role_check;

ALTER TABLE club_invitations
  ADD CONSTRAINT club_invitations_role_check
  CHECK (role IN ('admin', 'admin_athlete', 'coach', 'athlete'));
