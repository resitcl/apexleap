-- ============================================================
-- ApexLeap - Migration 019: Add 'admin_athlete' role
-- Un administrador puede también ser atleta/jugador.
-- Un entrenador es sólo entrenador.
-- ============================================================

-- Drop old constraint and add new one that includes admin_athlete
ALTER TABLE user_clubs
  DROP CONSTRAINT IF EXISTS user_clubs_role_check;

ALTER TABLE user_clubs
  ADD CONSTRAINT user_clubs_role_check
  CHECK (role IN ('admin', 'admin_athlete', 'coach', 'athlete'));

-- Drop old constraint on club_invitations and add updated one
ALTER TABLE club_invitations
  DROP CONSTRAINT IF EXISTS club_invitations_role_check;

ALTER TABLE club_invitations
  ADD CONSTRAINT club_invitations_role_check
  CHECK (role IN ('admin', 'admin_athlete', 'coach', 'athlete'));
